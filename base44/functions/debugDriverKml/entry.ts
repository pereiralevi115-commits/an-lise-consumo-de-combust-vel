import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { driverCode } = await req.json();
    if (!driverCode) return Response.json({ error: 'driverCode required' }, { status: 400 });

    const [records, motoristas, pontos, placaEquipamentos, exclusoes] = await Promise.all([
      base44.asServiceRole.entities.FuelRecord.list('-date', 10000),
      base44.asServiceRole.entities.Motorista.list(),
      base44.asServiceRole.entities.Ponto.list(),
      base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000),
      base44.asServiceRole.entities.ExclusaoMedia.list()
    ]);

    const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
    const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
    const placaMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));
    const exclusoesSet = new Set(exclusoes.map(e => `${String(e.placa).toUpperCase()}-${e.mes}`));

    // Sort by plate+datetime
    const byPlate = {};
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const plate = String(r.vehicle_plate).toUpperCase();
      if (!byPlate[plate]) byPlate[plate] = [];
      byPlate[plate].push(r);
    });
    Object.values(byPlate).forEach(arr => {
      arr.sort((a, b) => {
        const da = (a.date || '') + ' ' + (a.time || '');
        const db = (b.date || '') + ' ' + (b.time || '');
        return da < db ? -1 : da > db ? 1 : 0;
      });
    });

    // Compute kmPercorrido per record (delta)
    const kmPercorridoMap = {};
    Object.values(byPlate).forEach(arr => {
      let lastKm = null;
      arr.forEach(r => {
        const km = Number(r.km_driven);
        if (km > 0) {
          if (lastKm !== null && km > lastKm) {
            kmPercorridoMap[r.id] = km - lastKm;
          }
          lastKm = km;
        }
      });
    });

    // Group by plate+month
    const groupedData = {};
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const dt = new Date(r.date);
      const month = dt.getMonth();
      const year = dt.getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const plateKey = String(r.vehicle_plate).toUpperCase();
      const groupKey = `${monthKey}-${plateKey}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = { monthKey, plate: r.vehicle_plate, totalLiters: 0, kmDelta: 0, driverCounts: {} };
      }
      groupedData[groupKey].totalLiters += r.liters || 0;
      if (r.driver) {
        groupedData[groupKey].driverCounts[r.driver] = (groupedData[groupKey].driverCounts[r.driver] || 0) + 1;
      }
      const excluded = exclusoesSet.has(`${plateKey}-${monthKey}`);
      if (!excluded) {
        groupedData[groupKey].kmDelta += kmPercorridoMap[r.id] || 0;
      }
    });

    // Find groups where driverCode is the most frequent driver
    const driverGroups = Object.values(groupedData).filter(g => {
      const mainDriver = Object.entries(g.driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      return mainDriver === String(driverCode);
    });

    // Also find ALL groups where driverCode appears at all (not just most frequent)
    const allGroups = Object.values(groupedData).filter(g => g.driverCounts[String(driverCode)] > 0);

    // Aggregate for the driver
    let totalKm = 0, totalLiters = 0;
    driverGroups.forEach(g => { totalKm += g.kmDelta; totalLiters += g.totalLiters; });

    const rows = driverGroups.map(g => ({
      monthKey: g.monthKey,
      plate: g.plate,
      equipment: placaMap[String(g.plate).toUpperCase()] || '-',
      totalLiters: g.totalLiters,
      kmDelta: g.kmDelta,
      kmPerLiter: g.totalLiters > 0 ? (g.kmDelta / g.totalLiters).toFixed(4) : 0,
      isExcluded: exclusoesSet.has(`${String(g.plate).toUpperCase()}-${g.monthKey}`),
      driverCounts: g.driverCounts
    }));

    // Also show groups where driver appears but is NOT the main driver
    const otherGroups = allGroups
      .filter(g => {
        const mainDriver = Object.entries(g.driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        return mainDriver !== String(driverCode);
      })
      .map(g => {
        const mainDriver = Object.entries(g.driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        return {
          monthKey: g.monthKey,
          plate: g.plate,
          equipment: placaMap[String(g.plate).toUpperCase()] || '-',
          totalLiters: g.totalLiters,
          kmDelta: g.kmDelta,
          mainDriverCode: mainDriver,
          mainDriverName: motoristasMap[mainDriver] || mainDriver,
          driverOccurrences: g.driverCounts[String(driverCode)]
        };
      });

    return Response.json({
      driverCode,
      driverName: motoristasMap[String(driverCode)] || driverCode,
      totalKm,
      totalLiters,
      kmPerLiter: totalLiters > 0 ? (totalKm / totalLiters).toFixed(4) : 0,
      includedGroups: rows,
      excludedGroupsWhereDriverAppears: otherGroups
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});