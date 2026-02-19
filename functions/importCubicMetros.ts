import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const { fileUrl } = await req.json();
    if (!fileUrl) return Response.json({ error: 'fileUrl é obrigatório' }, { status: 400 });

    const fileRes = await fetch(fileUrl);
    const buffer = await fileRes.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    const records = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // pula cabeçalho

      const mesRaw = row.getCell(1).value;
      const placa = row.getCell(2).value;
      const m3 = row.getCell(3).value;

      if (!mesRaw || !placa || m3 == null) return;

      // Normaliza o mês para string "YYYY-MM"
      let mesStr = '';
      if (mesRaw instanceof Date) {
        const y = mesRaw.getFullYear();
        const m = String(mesRaw.getMonth() + 1).padStart(2, '0');
        mesStr = `${y}-${m}`;
      } else {
        mesStr = String(mesRaw).trim();
      }

      records.push({
        mes: mesStr,
        placa: String(placa).trim().toUpperCase(),
        metros_cubicos: parseFloat(String(m3).replace(',', '.'))
      });
    });

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro encontrado no arquivo' }, { status: 400 });
    }

    await base44.asServiceRole.entities.CubicMetros.bulkCreate(records);

    return Response.json({ success: true, count: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});