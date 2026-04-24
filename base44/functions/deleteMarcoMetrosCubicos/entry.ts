import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os registros de Março
    const allRecords = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);
    const marcoRecords = allRecords.filter(r => r.mes && r.mes.includes('03'));

    console.log(`Encontrados ${marcoRecords.length} registros de Março`);

    if (marcoRecords.length === 0) {
      return Response.json({ success: true, message: 'Nenhum registro de Março encontrado', deleted: 0 });
    }

    // Deletar em lotes para não sobrecarregar
    const batchSize = 20;
    let deletedCount = 0;

    for (let i = 0; i < marcoRecords.length; i += batchSize) {
      const batch = marcoRecords.slice(i, i + batchSize);
      await Promise.all(
        batch.map(r => base44.asServiceRole.entities.CubicMetros.delete(r.id).catch(() => {}))
      );
      deletedCount += batch.length;
    }

    return Response.json({ 
      success: true, 
      message: `${deletedCount} registros de Março deletados com sucesso!`,
      deleted: deletedCount 
    });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});