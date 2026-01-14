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
      prompt: `Extraia TODOS os dados da tabela deste PDF de abastecimento de combustível.
      
      Retorne um array JSON com TODOS os registros encontrados no PDF, no seguinte formato:
      
      Para cada linha da tabela, extraia:
      - date: data no formato YYYY-MM-DD (converter o número serial do Excel para data)
      - time: hora no formato HH:MM:SS
      - vehicle_plate: placa do veículo
      - vehicle_type: tipo do veículo
      - unit: usina/localização
      - attendant: nome do frentista
      - driver: nome do motorista
      - fuel_type: tipo de combustível (S10, S500, etc)
      - liters: quantidade em litros (número decimal)
      - km_driven: km rodados (número inteiro)
      - cost: valor em reais (número decimal)
      - cubic_meters: metros cúbicos M³ (número decimal ou null se vazio)
      
      IMPORTANTE:
      - O número na coluna DATA é um serial do Excel. Converta para data real (46010 = 10/01/2026, etc)
      - Extraia TODOS os registros, não apenas uma amostra
      - Mantenha os valores numéricos como números, não strings
      - Se um campo estiver vazio, use null`,
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