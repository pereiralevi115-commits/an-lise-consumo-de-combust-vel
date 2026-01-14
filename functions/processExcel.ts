import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    console.log(`Processando arquivo: ${file.name}`);

    // Upload file
    const uploadResult = await base44.integrations.Core.UploadFile({ 
      file: file 
    });

    console.log(`Arquivo enviado: ${uploadResult.file_url}`);

    // Define schema for extraction
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          time: { type: "string" },
          vehicle_plate: { type: "string" },
          vehicle_type: { type: "string" },
          unit: { type: "string" },
          attendant: { type: "string" },
          driver: { type: "string" },
          fuel_type: { type: "string" },
          liters: { type: "number" },
          km_driven: { type: "number" },
          cost: { type: "number" },
          cubic_meters: { type: "number" }
        }
      }
    };

    // Extract data
    const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: uploadResult.file_url,
      json_schema: schema
    });

    if (extractionResult.status === 'error') {
      console.error('Erro na extração:', extractionResult.details);
      return Response.json({ 
        error: `Erro ao processar arquivo: ${extractionResult.details}` 
      }, { status: 400 });
    }

    const records = extractionResult.output;
    console.log(`${records.length} registros extraídos`);

    // Save records
    const savedRecords = [];
    for (const record of records) {
      const saved = await base44.asServiceRole.entities.FuelRecord.create(record);
      savedRecords.push(saved);
    }

    console.log(`${savedRecords.length} registros salvos`);

    return Response.json({ 
      success: true,
      count: savedRecords.length,
      records: savedRecords
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});