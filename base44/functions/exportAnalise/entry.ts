import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWED_API_KEY = Deno.env.get("EXPORT_API_KEY");

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (_) {}

  // Auth
  const apiKey = req.headers.get('x-api-key') || body.api_key;
  if (!apiKey || apiKey !== ALLOWED_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Fetch all data in parallel
    const [records, cubicMetros, pontos, motoristas, combustiveis, placaEquipamentos, precosCombustivel] = await Promise.all([
      base44.asServiceRole.entities.FuelRecord.list('-date', 10000),
      base44.asServiceRole.entities.CubicMetros.list(),
      base44.asServiceRole.entities.Ponto.list(),
      base44.asServiceRole.entities.Motorista.list(),
      base44.asServiceRole.entities.Combustivel.list(),
      base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000),
      base44.asServiceRole.entities.PrecoCombustivel.list()
    ]);

    // Build lookup maps
    const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
    const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
    const combustiveisMap = Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome]));
    const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

    // Optional filters from body
    const filterMonth = body.month !== undefined ? parseInt(body.month) : null; // 0-11
    const filterYear = body.year ? String(body.year) : null;
    const filterPlate = body.plate ? String(body.plate).toUpperCase() : null;
    const filterUnit = body.unit ? String(body.unit) : null;
    const filterEquipment = body.equipment ? String(body.equipment) : null;

    // Group by month+plate (same logic as page)
    const groupedData = {};
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;

      const d = new Date(r.date);
      const month = d.getUTCMonth();
      const year = d.getUTCFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const plateKey = r.vehicle_plate.toUpperCase();
      const groupKey = `${monthKey}-${plateKey}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          month: monthNames[month],
          monthIndex: month,
          year: year,
          monthKey: monthKey,
          plate: r.vehicle_plate,
          unit: r.unit,
          driver: r.driver,
          fuelType: r.fuel_type,
          totalLiters: 0,
          kmRecords: [],
          cost: 0
        };
      }

      groupedData[groupKey].totalLiters += r.liters || 0;
      if (r.korth_id) {
        groupedData[groupKey]._korthLiters = (groupedData[groupKey]._korthLiters || 0) + (r.liters || 0);
      } else {
        groupedData[groupKey]._externalCost = (groupedData[groupKey]._externalCost || 0) + (r.cost || 0);
      }
      if (Number(r.km_driven) > 0) {
        groupedData[groupKey].kmRecords.push(Number(r.km_driven));
      }
    });

    // Compute final fields
    let analysisData = Object.values(groupedData).map(item => {
      const kmDelta = item.kmRecords.length > 0
        ? Math.max(...item.kmRecords) - Math.min(...item.kmRecords)
        : 0;

      const d = new Date(item.monthKey + '-01');
      const monthNum = d.getUTCMonth();
      const yearNum = d.getUTCFullYear();
      const precoReg = precosCombustivel.find(p =>
        String(p.ponto) === String(item.unit) &&
        Number(p.mes) === monthNum &&
        Number(p.ano) === yearNum
      );
      const cost = (precoReg ? (item._korthLiters || 0) * precoReg.preco_litro : 0) + (item._externalCost || 0);

      const m3Data = cubicMetros.find(cm =>
        String(cm.placa).toUpperCase() === String(item.plate).toUpperCase() &&
        cm.mes === item.monthKey
      );
      const m3 = m3Data ? Number(m3Data.metros_cubicos) : 0;

      const unitName = pontosMap[String(item.unit)] || item.unit || '-';
      const equipment = placaEquipamentosMap[String(item.plate).toUpperCase()] || '-';
      const driver = motoristasMap[String(item.driver)] || item.driver || '-';
      const fuelType = combustiveisMap[String(item.fuelType)] || item.fuelType || '-';
      const efficiency = item.totalLiters > 0 ? parseFloat((kmDelta / item.totalLiters).toFixed(2)) : 0;
      const efficiencyCost = kmDelta > 0 ? parseFloat((cost / kmDelta).toFixed(2)) : 0;

      return {
        mes: item.month,
        placa: item.plate,
        usina: unitName,
        equipamento: equipment,
        motorista: driver,
        combustivel: fuelType,
        km_max_min: kmDelta,
        m3: parseFloat(m3.toFixed(2)),
        valor_rs: parseFloat(cost.toFixed(2)),
        eficiencia_km_l: efficiency,
        eficiencia_rs_km: efficiencyCost,
        // internal fields for filtering
        _monthIndex: monthNum,
        _year: item.year,
        _unitCode: item.unit
      };
    });

    // Apply filters
    if (filterMonth !== null) analysisData = analysisData.filter(i => i._monthIndex === filterMonth);
    if (filterYear) analysisData = analysisData.filter(i => String(i._year) === filterYear);
    if (filterPlate) analysisData = analysisData.filter(i => i.placa.toUpperCase() === filterPlate);
    if (filterUnit) analysisData = analysisData.filter(i => String(i._unitCode) === filterUnit || i.usina === filterUnit);
    if (filterEquipment) analysisData = analysisData.filter(i => i.equipamento === filterEquipment);

    // Remove internal fields
    const result = analysisData.map(({ _monthIndex, _year, _unitCode, ...rest }) => rest);

    // Sort by month then plate (default)
    result.sort((a, b) => {
      const mA = monthNames.indexOf(a.mes);
      const mB = monthNames.indexOf(b.mes);
      return mA !== mB ? mA - mB : a.placa.localeCompare(b.placa);
    });

    return Response.json({ total: result.length, data: result }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});