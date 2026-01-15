import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all records
        const allRecords = await base44.asServiceRole.entities.FuelRecord.list('-date', 10000);
        
        // Delete all records
        let deletedCount = 0;
        for (const record of allRecords) {
            await base44.asServiceRole.entities.FuelRecord.delete(record.id);
            deletedCount++;
        }

        return Response.json({
            success: true,
            message: `Todos os ${deletedCount} registros foram deletados`,
            deletedCount
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});