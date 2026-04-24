import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all data
    const cubicMetros = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);
    const exclusoes = await base44.asServiceRole.entities.ExclusaoMedia.list();
    const placaEquipamentos = await base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000);

    const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));
    const exclusoesSet = new Set(exclusoes.map(e => `${String(e.placa).toUpperCase()}-${e.mes}`));

    // Group by plate/month
    const groupedByPlateMonth = {};
    cubicMetros.forEach(cm => {
      const key = `${String(cm.placa).toUpperCase()}-${cm.mes}`;
      if (!groupedByPlateMonth[key]) {
        groupedByPlateMonth[key] = [];
      }
      groupedByPlateMonth[key].push(cm);
    });

    // Calculate totals by equipment
    const equipmentTotals = {
      'CAMINHÃO BETONEIRA': 0,
      'BOMBA LANÇA': 0,
      'BOMBA ESTACIONÁRIA': 0,
      'OUTROS': 0
    };

    const details = [];

    Object.entries(groupedByPlateMonth).forEach(([key, records]) => {
      const [plateUpper, mes] = key.split('-');
      const equipamento = placaEquipamentosMap[plateUpper] || 'DESCONHECIDO';
      const soma = records.reduce((sum, cm) => sum + Number(cm.metros_cubicos), 0);
      const isExcluded = exclusoesSet.has(key);

      let category = 'OUTROS';
      if (equipamento.toUpperCase().includes('BETONEIRA')) category = 'CAMINHÃO BETONEIRA';
      else if (equipamento.toUpperCase().includes('LANÇA')) category = 'BOMBA LANÇA';
      else if (equipamento.toUpperCase().includes('ESTACIONÁRIA') || equipamento.toUpperCase().includes('ESTACIONARIA')) category = 'BOMBA ESTACIONÁRIA';

      equipmentTotals[category] += soma;

      if (records.length > 1 || soma > 1000) {
        details.push({
          placa: plateUpper,
          mes,
          equipamento,
          category,
          recordCount: records.length,
          valores: records.map(r => r.metros_cubicos),
          soma,
          isExcluded
        });
      }
    });

    const totalM3 = Object.values(equipmentTotals).reduce((a, b) => a + b, 0);

    return Response.json({
      totalCubicMetros: cubicMetros.length,
      totalM3Geral: totalM3,
      equipmentTotals,
      duplicateRecords: details.filter(d => d.recordCount > 1),
      largeRecords: details.filter(d => d.recordCount === 1 && d.soma > 1000),
      allGroupedRecords: Object.entries(groupedByPlateMonth).length,
      sampleData: details.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});