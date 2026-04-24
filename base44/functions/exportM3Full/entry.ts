import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cubicMetros = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);

    // Group by month and calculate total
    const byMonth = {};
    let grandTotal = 0;

    cubicMetros.forEach(cm => {
      if (!byMonth[cm.mes]) byMonth[cm.mes] = { records: [], total: 0 };
      const value = Number(cm.metros_cubicos);
      byMonth[cm.mes].records.push({
        placa: cm.placa,
        metros_cubicos: value
      });
      byMonth[cm.mes].total += value;
      grandTotal += value;
    });

    return Response.json({
      totalRecords: cubicMetros.length,
      grandTotal: grandTotal.toFixed(2),
      byMonth: Object.entries(byMonth).map(([mes, data]) => ({
        mes,
        count: data.records.length,
        total: data.total.toFixed(2),
        allRecords: data.records
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});