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

    // Atualiza todos em paralelo de uma vez
    await Promise.all(
      filtered.map(r =>
        base44.asServiceRole.entities.FuelRecord.update(r.id, { cost: (r.liters || 0) * preco })
      )
    );
    const updated = filtered.length;

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});