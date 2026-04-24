import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os registros de CubicMetros para Março/2026
    const allCubicMetros = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.entities.CubicMetros.list('-mes', 1000, offset);
      if (batch.length === 0) hasMore = false;
      else {
        allCubicMetros.push(...batch);
        offset += batch.length;
      }
    }

    // Filtrar para Março/2026 e CAMINHÃO BETONEIRA
    const marcoData = allCubicMetros.filter(r => r.mes === '2026-03');
    
    // Buscar placas para mapear equipamento
    const placaEquipamentos = await base44.entities.PlacaEquipamento.list('placa', 10000);
    const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

    // Filtrar apenas CAMINHÃO BETONEIRA
    const betoneirasMarco = marcoData.filter(r => {
      const eq = placaEquipamentosMap[String(r.placa).toUpperCase()] || r.equipamento || '';
      return eq.toUpperCase().includes('CAMINHÃO BETONEIRA') || eq.toUpperCase().includes('BETONEIRA');
    });

    // Calcular soma total
    const totalM3 = betoneirasMarco.reduce((sum, r) => sum + (r.metros_cubicos || 0), 0);

    // Buscar exclusões
    const exclusoes = await base44.entities.ExclusaoMedia.list();
    const exclusoesMarco = exclusoes.filter(e => e.mes === '2026-03');

    // Buscar FuelRecord para Março/2026
    const allFuelRecords = [];
    offset = 0;
    hasMore = true;
    while (hasMore) {
      const batch = await base44.entities.FuelRecord.list('-date', 1000, offset);
      if (batch.length === 0) hasMore = false;
      else {
        allFuelRecords.push(...batch);
        offset += batch.length;
      }
    }

    const fuelMarco = allFuelRecords.filter(r => r.date && r.date.startsWith('2026-03'));

    return Response.json({
      totalCubicMetrosBetoneira: totalM3,
      quantidadeRegistros: betoneirasMarco.length,
      exclusoesMarca: exclusoesMarco.length,
      exclusoesDetalhes: exclusoesMarco.map(e => `${e.placa} - ${e.motivo || 'Sem motivo'}`),
      fuelRecordsMarco: fuelMarco.length,
      duplicatas: betoneirasMarco
        .map(r => r.placa)
        .filter((p, idx, arr) => arr.indexOf(p) !== idx)
        .filter((p, idx, arr) => arr.indexOf(p) === idx)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});