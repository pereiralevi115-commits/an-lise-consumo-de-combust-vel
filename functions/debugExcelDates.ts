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

    console.log('Analisando arquivo Excel:', fileUrl);

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const samples = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (samples.length >= 5) return;

      const cells = row.values;
      
      samples.push({
        rowNumber,
        dateValue: cells[1],
        dateType: typeof cells[1],
        dateString: String(cells[1]),
        isDate: cells[1] instanceof Date,
        numericValue: typeof cells[1] === 'number' ? cells[1] : null,
        vehicle_plate: cells[3]
      });
    });

    return Response.json({
      samples,
      message: 'Primeiras 5 linhas para análise'
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});