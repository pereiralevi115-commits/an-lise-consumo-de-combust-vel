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

    // Deletar todos os registros
    let deletedCount = 0;
    for (const record of records) {
      await base44.asServiceRole.entities.FuelRecord.delete(record.id);
      deletedCount++;
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