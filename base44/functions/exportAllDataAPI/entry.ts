import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Validar senha
    const url = new URL(req.url);
    const senha = url.searchParams.get('senha');

    if (senha !== '123456') {
      return Response.json({ error: 'Senha inválida' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Buscar dados de todas as entidades
    const [
      fuelRecords,
      korthExcluidos,
      cubicMetros,
      motoristas,
      frentistas,
      pontos,
      combustiveis,
      precosCombustivel,
      placasEquipamento,
      exclusoesMedia
    ] = await Promise.all([
      base44.asServiceRole.entities.FuelRecord.list(),
      base44.asServiceRole.entities.KorthExcluido.list(),
      base44.asServiceRole.entities.CubicMetros.list(),
      base44.asServiceRole.entities.Motorista.list(),
      base44.asServiceRole.entities.Frentista.list(),
      base44.asServiceRole.entities.Ponto.list(),
      base44.asServiceRole.entities.Combustivel.list(),
      base44.asServiceRole.entities.PrecoCombustivel.list(),
      base44.asServiceRole.entities.PlacaEquipamento.list(),
      base44.asServiceRole.entities.ExclusaoMedia.list()
    ]);

    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFuelRecords: fuelRecords.length,
        totalExcluded: korthExcluidos.length,
        totalDrivers: motoristas.length,
        totalAttendants: frentistas.length,
        totalUnits: pontos.length,
        totalFuelTypes: combustiveis.length,
        totalPlates: placasEquipamento.length
      },
      data: {
        fuelRecords,
        korthExcluidos,
        cubicMetros,
        motoristas,
        frentistas,
        pontos,
        combustiveis,
        precosCombustivel,
        placasEquipamento,
        exclusoesMedia
      }
    };

    return Response.json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});