import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key') || req.headers.get('x-api-key');
    const card = url.searchParams.get('card'); // opcional: filtrar por card específico

    if (apiKey !== Deno.env.get('EXPORT_API_KEY')) {
      return Response.json({ error: 'API key inválida' }, { status: 401 });
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*' }
      });
    }

    const base44 = createClientFromRequest(req);

    const fetchers = {
      combustivel: () => base44.asServiceRole.entities.Combustivel.list('codigo'),
      motoristas: () => base44.asServiceRole.entities.Motorista.list('codigo'),
      frentistas: () => base44.asServiceRole.entities.Frentista.list('codigo'),
      pontos: () => base44.asServiceRole.entities.Ponto.list('codigo'),
      placaEquipamento: () => base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000),
    };

    let result = {};

    if (card && fetchers[card]) {
      // Retorna apenas o card solicitado
      result[card] = await fetchers[card]();
    } else {
      // Retorna todos
      const [combustivel, motoristas, frentistas, pontos, placaEquipamento] = await Promise.all([
        fetchers.combustivel(),
        fetchers.motoristas(),
        fetchers.frentistas(),
        fetchers.pontos(),
        fetchers.placaEquipamento(),
      ]);
      result = { combustivel, motoristas, frentistas, pontos, placaEquipamento };
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      data: result
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});