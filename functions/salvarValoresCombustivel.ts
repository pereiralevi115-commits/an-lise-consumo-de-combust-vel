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

    // Busca todos os registros
    const records = await base44.asServiceRole.entities.FuelRecord.list('-date', 100000);

    // Filtra no servidor
    const filtered = records.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (anoFilter && d.getFullYear() !== parseInt(anoFilter)) return false;
      if (mesFilter !== '' && mesFilter !== undefined && mesFilter !== null && d.getMonth() !== parseInt(mesFilter)) return false;
      if (unitFilter && r.unit !== unitFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      return Response.json({ updated: 0 });
    }

    // Atualiza em paralelo com lotes de 15
    const batchSize = 15;
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
        await new Promise(res => setTimeout(res, 500));
      }
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});