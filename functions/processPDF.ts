import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl } = body;

    if (!fileUrl) {
      return Response.json({ error: 'URL do arquivo não fornecida' }, { status: 400 });
    }

    console.log(`Processando PDF: ${fileUrl}`);

    // Use LLM to extract ALL data from PDF
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extraia TODOS os dados deste PDF de abastecimento de combustível.
      
      O arquivo contém uma tabela com dados de abastecimento. Extraia TODAS as linhas de TODAS as páginas.
      
      Formato de retorno:
      {
        "records": [
          {
            "date": "YYYY-MM-DD" (converter serial Excel: 45992=2025-12-23, 45993=2025-12-24, 45994=2025-12-25... 46021=2026-01-21),
            "time": "HH:MM:SS" (se hora estiver incompleta como "07:33" completar como "07:33:00", se for só número como "0,75" use null),
            "vehicle_plate": "placa do veículo",
            "vehicle_type": "tipo",
            "unit": "usina",
            "attendant": "frentista",
            "driver": "motorista",
            "fuel_type": "S10 ou S500",
            "liters": número decimal,
            "km_driven": número inteiro ou null se vazio/zero,
            "cost": número decimal,
            "cubic_meters": número decimal ou null se vazio
          }
        ]
      }
      
      IMPORTANTE: Este PDF tem muitos registros (centenas). Extraia TODOS sem exceção.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          records: {
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
                cubic_meters: { type: ["number", "null"] }
              }
            }
          }
        }
      }
    });

    const records = extractionResult.records;
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