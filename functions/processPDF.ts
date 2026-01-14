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

    // Use LLM to extract data from PDF
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extraia ABSOLUTAMENTE TODOS os dados deste PDF de abastecimento de combustível, linha por linha, TODAS as páginas.
      
      O PDF contém uma tabela com dados de abastecimento. Extraia CADA LINHA da tabela completa.
      
      Colunas:
      - DATA (número serial Excel, ex: 46010)
      - HORA
      - PLACA
      - TIPO
      - USINA
      - FRENTISTA
      - MOTORISTA
      - COMBUSTIVEL
      - LITROS
      - RODADO (KM)
      - VALOR (R$)
      - M³
      
      Retorne todos os dados no formato:
      {
        "records": [
          {
            "date": "YYYY-MM-DD" (converter serial Excel para data: 46010=2026-01-10, 45992=2025-12-23, etc),
            "time": "HH:MM:SS",
            "vehicle_plate": "placa",
            "vehicle_type": "tipo",
            "unit": "usina",
            "attendant": "frentista",
            "driver": "motorista",
            "fuel_type": "combustível",
            "liters": número,
            "km_driven": número ou null,
            "cost": número,
            "cubic_meters": número ou null
          }
        ]
      }
      
      CRÍTICO: Não pule nenhuma linha. O PDF tem centenas de registros. Extraia TODOS.`,
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