import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids array required' }, { status: 400 });
    }

    let updated = 0;
    // updateMany atualiza até 500 registros por chamada — muito mais rápido que update individual
    const BATCH = 500;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await base44.asServiceRole.entities.FuelRecord.updateMany(
        { id: { $in: batch } },
        { $set: { oculto: true } }
      );
      updated += batch.length;
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});