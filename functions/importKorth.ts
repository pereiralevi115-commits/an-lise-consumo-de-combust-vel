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
  // O token pode estar em diferentes campos dependendo da resposta
  const token = data.token || data.access_token || data.jwt || data.bearer;
  if (!token) {
    throw new Error('Token não encontrado na resposta: ' + JSON.stringify(data));
  }
  return token;
}

async function buscarAbastecimentos(token, dataIni, dataFim) {
  const url = `${KORTH_API_URL}/v2/listar/abastecimentos?dataIni=${dataIni}&dataFim=${dataFim}&referencia=data_abast`;
  
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
    throw new Error(`Falha ao buscar abastecimentos: ${response.status}`);
  }

  const data = await response.json();
  return data.dados || data.abastecimentos || data || [];
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
    cost: 0, // API não retorna custo diretamente
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
    
    // Se não informar datas, busca o dia anterior
    let { dataIni, dataFim } = body;
    if (!dataIni || !dataFim) {
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const fmt = (d) => d.toISOString().split('T')[0];
      dataIni = fmt(ontem);
      dataFim = fmt(ontem);
    }

    console.log(`Buscando abastecimentos de ${dataIni} até ${dataFim}`);

    // 1. Autenticar
    const token = await autenticar();
    console.log('Autenticação realizada com sucesso');

    // 2. Buscar abastecimentos
    const abastecimentos = await buscarAbastecimentos(token, dataIni, dataFim);
    console.log(`${abastecimentos.length} registros encontrados na API`);

    if (abastecimentos.length === 0) {
      return Response.json({ success: true, count: 0, message: 'Nenhum abastecimento encontrado no período' });
    }

    // 3. Mapear para o formato FuelRecord
    const records = abastecimentos.map(mapearRegistro).filter(r => r.date && r.vehicle_plate);
    console.log(`${records.length} registros válidos para importar`);

    // 4. Salvar no banco
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