import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [allFuel, allM3] = await Promise.all([
      base44.asServiceRole.entities.FuelRecord.list('-date', 10000),
      base44.asServiceRole.entities.CubicMetros.list('-mes', 10000)
    ]);

    // Group FuelRecords by plate+month (lowercase for comparison)
    const fuelGroupsNormalized = new Set();
    const fuelGroupsRaw = new Set();
    allFuel.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const dt = new Date(r.date);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      fuelGroupsNormalized.add(`${monthKey}-${String(r.vehicle_plate).toUpperCase()}`);
      fuelGroupsRaw.add(`${monthKey}-${r.vehicle_plate}`);
    });

    // Find M3 rows that WOULD match a fuel group (collision = appears in both)
    const m3Collisions = [];
    const m3Only = [];
    allM3.forEach(cm => {
      if (!cm.mes || !cm.placa) return;
      const keyNorm = `${cm.mes}-${String(cm.placa).toUpperCase()}`;
      const keyRaw = `${cm.mes}-${cm.placa}`;
      if (fuelGroupsNormalized.has(keyNorm)) {
        // This M3 record has a fuel record - should NOT generate extra row
        m3Collisions.push({ mes: cm.mes, placa: cm.placa, metros_cubicos: cm.metros_cubicos });
      } else {
        m3Only.push({ mes: cm.mes, placa: cm.placa, metros_cubicos: cm.metros_cubicos });
      }
    });

    // Check for duplicate fuel groups (same plate+month appearing twice)
    const fuelGroupCount = {};
    allFuel.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const dt = new Date(r.date);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const key = `${monthKey}-${String(r.vehicle_plate).toUpperCase()}`;
      fuelGroupCount[key] = (fuelGroupCount[key] || 0) + 1;
    });

    // The page code uses r.vehicle_plate directly (not uppercased) as groupKey plate
    // Let's check if same plate exists with different cases
    const plateCaseVariants = {};
    allFuel.forEach(r => {
      if (!r.vehicle_plate) return;
      const norm = String(r.vehicle_plate).toUpperCase();
      if (!plateCaseVariants[norm]) plateCaseVariants[norm] = new Set();
      plateCaseVariants[norm].add(r.vehicle_plate);
    });
    const caseMismatches = Object.entries(plateCaseVariants)
      .filter(([_, variants]) => variants.size > 1)
      .map(([norm, variants]) => ({ normalized: norm, variants: [...variants] }));

    // Also check for same plate+month with different original plate case
    const groupKeyVariants = {};
    allFuel.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const dt = new Date(r.date);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const keyNorm = `${monthKey}-${String(r.vehicle_plate).toUpperCase()}`;
      const keyRaw = `${monthKey}-${r.vehicle_plate}`;
      if (!groupKeyVariants[keyNorm]) groupKeyVariants[keyNorm] = new Set();
      groupKeyVariants[keyNorm].add(keyRaw);
    });
    const groupKeyMismatches = Object.entries(groupKeyVariants)
      .filter(([_, variants]) => variants.size > 1)
      .map(([norm, variants]) => ({ normalized: norm, variants: [...variants] }));

    return Response.json({
      totalFuelRecords: allFuel.length,
      totalM3Records: allM3.length,
      fuelGroups: fuelGroupsNormalized.size,
      m3Only: m3Only.length,
      m3WithFuelRecord: m3Collisions.length,
      expectedTableRows: fuelGroupsNormalized.size + m3Only.length,
      plateCaseMismatches: caseMismatches,
      groupKeyMismatches: groupKeyMismatches.slice(0, 20),
      m3OnlyList: m3Only,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});