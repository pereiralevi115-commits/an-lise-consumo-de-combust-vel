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
        message: 'Nenhum registro para corrigir',
        count: 0
      });
    }

    // Corrigir datas adicionando 1 dia
    let correctedCount = 0;
    for (const record of records) {
      if (!record.date) continue;

      const date = new Date(record.date);
      date.setDate(date.getDate() + 1);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const newDate = `${year}-${month}-${day}`;

      await base44.asServiceRole.entities.FuelRecord.update(record.id, {
        date: newDate
      });

      correctedCount++;
    }

    return Response.json({
      success: true,
      message: `${correctedCount} registros corrigidos com sucesso`,
      count: correctedCount
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});