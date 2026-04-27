import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { parseISO } from 'date-fns';
import { useAnaliseData, monthNames as MONTH_NAMES } from '@/hooks/useAnaliseData';


const YELLOW = '#FCD34D';
const BLUE = '#E5E7EB';
const GRAY = '#9CA3AF';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR', {maximumFractionDigits: 2}) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const CustomLabel = (props) => {
  const { x, y, width, height, value, position } = props;
  if (!value) return null;
  
  const isVertical = position === 'top' || position === 'bottom';
  const displayValue = typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 1}) : value;
  
  if (isVertical) {
    return (
      <text 
        x={x + width / 2} 
        y={y - 8} 
        fill="#1f2937" 
        textAnchor="middle" 
        fontSize="11" 
        fontWeight="600"
      >
        {displayValue}
      </text>
    );
  }
  
  return (
    <text 
      x={x + width + 8} 
      y={y + height / 2} 
      fill="#1f2937" 
      textAnchor="start" 
      dominantBaseline="middle"
      fontSize="11" 
      fontWeight="600"
    >
      {displayValue}
    </text>
  );
};

export default function Graficos() {
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    unit: '',
    equipment: '',
    plate: '',
    driver: ''
  });

  // Use the shared hook — same data source as Analise page
  const {
    analiseByPlaca: analysisData,
    cubicMetros,
    exclusoesSet,
    pontosMap,
    motoristasMap,
    placaEquipamentosMap,
    months,
    years,
    plates,
    equipments,
  } = useAnaliseData();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const units = useMemo(() => [...new Set(analysisData.map(d => d.unit))].filter(Boolean).sort(), [analysisData]);
  const drivers = useMemo(() => [...new Set(analysisData.map(d => d.driver))].filter(d => d && d !== '-').sort((a, b) => a.localeCompare(b, 'pt-BR')).reduce((acc, name) => {
    if (!acc.seen.has(name.toUpperCase())) { acc.seen.add(name.toUpperCase()); acc.list.push(name); }
    return acc;
  }, { seen: new Set(), list: [] }).list, [analysisData]);

  const monthNames = MONTH_NAMES;

  // Apply filters
  const filtered = useMemo(() => analysisData.filter(d => {
    if (filters.year && String(d.year) !== filters.year) return false;
    if (filters.month && monthNames[parseInt(filters.month)] !== d.month) return false;
    if (filters.unit && d.unit !== filters.unit) return false;
    if (filters.equipment && d.equipment !== filters.equipment) return false;
    if (filters.plate && d.plate !== filters.plate) return false;
    if (filters.driver && d.driver !== filters.driver) return false;
    return true;
  }), [analysisData, filters, monthNames]);

  const totalLiters = filtered.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
  const totalCost = filtered.reduce((sum, d) => sum + (d.cost || 0), 0);
  const totalKm = filtered.reduce((sum, d) => sum + (d.kmDelta || 0), 0);

  // Chaves já contabilizadas no filtered (placa+mês com FuelRecord)
  const filteredKeys = new Set(filtered.map(d => `${d.monthKey}-${String(d.plate).toUpperCase()}`));

  // Registros do CubicMetros de placas SEM FuelRecord no mês (não aparecem no filtered)
  const cubicMetrosSemFuel = cubicMetros.filter(cm => {
    if (filters.year && !cm.mes.startsWith(filters.year)) return false;
    if (filters.month) {
      const mesNum = String(parseInt(filters.month) + 1).padStart(2, '0');
      if (!cm.mes.endsWith(`-${mesNum}`)) return false;
    }
    const key = `${cm.mes}-${String(cm.placa).toUpperCase()}`;
    return !filteredKeys.has(key);
  });

  // M³ totais: filtered + CubicMetros sem FuelRecord (placas que não abasteceram no mês)
  const totalM3Betoneira = filtered.filter(d => {
    const eq = (d.equipment || '').toUpperCase();
    return eq.includes('CAMINHÃO BETONEIRA') || eq.includes('BETONEIRA');
  }).reduce((sum, d) => sum + (d.m3 || 0), 0)
  + cubicMetrosSemFuel.filter(cm => {
    const tipo = (placaEquipamentosMap[String(cm.placa).toUpperCase()] || cm.equipamento || '').toUpperCase();
    return tipo.includes('CAMINHÃO BETONEIRA') || tipo.includes('BETONEIRA');
  }).reduce((sum, cm) => sum + Number(cm.metros_cubicos), 0);

  const totalM3BombaLanca = filtered.filter(d => {
    const eq = (d.equipment || '').toUpperCase();
    return eq.includes('BOMBA LANÇA') || eq.includes('BOMBAL LANÇA');
  }).reduce((sum, d) => sum + (d.m3 || 0), 0)
  + cubicMetrosSemFuel.filter(cm => {
    const tipo = (placaEquipamentosMap[String(cm.placa).toUpperCase()] || cm.equipamento || '').toUpperCase();
    return tipo.includes('BOMBA LANÇA') || tipo.includes('BOMBAL LANÇA');
  }).reduce((sum, cm) => sum + Number(cm.metros_cubicos), 0);

  const totalM3BombaEstacionaria = filtered.filter(d => {
    const eq = (d.equipment || '').toUpperCase();
    return eq.includes('BOMBA ESTACIONÁRIA') || eq.includes('BOMBA ESTACIONARIA');
  }).reduce((sum, d) => sum + (d.m3 || 0), 0)
  + cubicMetrosSemFuel.filter(cm => {
    const tipo = (placaEquipamentosMap[String(cm.placa).toUpperCase()] || cm.equipamento || '').toUpperCase();
    return tipo.includes('BOMBA ESTACIONÁRIA') || tipo.includes('BOMBA ESTACIONARIA');
  }).reduce((sum, cm) => sum + Number(cm.metros_cubicos), 0);

  const totalM3 = totalM3Betoneira + totalM3BombaLanca + totalM3BombaEstacionaria;

  // Monthly data - agregado de analysisData
  const monthlyData = {};
  filtered.forEach(d => {
    if (!monthlyData[d.month]) {
      monthlyData[d.month] = { name: d.month, liters: 0, km: 0, cost: 0 };
    }
    monthlyData[d.month].liters += d.totalLiters || 0;
    monthlyData[d.month].km += d.kmDelta || 0;
    monthlyData[d.month].cost += d.cost || 0;
  });
  const chartData = Object.values(monthlyData)
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

  // By unit - agregado de analysisData
  const byUnitData = units.map(unit => {
    const unitData = filtered.filter(d => d.unit === unit);
    const liters = unitData.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
    const km = unitData.reduce((sum, d) => sum + (d.kmDelta || 0), 0);
    const cost = unitData.reduce((sum, d) => sum + (d.cost || 0), 0);
    return {
      name: unit.replace('CONCRETAR ', ''),
      liters,
      km,
      cost,
      kmPerLiter: liters > 0 ? (km / liters) : 0
    };
  })
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  // By equipment - agrupa por placaEquipamentosMap (equipment), calcula km por placa e soma total
  const byEquipmentData = {};
  // Para KM/Lt correto: precisamos do KM total por placa dentro de cada tipo de equipamento
  // Agrupamos por equipment (tipo correto do mapa), somando liters e km de cada placa
  filtered.forEach(d => {
    const eqType = d.equipment && d.equipment !== '-' ? d.equipment : null;
    if (!eqType) return;
    if (!byEquipmentData[eqType]) {
      byEquipmentData[eqType] = { liters: 0, cost: 0, m3: 0, km: 0 };
    }
    byEquipmentData[eqType].liters += d.totalLiters || 0;
    byEquipmentData[eqType].cost += d.cost || 0;
    byEquipmentData[eqType].m3 += d.m3 || 0;
    byEquipmentData[eqType].km += d.kmDelta || 0;
  });

  const unitEquipmentArray = Object.entries(byEquipmentData)
    .map(([type, data]) => ({
      name: type,
      kmPerLiter: data.liters > 0 ? parseFloat((data.km / data.liters).toFixed(2)) : 0
    }))
    .filter(d => d.kmPerLiter > 0)
    .sort((a, b) => a.kmPerLiter - b.kmPerLiter);

  const equipmentArray = Object.entries(byEquipmentData)
      .map(([type, data]) => ({
        name: type,
        m3: data.m3,
        litersPerM3: data.m3 > 0 ? (data.liters / data.m3).toFixed(2) : 0,
        costPerM3: data.m3 > 0 ? (data.cost / data.m3).toFixed(2) : 0
      }))
      .filter(d => d.m3 > 0)
      .sort((a, b) => b.m3 - a.m3);

  const CustomBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <g>
        <text
          x={x + width / 2}
          y={y + height / 2 - 6}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight="600"
        >
          {typeof value === 'number' ? value.toFixed(2) : value}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fontWeight="500"
        >
          Km/Lt
        </text>
      </g>
    );
  };

  const HorizontalBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#1e293b"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + ' Km' : value}
      </text>
    );
  };

  const InsideBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) : value} M³
      </text>
    );
  };

  const LitersPerM3Label = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#1e293b"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} Lt/M³
      </text>
    );
  };

  const CostPerM3Label = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#1e293b"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} R$/M³
      </text>
    );
  };

  const EquipmentKmLtLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#1e293b"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} Km/Lt
      </text>
    );
  };

  const VehicleKmLiterLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#1e293b"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} Km/Lt
      </text>
    );
  };

  const CostPerKmLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;

    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#1e293b"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} R$/Km
      </text>
    );
  };

  // ---- 6 gráficos por veículo/motorista — dados vindos diretamente do hook (mesma fonte da tela Análise) ----
  const byVehicleData = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.plate]) map[d.plate] = { liters: 0, km: 0, cost: 0, kmCost: 0 };
      map[d.plate].liters += d.totalLiters || 0;
      map[d.plate].cost += d.cost || 0;
      const excluded = exclusoesSet.has(`${String(d.plate).toUpperCase()}-${d.monthKey}`);
      if (!excluded) {
        map[d.plate].km += d.kmDelta || 0;
        if (d.kmDelta > 0) map[d.plate].kmCost += d.cost || 0;
      }
    });
    return map;
  }, [filtered, exclusoesSet]);

  const vehicleKmArray = useMemo(() => Object.entries(byVehicleData)
    .map(([plate, data]) => ({ placa: plate, km: data.km }))
    .filter(d => d.km > 0).sort((a, b) => b.km - a.km).slice(0, 15), [byVehicleData]);

  const vehicleKmLiterArray = useMemo(() => Object.entries(byVehicleData)
    .map(([plate, data]) => ({ placa: plate, kmPerLiter: data.liters > 0 ? parseFloat((data.km / data.liters).toFixed(2)) : 0 }))
    .filter(d => d.kmPerLiter > 0).sort((a, b) => b.kmPerLiter - a.kmPerLiter).slice(0, 15), [byVehicleData]);

  const vehicleCostArray = useMemo(() => Object.entries(byVehicleData)
    .map(([plate, data]) => ({ placa: plate, km: data.km, costPerKm: data.km > 0 ? parseFloat((data.kmCost / data.km).toFixed(2)) : 0 }))
    .filter(d => d.km > 0 && d.costPerKm > 0 && isFinite(d.costPerKm)).sort((a, b) => b.costPerKm - a.costPerKm).slice(0, 15), [byVehicleData]);

  const byDriverData = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      const key = (d.driver || '-').toUpperCase();
      if (!map[key]) map[key] = { name: d.driver, liters: 0, km: 0, cost: 0, kmCost: 0 };
      map[key].liters += d.totalLiters || 0;
      map[key].cost += d.cost || 0;
      const excluded = exclusoesSet.has(`${String(d.plate).toUpperCase()}-${d.monthKey}`);
      if (!excluded) {
        map[key].km += d.kmDelta || 0;
        if (d.kmDelta > 0) map[key].kmCost += d.cost || 0;
      }
    });
    return map;
  }, [filtered, exclusoesSet]);

  const driverKmArray = useMemo(() => Object.values(byDriverData)
    .map(data => ({ driver: getFirstAndLastName(data.name), km: data.km }))
    .filter(d => d.km > 0).sort((a, b) => b.km - a.km).slice(0, 15), [byDriverData]);

  const driverKmLiterArray = useMemo(() => Object.values(byDriverData)
    .map(data => ({ driver: getFirstAndLastName(data.name), kmPerLiter: data.liters > 0 ? parseFloat((data.km / data.liters).toFixed(2)) : 0 }))
    .filter(d => d.kmPerLiter > 0).sort((a, b) => b.kmPerLiter - a.kmPerLiter).slice(0, 15), [byDriverData]);

  const driverCostArray = useMemo(() => Object.values(byDriverData)
    .map(data => ({ driver: getFirstAndLastName(data.name), km: data.km, costPerKm: data.km > 0 ? parseFloat((data.kmCost / data.km).toFixed(2)) : 0 }))
    .filter(d => d.km > 0 && d.costPerKm > 0 && isFinite(d.costPerKm)).sort((a, b) => b.costPerKm - a.costPerKm).slice(0, 15), [byDriverData]);

  if (isLoading) return <div className="text-slate-600 text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Gráficos de Combustível</h1>
            <p className="text-slate-500 mt-1">Análise de consumo por período, usina, equipamento e motorista</p>
          </div>
          <select 
            value={filters.year} 
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Filters */}
         <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <select 
            value={filters.month} 
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.unit} 
            onChange={(e) => setFilters({...filters, unit: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todas usinas</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select 
            value={filters.equipment} 
            onChange={(e) => setFilters({...filters, equipment: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos equipamentos</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select 
            value={filters.plate} 
            onChange={(e) => setFilters({...filters, plate: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todas placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
             value={filters.driver} 
             onChange={(e) => setFilters({...filters, driver: e.target.value})}
             className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
           >
             <option value="">Todos motoristas</option>
             {drivers.map(d => <option key={d} value={d}>{d}</option>)}
           </select>
        </div>

        <p className="text-slate-500 mb-6">Total de {filtered.length} registros</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-amber-900 text-sm font-medium mb-2">Total Litros</p>
          <p className="text-3xl font-bold text-amber-900">{(totalLiters).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-slate-600 text-sm font-medium mb-2">Total Km</p>
          <p className="text-3xl font-bold text-slate-800">{(totalKm).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-slate-600 text-sm font-medium mb-2">Custo Total</p>
          <p className="text-3xl font-bold text-slate-800">R$ {(totalCost).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-blue-900 text-sm font-medium mb-2">Total M³ Betoneira</p>
          <p className="text-3xl font-bold text-blue-900">{(totalM3Betoneira).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-green-900 text-sm font-medium mb-2">Total M³ Bomba Lança</p>
          <p className="text-3xl font-bold text-green-900">{(totalM3BombaLanca).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-0 shadow-lg p-6">
          <p className="text-purple-900 text-sm font-medium mb-2">Total M³ Bomba Est.</p>
          <p className="text-3xl font-bold text-purple-900">{(totalM3BombaEstacionaria).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Chart 1: Monthly - Litros, Km, Custos */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <h3 className="text-slate-800 font-bold mb-6 text-center">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (MÊS)</h3>
        <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 70, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" label={false} />
            <YAxis stroke="#64748b" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="liters" fill={YELLOW} name="Litros" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            </BarChart>
            </ResponsiveContainer>
            </div>

            {/* Chart 2: By Unit - Litros, Km, Custos */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
             <h3 className="text-slate-800 font-bold mb-6 text-center">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (USINAS)</h3>
             <ResponsiveContainer width="100%" height={420}>
             <BarChart data={byUnitData} margin={{ top: 30, right: 30, left: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#64748b" label={false} />
            <YAxis stroke="#64748b" label={false} hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="liters" fill={YELLOW} name="Litros" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={11} fontWeight="700" fill="#1e293b" />
            </Bar>
            </BarChart>
            </ResponsiveContainer>
            </div>

      {/* Chart 3: Km/L by Equipment Type */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg mt-8">
        <h3 className="text-slate-800 font-bold mb-6 text-center">MÉDIAS POR TIPO DE EQUIPAMENTO (KM/LT)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={unitEquipmentArray} margin={{ top: 40, right: 30, left: 30, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={200} stroke="#64748b" />
            <YAxis stroke="#64748b" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[4, 4, 0, 0]} label={<EquipmentKmLtLabel />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 4 & 5: Km per Vehicle and Driver */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
          <h3 className="text-slate-800 font-bold mb-6 text-center">KM PERCORRIDO POR VEÍCULO</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleKmArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
             <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
             <XAxis type="number" stroke="#64748b" />
             <YAxis type="category" hide={true} />
             <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={YELLOW} radius={[0, 4, 4, 0]} label={<HorizontalBarLabel />}>
                <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
              </Bar>
              </BarChart>
              </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
              <h3 className="text-slate-800 font-bold mb-6 text-center">KM PERCORRIDO POR MOTORISTA</h3>
              <ResponsiveContainer width="100%" height={420}>
              <BarChart data={driverKmArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" hide={true} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={YELLOW} radius={[0, 4, 4, 0]} label={<HorizontalBarLabel />}>
                <LabelList dataKey="driver" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
              </Bar>
              </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 6 & 7: Km/L per Vehicle and Driver */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
          <h3 className="text-slate-800 font-bold mb-6 text-center">KM/LITRO POR VEÍCULO</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleKmLiterArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" hide={true} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[0, 4, 4, 0]} label={<VehicleKmLiterLabel />}>
                 <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
                </Bar>
                </BarChart>
                </ResponsiveContainer>
                </div>

                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
                <h3 className="text-slate-800 font-bold mb-6 text-center">KM/LITRO POR MOTORISTA</h3>
                <ResponsiveContainer width="100%" height={420}>
                <BarChart data={driverKmLiterArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
                 <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
                 <XAxis type="number" stroke="#64748b" />
                 <YAxis type="category" hide={true} />
                 <Tooltip content={<CustomTooltip />} />
                 <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[0, 4, 4, 0]} label={<VehicleKmLiterLabel />}>
                  <LabelList dataKey="driver" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
                 </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 8 & 9: R$/Km per Vehicle and Driver */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
          <h3 className="text-slate-800 font-bold mb-6 text-center">R$/KM POR VEÍCULO</h3>
            <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleCostArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" hide={true} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={YELLOW} radius={[0, 4, 4, 0]} label={<CostPerKmLabel />}>
                 <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
               </Bar>
               </BarChart>
               </ResponsiveContainer>
               </div>

               <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
               <h3 className="text-slate-800 font-bold mb-6 text-center">R$/KM POR MOTORISTA</h3>
               <ResponsiveContainer width="100%" height={420}>
               <BarChart data={driverCostArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis type="category" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="costPerKm" fill={YELLOW} radius={[0, 4, 4, 0]} label={<CostPerKmLabel />}>
                 <LabelList dataKey="driver" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
                </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 10: Production by Equipment */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <h3 className="text-slate-800 font-bold mb-6 text-center">PRODUÇÃO POR TIPO DE EQUIPAMENTO (M³)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={equipmentArray} margin={{ top: 30, right: 50, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#64748b" />
            <YAxis stroke="#64748b" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="m3" fill={YELLOW} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="m3" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + ' M³' : value} fontSize={11} fill="#1e293b" fontWeight="600" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 11: Equipment Averages */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <h3 className="text-slate-800 font-bold mb-6 text-center">MÉDIAS POR EQUIPAMENTO (LT/M³ - R$/M³)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={equipmentArray} margin={{ top: 30, right: 30, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#64748b" />
            <YAxis stroke="#64748b" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="litersPerM3" fill={YELLOW} name="LT/M³" radius={[4, 4, 0, 0]} label={<LitersPerM3Label />} />
            <Bar dataKey="costPerM3" fill={GRAY} name="R$/M³" radius={[4, 4, 0, 0]} label={<CostPerM3Label />} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}