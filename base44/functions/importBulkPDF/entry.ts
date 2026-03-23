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

    console.log(`Processando PDF em lote: ${fileUrl}`);

    // Processar PDF com LLM
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extraia TODOS os dados deste PDF de abastecimento de combustível.
      
      O arquivo contém uma tabela com dados de abastecimento em TODAS as páginas.
      
      Colunas: DATA, HORA, PLACA, TIPO, USINA, FRENTISTA, MOTORISTA, COMBUSTÍVEL, LITROS, KM RODADO, VALOR, M³
      
      IMPORTANTE:
      - DATA está como serial Excel (ex: 45992 = 2025-12-23, 45993 = 2025-12-24, calcular a partir de 1900-01-01)
      - HORA pode estar como "HH:MM:SS", "HH:MM" (completar com :00), ou decimal "0,75" (usar null)
      - Extrair TODOS os registros de TODAS as páginas (centenas de linhas)
      - M³ vazio = null
      - KM RODADO = 0 ou vazio = usar o valor literal (0 se for 0, null se vazio)
      
      Retorne JSON com todos os registros.`,
      file_urls: [fileUrl],
      add_context_from_internet: false,
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

    const records = extractionResult.records;
    console.log(`${records.length} registros extraídos do PDF`);

    // Inserir em lotes de 100 para evitar timeout
    const batchSize = 100;
    let totalSaved = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await base44.asServiceRole.entities.FuelRecord.bulkCreate(batch);
      totalSaved += batch.length;
      console.log(`Processados ${totalSaved}/${records.length} registros`);
    }

    console.log(`${totalSaved} registros salvos com sucesso`);

    return Response.json({ 
      success: true,
      count: totalSaved
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});