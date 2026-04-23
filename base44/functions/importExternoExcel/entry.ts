import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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

    // raw: true para manter números como vieram, cellDates: true para datas
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    console.log(`Total de linhas na planilha: ${rows.length}`);
    if (rows.length > 0) console.log('Cabeçalho:', JSON.stringify(rows[0]));
    if (rows.length > 1) console.log('Linha 1:', JSON.stringify(rows[1]));
    if (rows.length > 2) console.log('Linha 2:', JSON.stringify(rows[2]));

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

    console.log('Mapeamento de colunas:', { colData, colHora, colPlaca, colUsina, colFrentista, colMotorista, colCombust, colLitros, colKm, colValor });

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
        // "2026-04-01 00:00:00" ou "2026-04-01T00:00:00"
        const matchISO = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (matchISO) return matchISO[1];
        // "01/04/2026"
        const matchBR = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (matchBR) return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
      }
      return null;
    };

    // Ler o número bruto da célula e aplicar o formato correto usando cellNF do sheet
    // Se o formato da célula tem vírgula decimal (ex: #.##0,0), o número raw está multiplicado por 10
    const getCellAddress = (rowIdx, colIdx) => {
      const col = XLSX.utils.encode_col(colIdx);
      const row = rowIdx + 1; // 1-indexed
      return `${col}${row}`;
    };

    const parseNumFromCell = (rawValue, rowIdx, colIdx) => {
      if (!rawValue && rawValue !== 0) return 0;
      if (typeof rawValue === 'number') return rawValue;
      if (typeof rawValue === 'string') {
        // "555.35" (ponto decimal inglês) ou "555,35" (vírgula decimal pt-BR)
        // Se tem ponto E vírgula: "1.234,56" -> remover ponto, trocar vírgula
        if (rawValue.includes(',') && rawValue.includes('.')) {
          return parseFloat(rawValue.replace(/\./g, '').replace(',', '.')) || 0;
        }
        // Se tem só vírgula: "555,35" -> trocar por ponto
        if (rawValue.includes(',')) {
          return parseFloat(rawValue.replace(',', '.')) || 0;
        }
        // Se tem só ponto ou nada especial: "555.35"
        return parseFloat(rawValue) || 0;
      }
      return 0;
    };

    // Valor monetário
    const parseCost = (rawValue) => {
      if (!rawValue && rawValue !== 0) return 0;
      // Se já é número, usar direto (ex: 3826.34)
      if (typeof rawValue === 'number') return rawValue;
      // Se é string, limpar R$, pontos de milhar e trocar vírgula decimal
      const str = String(rawValue).replace(/R\$\s*/g, '').trim();
      // "1.234,56" -> remover ponto de milhar, trocar vírgula
      if (str.includes(',')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return parseFloat(str) || 0;
    };

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
        const costRaw   = colValor >= 0 ? cells[colValor]  : cells[10];

        const liters = parseNumFromCell(litersRaw, rowNumber, colLitros >= 0 ? colLitros : 8);
        const km     = parseNumFromCell(kmRaw,     rowNumber, colKm >= 0    ? colKm     : 9);
        const cost   = parseCost(costRaw);

        console.log(`Linha ${rowNumber}: litrosRaw=${litersRaw} -> liters=${liters}, kmRaw=${kmRaw} -> km=${km}, costRaw=${costRaw} -> cost=${cost}`);

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