import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWED_API_KEY = Deno.env.get("EXPORT_API_KEY");

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, api_key',
            }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        let body = {};
        try {
            body = await req.json();
        } catch {
            return Response.json({ error: 'Body JSON inválido' }, { status: 400, headers: corsHeaders });
        }

        const { entity, filters, api_key } = body;

        // Autenticação por api_key
        const keyFromHeader = req.headers.get('api_key');
        const receivedKey = api_key || keyFromHeader;

        if (!ALLOWED_API_KEY || receivedKey !== ALLOWED_API_KEY) {
            return Response.json({ error: 'Não autorizado' }, { status: 401, headers: corsHeaders });
        }

        const base44 = createClientFromRequest(req);
        const allowedEntities = ['FuelRecord', 'Motorista', 'Frentista', 'Ponto', 'Combustivel', 'PlacaEquipamento', 'CubicMetros', 'PrecoCombustivel'];

        if (entity) {
            if (!allowedEntities.includes(entity)) {
                return Response.json({ error: `Entidade inválida.` }, { status: 400, headers: corsHeaders });
            }

            let data;
            if (entity === 'FuelRecord') {
                const allRecords = await base44.asServiceRole.entities.FuelRecord.list('-date', 100000);
                data = allRecords;
                if (filters?.dateFrom) data = data.filter(r => r.date >= filters.dateFrom);
                if (filters?.dateTo) data = data.filter(r => r.date <= filters.dateTo);
            } else {
                data = await base44.asServiceRole.entities[entity].list();
            }

            return Response.json({ success: true, entity, total: data.length, data }, { headers: corsHeaders });
        }

        return Response.json({ error: 'Informe uma entidade' }, { status: 400, headers: corsHeaders });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
});