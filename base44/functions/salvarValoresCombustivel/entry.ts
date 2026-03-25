import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateWithRetry(base44, id, data, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await base44.asServiceRole.entities.FuelRecord.update(id, data);
      return;
    } catch (err) {
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('Rate limit');
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 1000 * (attempt + 1); // 1s, 2s, 3s...
        console.log(`Rate limit - aguardando ${waitMs}ms (tentativa ${attempt + 1})`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { preco, anoFilter, mesFilter, unitFilter } = await req.json();

    if (!preco || preco <= 0) {
      return Response.json({ error: 'Preço inválido' }, { status: 400 });
    }

    // Filtra direto no banco por unidade (reduz drasticamente os registros)
    const queryFilter = {};
    if (unitFilter) queryFilter.unit = unitFilter;

    const records = await base44.asServiceRole.entities.FuelRecord.filter(queryFilter, '-date', 100000);

    // Filtra por ano e mês no servidor
    const filtered = records.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (anoFilter && d.getUTCFullYear() !== parseInt(anoFilter)) return false;
      if (mesFilter !== '' && mesFilter !== undefined && mesFilter !== null && d.getUTCMonth() !== parseInt(mesFilter)) return false;
      return true;
    });

    if (filtered.length === 0) {
      return Response.json({ updated: 0 });
    }

    // Atualiza sequencialmente com retry automático em caso de rate limit
    let updated = 0;
    for (const r of filtered) {
      await updateWithRetry(base44, r.id, { cost: (r.liters || 0) * preco });
      updated++;
      await sleep(100);
    }
    console.log(`Atualização concluída: ${updated} registros`);

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});