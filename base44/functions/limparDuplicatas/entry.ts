import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Buscar TODOS os registros paginando (limite por chamada é 5000)
    let all = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.FuelRecord.list('-date', 5000, skip);
      all = all.concat(batch);
      hasMore = batch.length === 5000;
      skip += 5000;
      console.log(`Buscados ${all.length} registros...`);
    }
    console.log(`Total de registros: ${all.length}`);

    // Agrupar por chave composta: placa + data + hora (sem liters, mais flexível)
    const groups = {};
    for (const r of all) {
      const key = `${String(r.vehicle_plate).toUpperCase()}|${r.date}|${r.time || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    // Para cada grupo com mais de 1 registro, manter o mais antigo e deletar o resto
    const idsToDelete = [];
    let duplicateGroups = 0;
    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        duplicateGroups++;
        // Ordenar por created_date (mais antigo primeiro)
        const sorted = [...group].sort((a, b) =>
          (a.created_date || '').localeCompare(b.created_date || '')
        );
        // Manter o primeiro, deletar o resto
        for (let i = 1; i < sorted.length; i++) {
          idsToDelete.push(sorted[i].id);
        }
      }
    });

    console.log(`Encontrados ${duplicateGroups} grupos de duplicatas, ${idsToDelete.length} registros para deletar`);

    // Deletar em lotes de 100
    let deleted = 0;
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      await base44.asServiceRole.entities.FuelRecord.deleteMany({ id: { '$in': batch } });
      deleted += batch.length;
      console.log(`Deletados ${deleted}/${idsToDelete.length}`);
    }

    return Response.json({
      success: true,
      duplicateGroups,
      deletedCount: deleted,
      totalBefore: all.length,
      totalAfter: all.length - deleted
    });

  } catch (error) {
    console.error('Erro ao limpar duplicatas:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});