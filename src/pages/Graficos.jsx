import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
    month: '',
    type: '',
    unit: '',
    plate: '',
    driver: ''
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Get unique filter values
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort();
  const types = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  // Apply filters
  const filtered = records.filter(r => {
    if (filters.month && parseISO(r.date).getMonth() !== parseInt(filters.month)) return false;
    if (filters.type && r.vehicle_type !== filters.type) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  });

  const totalLiters = filtered.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = filtered.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalKm = filtered.reduce((sum, r) => sum + (r.km_driven || 0), 0);
  const totalM3 = filtered.reduce((sum, r) => sum + (r.cubic_meters || 0), 0);

  // Monthly data
  const monthlyData = {};
  filtered.forEach(r => {
    const monthName = monthNames[parseISO(r.date).getMonth()];
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { name: monthName, liters: 0, km: 0, cost: 0 };
    }
    monthlyData[monthName].liters += r.liters || 0;
    monthlyData[monthName].km += r.km_driven || 0;
    monthlyData[monthName].cost += r.cost || 0;
  });
  const chartData = Object.values(monthlyData)
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

  // By unit
  const byUnitData = units.map(unit => {
    const unitRecords = filtered.filter(r => r.unit === unit);
    return {
      name: unit.replace('CONCRETAR ', ''),
      liters: unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0),
      km: unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0),
      cost: unitRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
      kmPerLiter: unitRecords.length > 0 ? (unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0) / unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0)) : 0
    };
  })
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  // By equipment
  const byEquipmentData = {};
  filtered.forEach(r => {
    if (!byEquipmentData[r.vehicle_type]) {
      byEquipmentData[r.vehicle_type] = { liters: 0, km: 0, cost: 0, m3: 0 };
    }
    byEquipmentData[r.vehicle_type].liters += r.liters || 0;
    byEquipmentData[r.vehicle_type].km += r.km_driven || 0;
    byEquipmentData[r.vehicle_type].cost += r.cost || 0;
    byEquipmentData[r.vehicle_type].m3 += r.cubic_meters || 0;
  });

  // By unit and equipment type
  const byUnitAndEquipmentData = {};
  filtered.forEach(r => {
    const key = `${r.unit.replace('CONCRETAR ', '')} - ${r.vehicle_type}`;
    if (!byUnitAndEquipmentData[key]) {
      byUnitAndEquipmentData[key] = { name: key, liters: 0, km: 0, cost: 0 };
    }
    byUnitAndEquipmentData[key].liters += r.liters || 0;
    byUnitAndEquipmentData[key].km += r.km_driven || 0;
    byUnitAndEquipmentData[key].cost += r.cost || 0;
  });
  const unitEquipmentArray = Object.entries(byEquipmentData)
    .map(([type, data]) => ({
      name: type,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0
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

  // By vehicle
  const byVehicleData = {};
  filtered.forEach(r => {
    if (!byVehicleData[r.vehicle_plate]) {
      byVehicleData[r.vehicle_plate] = { liters: 0, km: 0, cost: 0 };
    }
    byVehicleData[r.vehicle_plate].liters += r.liters || 0;
    byVehicleData[r.vehicle_plate].km += r.km_driven || 0;
    byVehicleData[r.vehicle_plate].cost += r.cost || 0;
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

  // By driver
  const byDriverData = {};
  filtered.forEach(r => {
    if (!byDriverData[r.driver]) {
      byDriverData[r.driver] = { liters: 0, km: 0, cost: 0 };
    }
    byDriverData[r.driver].liters += r.liters || 0;
    byDriverData[r.driver].km += r.km_driven || 0;
    byDriverData[r.driver].cost += r.cost || 0;
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
        <h1 className="text-3xl font-bold text-white mb-6">Gráficos de Combustível</h1>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <select 
            value={filters.month} 
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.type} 
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos tipos</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
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
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={8} fill="#ffffff" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={8} fill="#ffffff" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={8} fill="#ffffff" />
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
              <LabelList dataKey="liters" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nL' : value} fontSize={8} fill="#ffffff" />
            </Bar>
            <Bar dataKey="km" fill={BLUE} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nKm' : value} fontSize={8} fill="#ffffff" />
            </Bar>
            <Bar dataKey="cost" fill={GRAY} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + '\nR$' : value} fontSize={8} fill="#ffffff" />
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
                 <LabelList dataKey="placa" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="600" />
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
                 <LabelList dataKey="driver" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="600" />
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