import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await base44.asServiceRole.entities.FuelRecord.list('-date', 100000);

    const KM_MAX_DIFF = 1100;

    // Agrupar por placa
    const plateGroups = {};
    records.forEach(r => {
      const plate = r.vehicle_plate;
      if (!plate) return;
      if (!plateGroups[plate]) plateGroups[plate] = [];
      plateGroups[plate].push(r);
    });

    const inconsistencies = [];

    Object.entries(plateGroups).forEach(([plate, group]) => {
      const sorted = [...group].sort((a, b) => {
        const da = (a.date || '') + ' ' + (a.time || '');
        const db = (b.date || '') + ' ' + (b.time || '');
        return da < db ? -1 : da > db ? 1 : 0;
      });

      const kmsWithValue = sorted.filter(r => Number(r.km_driven) > 0).map(r => Number(r.km_driven));
      const threshold = KM_MAX_DIFF;

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        const km = Number(r.km_driven);

        // Regra 1: KM zerado ou vazio quando outros registros da placa têm KM
        if ((km == null || km === 0 || isNaN(km)) && kmsWithValue.length > 0) {
          inconsistencies.push({
            id: r.id,
            plate: plate,
            date: r.date,
            time: r.time,
            km: r.km_driven,
            motivo: 'KM zerado ou vazio',
            detalhe: `Placa tem ${kmsWithValue.length} registros com KM preenchido`
          });
          continue;
        }

        if (km > 0 && i > 0) {
          let prev = null;
          for (let j = i - 1; j >= 0; j--) {
            if (Number(sorted[j].km_driven) > 0) { prev = sorted[j]; break; }
          }
          if (prev) {
            const diff = km - Number(prev.km_driven);

            // Regra 2: Hodômetro voltou
            if (diff < 0) {
              inconsistencies.push({
                id: r.id,
                plate: plate,
                date: r.date,
                time: r.time,
                km: r.km_driven,
                km_anterior: prev.km_driven,
                motivo: 'Hodômetro voltou',
                detalhe: `KM atual: ${km.toLocaleString('pt-BR')} | KM anterior: ${Number(prev.km_driven).toLocaleString('pt-BR')} | Diferença: ${diff.toLocaleString('pt-BR')}`
              });
            }

            // Regra 3: Diferença maior que 1100km (ou 3x a média)
            if (diff > threshold) {
              inconsistencies.push({
                id: r.id,
                plate: plate,
                date: r.date,
                time: r.time,
                km: r.km_driven,
                km_anterior: prev.km_driven,
                motivo: `Diferença muito grande (>${KM_MAX_DIFF} km)`,
                detalhe: `KM atual: ${km.toLocaleString('pt-BR')} | KM anterior: ${Number(prev.km_driven).toLocaleString('pt-BR')} | Diferença: ${Math.round(diff).toLocaleString('pt-BR')} km`
              });
            }
          }
        }
      }
    });

    // Ordenar por placa e data
    inconsistencies.sort((a, b) => {
      if (a.plate !== b.plate) return a.plate.localeCompare(b.plate);
      return (a.date || '') < (b.date || '') ? -1 : 1;
    });

    return Response.json({
      total_registros: records.length,
      total_inconsistencias: inconsistencies.length,
      inconsistencias: inconsistencies
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});