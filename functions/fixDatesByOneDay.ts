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

    if (records.length === 0) {
      return Response.json({ message: 'Nenhum registro para corrigir' });
    }

    // Corrigir datas (adicionar 1 dia)
    const updatedRecords = records.map(record => {
      const date = new Date(record.date);
      date.setDate(date.getDate() + 1);
      return {
        id: record.id,
        date: date.toISOString().split('T')[0]
      };
    });

    // Atualizar em lote
    let updated = 0;
    for (const rec of updatedRecords) {
      await base44.asServiceRole.entities.FuelRecord.update(rec.id, { date: rec.date });
      updated++;
    }

    return Response.json({
      success: true,
      message: `${updated} registros corrigidos com sucesso`,
      count: updated
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});