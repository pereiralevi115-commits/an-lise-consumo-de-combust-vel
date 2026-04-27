import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [cubicMetros, placaEquipamentos, fuelRecords] = await Promise.all([
      base44.asServiceRole.entities.CubicMetros.list('-mes', 10000),
      base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000),
      base44.asServiceRole.entities.FuelRecord.list('-date', 10000)
    ]);

    const placaMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

    // Placas que aparecem nos FuelRecords de março (como o dashboard processa)
    const fuelRecordPlacasMarco = new Set();
    fuelRecords.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const month = new Date(r.date).getMonth(); // 0-indexed
      const year = new Date(r.date).getFullYear();
      if (year === 2026 && month === 2) { // março = 2
        fuelRecordPlacasMarco.add(String(r.vehicle_plate).toUpperCase());
      }
    });

    // Placas no CubicMetros de março
    const marco2026 = cubicMetros.filter(cm => cm.mes === '2026-03');
    
    // Verificar quais placas do M³ NÃO têm fuel record em março (não aparecem no dashboard)
    const placasSemFuelRecord = [];
    const placasSemEquipamento = [];
    let totalPerdido = 0;

    marco2026.forEach(cm => {
      const placa = String(cm.placa).toUpperCase();
      const tipo = placaMap[placa];
      
      if (!tipo) {
        placasSemEquipamento.push({ placa, metros_cubicos: cm.metros_cubicos });
        totalPerdido += Number(cm.metros_cubicos);
      }
      
      if (!fuelRecordPlacasMarco.has(placa)) {
        placasSemFuelRecord.push({ placa, metros_cubicos: cm.metros_cubicos, tipo: tipo || 'SEM TIPO' });
      }
    });

    return Response.json({
      totalRegistrosMarco: marco2026.length,
      placasSemEquipamentoCadastrado: placasSemEquipamento,
      totalM3SemEquipamento: parseFloat(totalPerdido.toFixed(2)),
      placasSemFuelRecordEmMarco: placasSemFuelRecord,
      totalPlacasFuelRecordMarco: fuelRecordPlacasMarco.size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});