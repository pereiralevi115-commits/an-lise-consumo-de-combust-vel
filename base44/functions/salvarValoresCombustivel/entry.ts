import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { preco, anoFilter, mesFilter, unitFilter, offset = 0, batchSize = 50 } = await req.json();

    if (!preco || preco <= 0) {
      return Response.json({ error: 'Preço inválido' }, { status: 400 });
    }

    const queryFilter = {};
    if (unitFilter) queryFilter.unit = unitFilter;

    const records = await base44.asServiceRole.entities.FuelRecord.filter(queryFilter, '-date', 100000);

    const filtered = records.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (anoFilter && d.getUTCFullYear() !== parseInt(anoFilter)) return false;
      if (mesFilter !== '' && mesFilter !== undefined && mesFilter !== null && d.getUTCMonth() !== parseInt(mesFilter)) return false;
      return true;
    });

    const total = filtered.length;
    const batch = filtered.slice(offset, offset + batchSize);

    let updated = 0;
    for (const r of batch) {
      await base44.asServiceRole.entities.FuelRecord.update(r.id, { cost: (r.liters || 0) * preco });
      updated++;
      await sleep(300);
    }

    const nextOffset = offset + batch.length;
    const done = nextOffset >= total;
    console.log(`Lote: ${offset}-${nextOffset} de ${total}. Done: ${done}`);

    return Response.json({ updated, total, nextOffset, done });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});