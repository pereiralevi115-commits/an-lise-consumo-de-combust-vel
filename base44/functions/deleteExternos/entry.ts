import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mes, ano } = await req.json();
    if (!mes || !ano) return Response.json({ error: 'mes e ano são obrigatórios' }, { status: 400 });

    // Fetch all records and filter client-side (service role, no rate limit issue)
    let allRecords = [];
    let skip = 0;
    const pageSize = 1000;
    while (true) {
      const page = await base44.asServiceRole.entities.FuelRecord.list('-date', pageSize, skip);
      allRecords = allRecords.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const toDelete = allRecords.filter(r => {
      if (r.korth_id) return false;
      if (!r.date) return false;
      const d = new Date(r.date);
      return d.getUTCFullYear() === Number(ano) && d.getUTCMonth() + 1 === Number(mes);
    });

    if (toDelete.length === 0) {
      return Response.json({ count: 0, message: 'Nenhum registro externo encontrado para este período.' });
    }

    // Delete one by one with delay to avoid rate limit
    let deleted = 0;
    for (const r of toDelete) {
      await base44.asServiceRole.entities.FuelRecord.delete(r.id);
      deleted++;
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    return Response.json({ count: toDelete.length, message: `${toDelete.length} registros excluídos com sucesso!` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});