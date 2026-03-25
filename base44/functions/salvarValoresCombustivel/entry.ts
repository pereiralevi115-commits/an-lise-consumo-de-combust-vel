import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Atualiza em lotes de 5 com delay para evitar rate limit
    const batchSize = 5;
    let updated = 0;
    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize);
      await Promise.all(
        batch.map(r =>
          base44.asServiceRole.entities.FuelRecord.update(r.id, { cost: (r.liters || 0) * preco })
        )
      );
      updated += batch.length;
      if (i + batchSize < filtered.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});