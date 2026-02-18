import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const KORTH_API_URL = 'https://www.guardianweb.online/webservicev1gw';

async function autenticar() {
  const response = await fetch(`${KORTH_API_URL}/v1/autenticar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      login: Deno.env.get('KORTH_LOGIN'),
      senha: Deno.env.get('KORTH_SENHA')
    })
  });

  if (!response.ok) {
    throw new Error(`Falha na autenticação: ${response.status}`);
  }

  const data = await response.json();
  console.log('Resposta autenticação:', JSON.stringify(data).substring(0, 200));

  // Token está em data.dados.token
  const token = (data.dados && data.dados.token) ? data.dados.token : (data.token || data.access_token);
  if (!token) {
    throw new Error('Token não encontrado. Resposta: ' + JSON.stringify(data).substring(0, 300));
  }
  return token;
}

async function buscarAbastecimentos(token, dataIni, dataFim) {
  const url = `${KORTH_API_URL}/v2/listar/abastecimentos?dataIni=${dataIni}&dataFim=${dataFim}&referencia=data_integ&allData=true`;
  console.log('Buscando URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 429) {
    throw new Error('Rate limit atingido (429). Tente novamente em alguns minutos.');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao buscar abastecimentos: ${response.status} - ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log('Campos resposta:', Object.keys(data));

  // A lista pode estar em data.dados (array) ou diretamente
  if (Array.isArray(data.dados)) return data.dados;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.abastecimentos)) return data.abastecimentos;
  return [];
}

function mapearRegistro(item) {
  return {
    date: item.data_abast || null,
    time: item.hora_abast || null,
    vehicle_plate: item.placa || String(item.frota || ''),
    vehicle_type: item.medidor_unidade || null,
    unit: item.identificacao_do_ponto || null,
    driver: item.operador ? String(item.operador) : null,
    attendant: item.comboista ? String(item.comboista) : null,
    fuel_type: item.combustivel || null,
    liters: item.litragem ? parseFloat(item.litragem) : 0,
    km_driven: item.medidor_unidade === 'km' ? parseFloat(item.medidor || 0) : 0,
    cost: 0,
    cubic_meters: null
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    let { dataIni, dataFim } = body;
    if (!dataIni || !dataFim) {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const fmt = (d) => d.toISOString().split('T')[0];
      dataIni = fmt(ontem);
      dataFim = fmt(ontem);
    }

    console.log(`Período: ${dataIni} até ${dataFim}`);

    const token = await autenticar();
    console.log('Token obtido com sucesso');

    const abastecimentos = await buscarAbastecimentos(token, dataIni, dataFim);
    console.log(`${abastecimentos.length} registros encontrados`);

    if (abastecimentos.length === 0) {
      return Response.json({ success: true, count: 0, periodo: `${dataIni} a ${dataFim}`, message: 'Nenhum abastecimento encontrado no período' });
    }

    const records = abastecimentos.map(mapearRegistro).filter(r => r.date && r.vehicle_plate);
    console.log(`${records.length} registros válidos`);

    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(records);
    console.log(`${saved.length} registros salvos`);

    return Response.json({
      success: true,
      count: saved.length,
      periodo: `${dataIni} a ${dataFim}`
    });

  } catch (error) {
    console.error('Erro na integração Korth:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});