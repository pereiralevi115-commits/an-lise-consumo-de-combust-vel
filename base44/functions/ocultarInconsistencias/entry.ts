import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids array required' }, { status: 400 });
    }

    // Lotes de 3 simultâneos com 300ms entre lotes
    const BATCH = 3;
    let updated = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const lote = ids.slice(i, i + BATCH);
      await Promise.all(lote.map(id => base44.asServiceRole.entities.FuelRecord.update(id, { oculto: true })));
      updated += lote.length;
      if (i + BATCH < ids.length) await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});