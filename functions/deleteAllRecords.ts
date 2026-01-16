import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os registros
    const records = await base44.asServiceRole.entities.FuelRecord.list('', 10000);
    
    if (!records || records.length === 0) {
      return Response.json({ 
        success: true,
        message: 'Nenhum registro para excluir',
        count: 0
      });
    }

    // Deletar em lotes de 50 com pausa de 1 segundo entre lotes
    let deletedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        await base44.asServiceRole.entities.FuelRecord.delete(record.id);
        deletedCount++;
      }
      
      // Pausa de 1 segundo entre lotes
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return Response.json({
      success: true,
      message: `${deletedCount} registros excluídos com sucesso`,
      count: deletedCount
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});