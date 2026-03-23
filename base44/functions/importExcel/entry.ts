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

    console.log('Baixando arquivo Excel:', fileUrl);

    // Download do arquivo
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Processar Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const records = [];

    // Converter data Excel para formato YYYY-MM-DD
    const excelDateToJSDate = (value) => {
      let date;
      
      // Se for número serial do Excel
      if (typeof value === 'number') {
        date = new Date((value - 25569) * 86400 * 1000);
      } 
      // Se o ExcelJS já retornou um objeto Date
      else if (value instanceof Date) {
        date = value;
      }
      // Se for string, tentar parsear
      else if (typeof value === 'string') {
        date = new Date(value);
      }
      
      // Extrair data usando UTC para evitar problemas de timezone
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Processar linhas (pular cabeçalho)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const cells = row.values;
      
      // Verificar se tem dados
      if (!cells[1] || !cells[3]) return;

      try {
        const record = {
           date: excelDateToJSDate(cells[1]),
           time: cells[2] ? String(cells[2]).substring(0, 8) : null,
           vehicle_plate: cells[3] ? String(cells[3]) : null,
           vehicle_type: cells[4] ? String(cells[4]) : null,
           unit: cells[5] ? String(cells[5]) : null,
           driver: cells[6] ? String(cells[6]) : null,
           fuel_type: cells[7] ? String(cells[7]) : null,
           liters: cells[8] ? parseFloat(cells[8]) : 0,
           km_driven: cells[9] ? parseFloat(cells[9]) : 0,
           cost: cells[10] ? parseFloat(cells[10]) : 0,
           cubic_meters: cells[11] ? parseFloat(cells[11]) : null
         };

        if (record.vehicle_plate && record.date) {
          records.push(record);
        }
      } catch (error) {
        console.error(`Erro na linha ${rowNumber}:`, error.message);
      }
    });

    console.log(`${records.length} registros extraídos do Excel`);

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro válido encontrado' }, { status: 400 });
    }

    // Inserir em lote
    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(records);
    console.log(`${saved.length} registros salvos`);

    return Response.json({ 
      success: true,
      count: saved.length
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});