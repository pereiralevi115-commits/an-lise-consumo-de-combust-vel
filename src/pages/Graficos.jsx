import React, { useState, useMemo } from 'react';
      import { base44 } from '@/api/base44Client';
      import { useQuery, useQueryClient } from '@tanstack/react-query';
      import { ComposedChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
      import { parseISO } from 'date-fns';
      

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

        const { data: records = [], isLoading } = useQuery({
          queryKey: ['fuelRecords'],
          queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
        });

        const { data: cubicMetros = [] } = useQuery({
          queryKey: ['cubicMetros'],
          queryFn: () => base44.entities.CubicMetros.list()
        });

        const { data: motoristas = [] } = useQuery({
          queryKey: ['Motorista'],
          queryFn: () => base44.entities.Motorista.list()
        });

        const { data: pontos = [] } = useQuery({
          queryKey: ['Ponto'],
          queryFn: () => base44.entities.Ponto.list()
        });

        const { data: placaEquipamentos = [] } = useQuery({
          queryKey: ['PlacaEquipamento'],
          queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
        });

        const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
        const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
        const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Compute analysisData like AnalisePorPlaca does
  const analysisData = useMemo(() => {
    const groupedData = {};
    
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      
      const month = parseISO(r.date).getMonth();
      const year = parseISO(r.date).getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const plateKey = r.vehicle_plate.toUpperCase();
      const groupKey = `${monthKey}-${plateKey}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          month: monthNames[month],
          year: year,
          monthKey: monthKey,
          plate: r.vehicle_plate,
          unit: r.unit,
          equipment: placaEquipamentosMap[plateKey] || r.vehicle_type || '',
          vehicle_type: r.vehicle_type,
          driver: r.driver,
          totalLiters: 0,
          kmRecords: [],
          cost: 0,
          fuelRecordM3: 0
        };
      }

      groupedData[groupKey].totalLiters += r.liters || 0;
      groupedData[groupKey].cost += r.cost || 0;
      groupedData[groupKey].fuelRecordM3 += r.cubic_meters || 0;
      if (Number(r.km_driven) > 0) {
        groupedData[groupKey].kmRecords.push(Number(r.km_driven));
      }
    });

    return Object.values(groupedData).map(item => {
      const kmDelta = item.kmRecords.length > 0 
        ? Math.max(...item.kmRecords) - Math.min(...item.kmRecords)
        : 0;

      const m3Data = cubicMetros.find(cm => 
        String(cm.placa).toUpperCase() === String(item.plate).toUpperCase() && 
        cm.mes === item.monthKey
      );
      const m3 = m3Data ? Number(m3Data.metros_cubicos) : 0;

      return {
        month: item.month,
        monthKey: item.monthKey,
        year: item.year,
        plate: item.plate,
        unit: pontosMap[String(item.unit)] || item.unit || '-',
        equipment: item.equipment || '-',
        vehicle_type: item.vehicle_type,
        driver: motoristasMap[String(item.driver)] || item.driver || '-',
        totalLiters: item.totalLiters,
        kmDelta: kmDelta,
        m3: m3,
        cost: item.cost,
        efficiency: item.totalLiters > 0 ? (kmDelta / item.totalLiters).toFixed(2) : 0
      };
    });
  }, [records, cubicMetros, placaEquipamentosMap, motoristasMap, pontosMap, monthNames]);
  
  // Get unique filter values
  const years = [...new Set(analysisData.map(d => d.year))].sort((a, b) => b - a);
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const units = [...new Set(analysisData.map(d => d.unit))].filter(Boolean).sort();
  const equipments = [...new Set(analysisData.map(d => d.equipment))].filter(Boolean).sort();
  const plates = [...new Set(analysisData.map(d => d.plate))].filter(Boolean).sort();
  const drivers = [...new Set(analysisData.map(d => d.driver))].filter(Boolean).sort();

  // Apply filters to analysisData
  const filtered = analysisData.filter(d => {
    if (filters.year && d.year !== parseInt(filters.year)) return false;
    if (filters.month && monthNames[parseInt(filters.month)] !== d.month) return false;
    if (filters.unit && d.unit !== filters.unit) return false;
    if (filters.equipment && d.equipment !== filters.equipment) return false;
    if (filters.plate && d.plate !== filters.plate) return false;
    if (filters.driver && d.driver !== filters.driver) return false;
    return true;
  });

  const totalLiters = filtered.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
  const totalCost = filtered.reduce((sum, d) => sum + (d.cost || 0), 0);
  const totalM3 = filtered.filter(d => d.vehicle_type === 'CAMINHÃO BETONEIRA').reduce((sum, d) => sum + (d.m3 || 0), 0);
  const totalKm = filtered.reduce((sum, d) => sum + (d.kmDelta || 0), 0);

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

  // By equipment - agregado de analysisData
  const byEquipmentData = {};
  filtered.forEach(d => {
    const eqType = d.vehicle_type;
    if (!byEquipmentData[eqType]) {
      byEquipmentData[eqType] = { liters: 0, cost: 0, m3: 0, km: 0 };
    }
    byEquipmentData[eqType].liters += d.totalLiters || 0;
    byEquipmentData[eqType].cost += d.cost || 0;
    byEquipmentData[eqType].m3 += d.m3 || 0;
    byEquipmentData[eqType].km += d.kmDelta || 0;
  });

  const equipmentTypes = ['BOMBA ESTACIONÁRIA', 'BOMBA LANÇA', 'CAMINHÃO BASCULANTE', 'CAMINHÃO BETONEIRA'];
  const unitEquipmentArray = equipmentTypes
    .map(type => {
      const data = byEquipmentData[type] || { liters: 0, km: 0 };
      return {
        name: type,
        kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0
      };
    })
    .sort((a, b) => parseFloat(a.kmPerLiter) - parseFloat(b.kmPerLiter));

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
        fill="#ffffff"
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
        fill="#ffffff"
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
        fill="#ffffff"
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
        fill="#ffffff"
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
        fill="#ffffff"
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
        fill="#ffffff"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        {typeof value === 'number' ? value.toFixed(2) : value} R$/Km
      </text>
    );
  };

  // By vehicle - agregado de analysisData
  const byVehicleData = {};
  filtered.forEach(d => {
    if (!byVehicleData[d.plate]) {
      byVehicleData[d.plate] = { liters: 0, km: 0, cost: 0 };
    }
    byVehicleData[d.plate].liters += d.totalLiters || 0;
    byVehicleData[d.plate].km += d.kmDelta || 0;
    byVehicleData[d.plate].cost += d.cost || 0;
  });
  const vehicleKmArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      km: data.km,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .filter(d => d.km > 0)
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  const vehicleKmLiterArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
    }))
    .filter(d => d.kmPerLiter > 0)
    .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
    .slice(0, 15);

  const vehicleCostArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0,
    }))
    .filter(d => d.costPerKm > 0)
    .sort((a, b) => b.costPerKm - a.costPerKm)
    .slice(0, 15);

  // By driver - agregado de analysisData
  const byDriverData = {};
  filtered.forEach(d => {
    if (!byDriverData[d.driver]) {
      byDriverData[d.driver] = { liters: 0, km: 0, cost: 0 };
    }
    byDriverData[d.driver].liters += d.totalLiters || 0;
    byDriverData[d.driver].km += d.kmDelta || 0;
    byDriverData[d.driver].cost += d.cost || 0;
  });
  const driverKmArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver: getFirstAndLastName(driver),
      km: data.km,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .filter(d => d.km > 0)
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  const driverKmLiterArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver: getFirstAndLastName(driver),
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
    }))
    .filter(d => d.kmPerLiter > 0)
    .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
    .slice(0, 15);

  const driverCostArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver: getFirstAndLastName(driver),
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0,
    }))
    .filter(d => d.costPerKm > 0)
    .sort((a, b) => b.costPerKm - a.costPerKm)
    .slice(0, 15);

  if (isLoading) return <div className="text-white text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gráficos de Combustível</h1>
          <select 
            value={filters.year} 
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
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
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.unit} 
            onChange={(e) => setFilters({...filters, unit: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todas usinas</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select 
            value={filters.equipment} 
            onChange={(e) => setFilters({...filters, equipment: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos equipamentos</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select 
            value={filters.plate} 
            onChange={(e) => setFilters({...filters, plate: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todas placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
             value={filters.driver} 
             onChange={(e) => setFilters({...filters, driver: e.target.value})}
             className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
           >
             <option value="">Todos motoristas</option>
             {drivers.map(d => <option key={d} value={d}>{d}</option>)}
           </select>
        </div>

        <p className="text-slate-400 mb-6">Total de {filtered.length} registros</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-400 text-sm mb-2">Total Litros</p>
          <p className="text-2xl font-bold text-white">{(totalLiters).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-400 text-sm mb-2">Total Km</p>
          <p className="text-2xl font-bold text-white">{(totalKm).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-400 text-sm mb-2">Custo Total</p>
          <p className="text-2xl font-bold text-white">R$ {(totalCost).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-400 text-sm mb-2">Total M³</p>
          <p className="text-2xl font-bold text-white">{(totalM3).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Chart 1: Monthly - Litros, Km, Custos */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 -mx-6">
        <h3 className="text-white font-bold mb-6 text-center">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (MÊS)</h3>
        <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 70, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" label={false} />
            <YAxis stroke="#94a3b8" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="liters" fill={YELLOW} name="Litros" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            </BarChart>
            </ResponsiveContainer>
            </div>

            {/* Chart 2: By Unit - Litros, Km, Custos */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 -mx-6">
             <h3 className="text-white font-bold mb-6 text-center">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (USINAS)</h3>
             <ResponsiveContainer width="100%" height={420}>
             <BarChart data={byUnitData} margin={{ top: 30, right: 30, left: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#94a3b8" label={false} />
            <YAxis stroke="#94a3b8" label={false} hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="liters" fill={YELLOW} name="Litros" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={11} fontWeight="700" fill="#ffffff" />
            </Bar>
            </BarChart>
            </ResponsiveContainer>
            </div>

      {/* Chart 3: Km/L by Equipment Type */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 -mx-6 mt-8">
        <h3 className="text-white font-bold mb-6 text-center">MÉDIAS POR TIPO DE EQUIPAMENTO (KM/LT)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={unitEquipmentArray} margin={{ top: 40, right: 30, left: 30, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={200} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[4, 4, 0, 0]} label={<EquipmentKmLtLabel />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 4 & 5: Km per Vehicle and Driver */}
      <div className="grid grid-cols-2 gap-6 -mx-6">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold mb-6 text-center">KM PERCORRIDO POR VEÍCULO</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleKmArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
             <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
             <XAxis type="number" stroke="#94a3b8" />
             <YAxis type="category" hide={true} />
             <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={YELLOW} radius={[0, 4, 4, 0]} label={<HorizontalBarLabel />}>
                <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
              </Bar>
              </BarChart>
              </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
              <h3 className="text-white font-bold mb-6 text-center">KM PERCORRIDO POR MOTORISTA</h3>
              <ResponsiveContainer width="100%" height={420}>
              <BarChart data={driverKmArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
              <XAxis type="number" stroke="#94a3b8" />
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
      <div className="grid grid-cols-2 gap-6 -mx-6">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold mb-6 text-center">KM/LITRO POR VEÍCULO</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleKmLiterArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis type="category" hide={true} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[0, 4, 4, 0]} label={<VehicleKmLiterLabel />}>
                 <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
                </Bar>
                </BarChart>
                </ResponsiveContainer>
                </div>

                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                <h3 className="text-white font-bold mb-6 text-center">KM/LITRO POR MOTORISTA</h3>
                <ResponsiveContainer width="100%" height={420}>
                <BarChart data={driverKmLiterArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
                 <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
                 <XAxis type="number" stroke="#94a3b8" />
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
      <div className="grid grid-cols-2 gap-6 -mx-6">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
          <h3 className="text-white font-bold mb-6 text-center">R$/KM POR VEÍCULO</h3>
            <ResponsiveContainer width="100%" height={420}>
            <BarChart data={vehicleCostArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis type="category" hide={true} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={YELLOW} radius={[0, 4, 4, 0]} label={<CostPerKmLabel />}>
                 <LabelList dataKey="placa" position="insideLeft" fill="#000000" fontSize={10} fontWeight="600" />
               </Bar>
               </BarChart>
               </ResponsiveContainer>
               </div>

               <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
               <h3 className="text-white font-bold mb-6 text-center">R$/KM POR MOTORISTA</h3>
               <ResponsiveContainer width="100%" height={420}>
               <BarChart data={driverCostArray} layout="vertical" margin={{ top: 10, right: 100, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={true} />
                <XAxis type="number" stroke="#94a3b8" />
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
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 -mx-6">
        <h3 className="text-white font-bold mb-6 text-center">PRODUÇÃO POR TIPO DE EQUIPAMENTO (M³)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={equipmentArray} margin={{ top: 30, right: 50, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="m3" fill={YELLOW} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="m3" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + ' M³' : value} fontSize={11} fill="#ffffff" fontWeight="600" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 11: Equipment Averages */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 -mx-6">
        <h3 className="text-white font-bold mb-6 text-center">MÉDIAS POR EQUIPAMENTO (LT/M³ - R$/M³)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={equipmentArray} margin={{ top: 30, right: 30, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#475569" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" hide={true} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="litersPerM3" fill={YELLOW} name="LT/M³" radius={[4, 4, 0, 0]} label={<LitersPerM3Label />} />
            <Bar dataKey="costPerM3" fill={GRAY} name="R$/M³" radius={[4, 4, 0, 0]} label={<CostPerM3Label />} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}