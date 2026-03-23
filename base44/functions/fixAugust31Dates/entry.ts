import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all records
    const allRecords = await base44.asServiceRole.entities.FuelRecord.list('', 10000);
    
    // Filter records with date ending in -08-31 (August 31st)
    const recordsToUpdate = allRecords.filter(record => {
      if (!record.data?.date) return false;
      return record.data.date.includes('-08-31');
    });

    console.log(`Found ${recordsToUpdate.length} records with August 31st dates`);

    // Update each record, changing day 31 to 01 and month 08 to 09
    let updateCount = 0;
    for (const record of recordsToUpdate) {
      const oldDate = record.data.date;
      const newDate = oldDate.replace('-08-31', '-09-01');
      
      await base44.asServiceRole.entities.FuelRecord.update(record.id, {
        date: newDate
      });
      updateCount++;
    }

    return Response.json({
      success: true,
      message: `Updated ${updateCount} records from 31/08 to 01/09`,
      updatedCount: updateCount
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});