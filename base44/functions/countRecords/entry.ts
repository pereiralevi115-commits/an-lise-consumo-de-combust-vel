import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all records in pages of 10000
    let allFuel = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FuelRecord.list('-date', 10000, skip);
      if (!batch || batch.length === 0) break;
      allFuel = allFuel.concat(batch);
      if (batch.length < 10000) break;
      skip += 10000;
    }

    let allM3 = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000, skip);
      if (!batch || batch.length === 0) break;
      allM3 = allM3.concat(batch);
      if (batch.length < 10000) break;
      skip += 10000;
    }

    // Group FuelRecords by plate+month
    const fuelGroups = new Set();
    allFuel.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const dt = new Date(r.date);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      fuelGroups.add(`${monthKey}-${String(r.vehicle_plate).toUpperCase()}`);
    });

    // Group CubicMetros by plate+month
    const m3Groups = new Set();
    allM3.forEach(cm => {
      if (!cm.mes || !cm.placa) return;
      m3Groups.add(`${cm.mes}-${String(cm.placa).toUpperCase()}`);
    });

    // M3-only rows (no fuel record for that plate+month)
    const m3OnlyKeys = [...m3Groups].filter(k => !fuelGroups.has(k));

    // Total unique plate+month combinations shown in the table
    const totalRows = fuelGroups.size + m3OnlyKeys.length;

    // Breakdown by month
    const byMonth = {};
    [...fuelGroups].forEach(k => {
      const month = k.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    m3OnlyKeys.forEach(k => {
      const month = k.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    return Response.json({
      totalFuelRecords: allFuel.length,
      totalCubicMetrosRecords: allM3.length,
      uniquePlacaMesComFuel: fuelGroups.size,
      uniquePlacaMesSomenteM3: m3OnlyKeys.length,
      totalRowsExibidosNaTabela: totalRows,
      byMonth: Object.entries(byMonth).sort()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});