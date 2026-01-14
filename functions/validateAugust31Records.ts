import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all records with 31/08/2025
        const allRecords = await base44.entities.FuelRecord.list('-date', 10000);
        const august31Records = allRecords.filter(r => {
            if (!r.date) return false;
            const dateStr = r.date.split('T')[0];
            return dateStr === '2025-08-31';
        });

        // Get record details
        const recordDetails = august31Records.map(r => ({
            id: r.id,
            date: r.date,
            vehicle_plate: r.vehicle_plate,
            driver: r.driver,
            liters: r.liters,
            km_driven: r.km_driven,
            created_date: r.created_date,
            cost: r.cost
        }));

        // Get a sample of other records to compare date pattern
        const otherRecords = allRecords.filter(r => r.date && !r.date.includes('2025-08-31')).slice(0, 10);
        const otherDates = otherRecords.map(r => ({
            date: r.date,
            vehicle_plate: r.vehicle_plate
        }));

        return Response.json({
            august31Count: august31Records.length,
            august31Samples: recordDetails.slice(0, 20),
            totalRecords: allRecords.length,
            otherDateSamples: otherDates,
            message: `Encontrados ${august31Records.length} registros com data 31/08/2025`
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});