import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cubicMetros = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);

    const validMonths = ['2026-01', '2026-02', '2026-03'];
    
    const outOfRange = cubicMetros.filter(cm => !validMonths.includes(cm.mes));
    const inRange = cubicMetros.filter(cm => validMonths.includes(cm.mes));

    // Group out of range by month
    const byMonth = {};
    outOfRange.forEach(cm => {
      if (!byMonth[cm.mes]) byMonth[cm.mes] = [];
      byMonth[cm.mes].push(cm);
    });

    return Response.json({
      totalRecords: cubicMetros.length,
      inRange: inRange.length,
      outOfRange: outOfRange.length,
      monthsFound: Object.keys(byMonth).sort(),
      breakdown: Object.entries(byMonth).map(([month, records]) => ({
        month,
        count: records.length,
        samples: records.slice(0, 5)
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});