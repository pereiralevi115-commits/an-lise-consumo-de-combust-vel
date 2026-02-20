import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExcelJS from 'npm:exceljs@4.4.0';

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

    console.log('Baixando arquivo Excel externo:', fileUrl);

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const records = [];

    // Converter data no formato DD/MM/YYYY ou Date para YYYY-MM-DD
    const parseDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        const day = String(value.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      if (typeof value === 'number') {
        const d = new Date((value - 25569) * 86400 * 1000);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      if (typeof value === 'string') {
        // formato DD/MM/YYYY
        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) return `${match[3]}-${match[2]}-${match[1]}`;
        // tentar ISO
        const d = new Date(value);
        if (!isNaN(d)) {
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      return null;
    };

    // Limpar valor monetário: "R$ 1.094,52" -> 1094.52
    const parseCost = (value) => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      const str = String(value).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(str) || 0;
    };

    // Colunas: DATA(1) HORA(2) PLACA(3) USINA(4) EQUIPAMENTOS(5) FRENTISTA(6) MOTORISTA(7) COMBUSTIVEL(8) LITROS(9) Hodômetro(10) Valor total(11)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // pular cabeçalho

      const cells = row.values;
      if (!cells[1] || !cells[3]) return;

      try {
        const date = parseDate(cells[1]);
        const plate = cells[3] ? String(cells[3]).trim().toUpperCase() : null;
        if (!date || !plate) return;

        const liters = cells[9] ? parseFloat(String(cells[9]).replace(',', '.')) : 0;
        const km = cells[10] ? parseFloat(String(cells[10]).replace(/\./g, '').replace(',', '.')) : 0;
        const cost = parseCost(cells[11]);

        const record = {
          date,
          time: cells[2] ? String(cells[2]).substring(0, 8) : '06:00',
          vehicle_plate: plate,
          unit: cells[4] ? String(cells[4]).trim() : null,
          attendant: cells[6] ? String(cells[6]).trim() : null,
          driver: cells[7] ? String(cells[7]).trim() : null,
          fuel_type: cells[8] ? String(cells[8]).trim() : null,
          liters,
          km_driven: km,
          cost,
          korth_id: null
        };

        records.push(record);
      } catch (error) {
        console.error(`Erro na linha ${rowNumber}:`, error.message);
      }
    });

    console.log(`${records.length} registros extraídos do Excel externo`);

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro válido encontrado' }, { status: 400 });
    }

    // Verificar duplicatas por data+placa+litros (apenas externos sem korth_id)
    const existingRecords = await base44.asServiceRole.entities.FuelRecord.list('-date', 50000);
    const existingKeys = new Set(
      existingRecords
        .filter(r => !r.korth_id && r.date && r.vehicle_plate)
        .map(r => `${r.date}|${String(r.vehicle_plate).toUpperCase()}|${r.liters}`)
    );

    const newRecords = records.filter(r => {
      const key = `${r.date}|${r.vehicle_plate}|${r.liters}`;
      return !existingKeys.has(key);
    });

    console.log(`${existingRecords.length} existentes, ${records.length - newRecords.length} duplicatas ignoradas, ${newRecords.length} novos`);

    if (newRecords.length === 0) {
      return Response.json({ success: true, count: 0, duplicates: records.length, message: 'Todos os registros já existem no banco' });
    }

    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(newRecords);
    console.log(`${saved.length} registros salvos`);

    return Response.json({
      success: true,
      count: saved.length,
      duplicates: records.length - newRecords.length
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});