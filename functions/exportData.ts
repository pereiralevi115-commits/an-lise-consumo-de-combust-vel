import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        // Parse body for credentials
        let body = {};
        try {
            body = await req.json();
        } catch {
            return Response.json({ error: 'Body JSON inválido' }, { status: 400, headers: corsHeaders });
        }

        const { email, password, entity, filters } = body;

        if (!email || !password) {
            return Response.json({ error: 'email e password são obrigatórios' }, { status: 400, headers: corsHeaders });
        }

        // Authenticate user via Base44
        const base44 = createClientFromRequest(req);

        // Login with email/password
        let user;
        try {
            user = await base44.auth.loginWithPassword(email, password);
        } catch {
            return Response.json({ error: 'Credenciais inválidas' }, { status: 401, headers: corsHeaders });
        }

        if (!user) {
            return Response.json({ error: 'Credenciais inválidas' }, { status: 401, headers: corsHeaders });
        }

        // Define which entities to export
        const allowedEntities = ['FuelRecord', 'Motorista', 'Frentista', 'Ponto', 'Combustivel', 'PlacaEquipamento', 'CubicMetros', 'PrecoCombustivel'];

        // If a specific entity is requested
        if (entity) {
            if (!allowedEntities.includes(entity)) {
                return Response.json({ error: `Entidade inválida. Permitidas: ${allowedEntities.join(', ')}` }, { status: 400, headers: corsHeaders });
            }

            let data;
            if (entity === 'FuelRecord') {
                // Support optional date filters: { dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD" }
                const allRecords = await base44.asServiceRole.entities.FuelRecord.list('-date', 100000);
                data = allRecords;
                if (filters?.dateFrom) {
                    data = data.filter(r => r.date >= filters.dateFrom);
                }
                if (filters?.dateTo) {
                    data = data.filter(r => r.date <= filters.dateTo);
                }
                if (filters?.unit) {
                    data = data.filter(r => r.unit === filters.unit);
                }
                if (filters?.vehicle_plate) {
                    data = data.filter(r => r.vehicle_plate === filters.vehicle_plate);
                }
            } else {
                data = await base44.asServiceRole.entities[entity].list();
            }

            return Response.json({
                success: true,
                entity,
                total: data.length,
                data,
            }, { headers: corsHeaders });
        }

        // Export ALL entities
        const [fuelRecords, motoristas, frentistas, pontos, combustiveis, placaEquipamentos, cubicMetros, precos] = await Promise.all([
            base44.asServiceRole.entities.FuelRecord.list('-date', 100000),
            base44.asServiceRole.entities.Motorista.list(),
            base44.asServiceRole.entities.Frentista.list(),
            base44.asServiceRole.entities.Ponto.list(),
            base44.asServiceRole.entities.Combustivel.list(),
            base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000),
            base44.asServiceRole.entities.CubicMetros.list(),
            base44.asServiceRole.entities.PrecoCombustivel.list(),
        ]);

        return Response.json({
            success: true,
            exported_at: new Date().toISOString(),
            data: {
                fuel_records: { total: fuelRecords.length, records: fuelRecords },
                motoristas: { total: motoristas.length, records: motoristas },
                frentistas: { total: frentistas.length, records: frentistas },
                pontos: { total: pontos.length, records: pontos },
                combustiveis: { total: combustiveis.length, records: combustiveis },
                placa_equipamentos: { total: placaEquipamentos.length, records: placaEquipamentos },
                cubic_metros: { total: cubicMetros.length, records: cubicMetros },
                precos_combustivel: { total: precos.length, records: precos },
            }
        }, { headers: corsHeaders });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
});