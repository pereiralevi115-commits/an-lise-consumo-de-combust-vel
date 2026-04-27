import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const cubicMetros = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);
    const placaEquipamentos = await base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000);

    const placaMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

    // Filter março 2026
    const marco2026 = cubicMetros.filter(cm => cm.mes === '2026-03');

    // Group by equipment type - summary only
    const byEquipment = {};
    let grandTotal = 0;
    marco2026.forEach(cm => {
      const placa = String(cm.placa).toUpperCase();
      const tipo = placaMap[placa] || cm.equipamento || 'SEM TIPO';
      if (!byEquipment[tipo]) byEquipment[tipo] = { total: 0, count: 0 };
      byEquipment[tipo].total += Number(cm.metros_cubicos);
      byEquipment[tipo].count += 1;
      grandTotal += Number(cm.metros_cubicos);
    });

    return Response.json({
      mes: '2026-03',
      totalRegistros: marco2026.length,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      porEquipamento: Object.entries(byEquipment)
        .map(([tipo, data]) => ({ tipo, total: parseFloat(data.total.toFixed(2)), count: data.count }))
        .sort((a, b) => b.total - a.total)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});