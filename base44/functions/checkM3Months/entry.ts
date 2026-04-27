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

    // Group by equipment type
    const byEquipment = {};
    marco2026.forEach(cm => {
      const placa = String(cm.placa).toUpperCase();
      const tipo = placaMap[placa] || cm.equipamento || 'SEM TIPO';
      if (!byEquipment[tipo]) byEquipment[tipo] = { total: 0, records: [] };
      byEquipment[tipo].total += Number(cm.metros_cubicos);
      byEquipment[tipo].records.push({ placa, metros_cubicos: Number(cm.metros_cubicos) });
    });

    const betoneiras = Object.entries(byEquipment)
      .filter(([tipo]) => tipo.toUpperCase().includes('BETONEIRA'))
      .map(([tipo, data]) => ({ tipo, total: data.total, count: data.records.length, records: data.records }));

    const totalBetoneira = betoneiras.reduce((sum, b) => sum + b.total, 0);

    return Response.json({
      mes: '2026-03',
      totalRegistrosMarco: marco2026.length,
      totalBetoneira,
      betoneiras,
      todosEquipamentos: Object.entries(byEquipment).map(([tipo, data]) => ({
        tipo,
        total: data.total,
        count: data.records.length
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});