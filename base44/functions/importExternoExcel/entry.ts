import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl } = body;

    if (!fileUrl) {
      return Response.json({ error: 'URL do arquivo não fornecida' }, { status: 400 });
    }

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // raw: true retorna números como números reais, evitando problemas de formatação brasileira
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    console.log(`Total de linhas na planilha: ${rows.length}`);
    if (rows.length > 1) console.log('Cabeçalho:', rows[0]);
    if (rows.length > 2) console.log('Primeira linha de dados:', rows[1]);

    // Converter data para YYYY-MM-DD
    const parseDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
      }
      if (typeof value === 'number') {
        const d = new Date((value - 25569) * 86400 * 1000);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      }
      if (typeof value === 'string') {
        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) return `${match[3]}-${match[2]}-${match[1]}`;
        const d = new Date(value);
        if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      }
      return null;
    };

    // Limpar valor monetário
    const parseCost = (value) => {
      if (!value && value !== 0) return 0;
      // Com raw:true, valores numéricos já vêm como número
      if (typeof value === 'number') return value;
      // Fallback para strings: "R$ 40.469,00" -> 40469.00
      const str = String(value).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(str) || 0;
    };

    // Detectar colunas pelo cabeçalho
    const header = rows[0].map(h => String(h || '').toLowerCase().trim());
    const col = (names) => {
      for (const name of names) {
        const idx = header.findIndex(h => h.includes(name.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colData      = col(['data']);
    const colHora      = col(['hora']);
    const colPlaca     = col(['placa']);
    const colUsina     = col(['usina', 'unidade']);
    const colFrentista = col(['frentista']);
    const colMotorista = col(['motorista']);
    const colCombust   = col(['combustivel', 'combust']);
    const colLitros    = col(['litros', 'litro', 'quantidade']);
    const colKm        = col(['hodometro', 'km', 'quilometro']);
    const colValor     = col(['valor total', 'valor', 'custo', 'total']);
    // Com raw:true, litros e km também vêm como números - usar diretamente
    const parseNum = (v) => {
      if (!v && v !== 0) return 0;
      if (typeof v === 'number') return v;
      return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
    };

    console.log('Mapeamento de colunas:', { colData, colHora, colPlaca, colUsina, colFrentista, colMotorista, colCombust, colLitros, colKm, colValor });

    const records = [];

    for (let rowNumber = 1; rowNumber < rows.length; rowNumber++) {
      const cells = rows[rowNumber];
      if (!cells || cells.length === 0) continue;

      try {
        const dateVal = colData >= 0 ? cells[colData] : cells[0];
        const date = parseDate(dateVal);
        const plateVal = colPlaca >= 0 ? cells[colPlaca] : cells[2];
        const plate = plateVal ? String(plateVal).trim().toUpperCase() : null;
        if (!date || !plate) continue;

        const litersRaw = colLitros >= 0 ? cells[colLitros] : cells[8];
        const kmRaw     = colKm >= 0    ? cells[colKm]     : cells[9];
        const costRaw   = colValor >= 0  ? cells[colValor]  : cells[10];

        const liters = parseNum(litersRaw);
        const km     = parseNum(kmRaw);
        const cost   = parseCost(costRaw);

        console.log(`Linha ${rowNumber}: costRaw="${costRaw}" -> cost=${cost}`);

        records.push({
          date,
          time: colHora >= 0 && cells[colHora] ? String(cells[colHora]).substring(0, 8) : '06:00',
          vehicle_plate: plate,
          unit: colUsina >= 0 && cells[colUsina] ? String(cells[colUsina]).trim() : null,
          attendant: colFrentista >= 0 && cells[colFrentista] ? String(cells[colFrentista]).trim() : null,
          driver: colMotorista >= 0 && cells[colMotorista] ? String(cells[colMotorista]).trim() : null,
          fuel_type: colCombust >= 0 && cells[colCombust] ? String(cells[colCombust]).trim() : null,
          liters,
          km_driven: km,
          cost,
          korth_id: null
        });
      } catch (error) {
        console.error(`Erro na linha ${rowNumber}:`, error.message);
      }
    }

    console.log(`${records.length} registros extraídos do Excel externo`);

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro válido encontrado' }, { status: 400 });
    }

    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(records);
    console.log(`${saved.length} registros salvos`);

    return Response.json({ success: true, count: saved.length, duplicates: 0 });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});