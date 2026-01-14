import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Converte data serial do Excel para YYYY-MM-DD
function excelSerialToDate(serial) {
  const baseDate = new Date(1900, 0, 1);
  const days = Math.floor(serial) - 2; // Excel tem bug: conta 1900 como ano bissexto
  const date = new Date(baseDate.getTime() + days * 86400000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parseia uma linha do PDF
function parseLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 12) return null;

  const dateSerial = parseFloat(parts[0]);
  if (isNaN(dateSerial) || dateSerial < 40000) return null;

  const time = parts[1].includes(':') ? parts[1] : null;
  const vehiclePlate = parts[2];
  
  // Encontrar índices dos campos fixos
  let typeEndIdx = 3;
  const possibleTypes = ['PÁ', 'CAMINHÃO', 'MUCK/PLATAFORMA', 'VEICULO', 'BOMBA', 'OUTROS', 'GERADOR', 'LIGATAN', 'MANUTEN'];
  while (typeEndIdx < parts.length && !parts.slice(3, typeEndIdx + 1).join(' ').match(/CARREGADEIRA|BASCULANTE|BETONEIRA|APOIO|LANÇA|ESTACIONÁRIA|OUTROS/)) {
    typeEndIdx++;
  }
  
  const vehicleType = parts.slice(3, typeEndIdx + 1).join(' ');
  
  // Encontrar CONCRETAR
  let concretarIdx = parts.findIndex((p, idx) => idx > typeEndIdx && p === 'CONCRETAR');
  if (concretarIdx === -1) return null;
  
  const unit = parts.slice(typeEndIdx + 1, concretarIdx + 1).join(' ');
  
  // Depois de CONCRETAR, vem USINA, FRENTISTA, MOTORISTA até encontrar S10 ou S500
  let fuelIdx = parts.findIndex((p, idx) => idx > concretarIdx && (p === 'S10' || p === 'S500'));
  if (fuelIdx === -1) return null;
  
  const staffParts = parts.slice(concretarIdx + 1, fuelIdx);
  const midPoint = Math.floor(staffParts.length / 2);
  const attendant = staffParts.slice(0, midPoint).join(' ');
  const driver = staffParts.slice(midPoint).join(' ');
  
  const fuelType = parts[fuelIdx];
  const liters = parseFloat(parts[fuelIdx + 1]?.replace(',', '.')) || 0;
  const kmDriven = parseFloat(parts[fuelIdx + 2]) || 0;
  const cost = parseFloat(parts[fuelIdx + 3]?.replace(',', '.')) || 0;
  const cubicMeters = parts[fuelIdx + 4] ? parseFloat(parts[fuelIdx + 4]) : null;

  return {
    date: excelSerialToDate(dateSerial),
    time,
    vehicle_plate: vehiclePlate,
    vehicle_type: vehicleType,
    unit,
    attendant,
    driver,
    fuel_type: fuelType,
    liters,
    km_driven: kmDriven || null,
    cost,
    cubic_meters: cubicMeters
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { textData, pageInfo } = body;

    if (!textData) {
      return Response.json({ error: 'Dados não fornecidos' }, { status: 400 });
    }

    console.log(`Processando lote: ${pageInfo || 'sem info'}`);

    // Parsear linhas
    const lines = textData.split('\n').filter(l => l.trim());
    const records = [];
    
    for (const line of lines) {
      const record = parseLine(line);
      if (record) {
        records.push(record);
      }
    }

    console.log(`${records.length} registros parseados`);

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro válido encontrado' }, { status: 400 });
    }

    // Inserir em lote
    const saved = await base44.asServiceRole.entities.FuelRecord.bulkCreate(records);
    console.log(`${saved.length} registros salvos`);

    return Response.json({ 
      success: true,
      count: saved.length,
      pageInfo
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});