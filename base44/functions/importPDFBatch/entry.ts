import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { textData } = body;

    if (!textData) {
      return Response.json({ error: 'Dados não fornecidos' }, { status: 400 });
    }

    console.log('Processando dados em lote via LLM');

    // Usar LLM para estruturar os dados
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Converta estes dados de abastecimento para JSON estruturado.

Formato de entrada (cada linha):
DATA(serial Excel) HORA PLACA TIPO USINA FRENTISTA MOTORISTA COMBUSTÍVEL LITROS KM_RODADO VALOR M³

REGRAS:
- DATA: converter serial Excel para YYYY-MM-DD (ex: 45992 = dias desde 1900-01-01, considerar bug do Excel -2 dias)
- HORA: "HH:MM:SS" ou "HH:MM" (adicionar :00), se decimal tipo "0,75" usar null
- KM_RODADO: manter valor literal (0 se for 0, null se vazio)
- M³: null se vazio
- LITROS e VALOR: converter vírgula para ponto decimal

DADOS:
${textData}`,
      response_json_schema: {
        type: "object",
        properties: {
          records: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                time: { type: ["string", "null"] },
                vehicle_plate: { type: "string" },
                vehicle_type: { type: "string" },
                unit: { type: "string" },
                attendant: { type: "string" },
                driver: { type: "string" },
                fuel_type: { type: "string" },
                liters: { type: "number" },
                km_driven: { type: ["number", "null"] },
                cost: { type: "number" },
                cubic_meters: { type: ["number", "null"] }
              }
            }
          }
        }
      }
    });

    const records = llmResult.records;
    console.log(`${records.length} registros extraídos`);

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro encontrado' }, { status: 400 });
    }

    // Inserir em lote
    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(records);
    console.log(`${saved.length} registros salvos`);

    return Response.json({ 
      success: true,
      count: saved.length
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});