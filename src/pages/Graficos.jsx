import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

const YELLOW = '#F59E0B';
const BLUE = '#3B82F6';
const GREEN = '#10B981';
const PURPLE = '#8B5CF6';

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
  const [filters, setFilters] = useState({ month: '', equipment: '', unit: '', plate: '', driver: '' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 2000)
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const months = [...new Set(records.map(r => r.date ? new Date(r.date).getMonth() : null))].filter(m => m !== null).sort();
  const equipment = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  const filteredRecords = records.filter(r => {
    if (filters.month && new Date(r.date).getMonth() !== parseInt(filters.month)) return false;
    if (filters.equipment && r.vehicle_type !== filters.equipment) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  });

  const totalLiters = filteredRecords.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalKm = filteredRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0);
  const totalM3 = filteredRecords.reduce((sum, r) => sum + (r.cubic_meters || 0), 0);

  // Monthly data
  const monthlyData = {};
  filteredRecords.forEach(r => {
    const monthName = monthNames[new Date(r.date).getMonth()];
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
    const unitRecords = filteredRecords.filter(r => r.unit === unit);
    return {
      name: unit,
      liters: unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0),
      km: unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0),
      cost: unitRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
      kmPerLiter: unitRecords.length > 0 ? (unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0) / unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0)) : 0
    };
  })
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  // By equipment
  const byEquipmentData = {};
  filteredRecords.forEach(r => {
    if (!byEquipmentData[r.vehicle_type]) {
      byEquipmentData[r.vehicle_type] = { liters: 0, km: 0, cost: 0, m3: 0 };
    }
    byEquipmentData[r.vehicle_type].liters += r.liters || 0;
    byEquipmentData[r.vehicle_type].km += r.km_driven || 0;
    byEquipmentData[r.vehicle_type].cost += r.cost || 0;
    byEquipmentData[r.vehicle_type].m3 += r.cubic_meters || 0;
  });
  const equipmentArray = Object.entries(byEquipmentData)
    .map(([type, data]) => ({
      name: type,
      m3: data.m3,
      litersPerM3: data.m3 > 0 ? (data.liters / data.m3).toFixed(2) : 0,
      costPerM3: data.m3 > 0 ? (data.cost / data.m3).toFixed(2) : 0
    }))
    .filter(d => d.m3 > 0)
    .sort((a, b) => b.m3 - a.m3);

  // By vehicle
  const byVehicleData = {};
  filteredRecords.forEach(r => {
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
  filteredRecords.forEach(r => {
    if (!byDriverData[r.driver]) {
      byDriverData[r.driver] = { liters: 0, km: 0, cost: 0 };
    }
    byDriverData[r.driver].liters += r.liters || 0;
    byDriverData[r.driver].km += r.km_driven || 0;
    byDriverData[r.driver].cost += r.cost || 0;
  });
  const driverKmArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      km: data.km,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .filter(d => d.km > 0)
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  const driverKmLiterArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
    }))
    .filter(d => d.kmPerLiter > 0)
    .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
    .slice(0, 15);

  const driverCostArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0,
    }))
    .filter(d => d.costPerKm > 0)
    .sort((a, b) => b.costPerKm - a.costPerKm)
    .slice(0, 15);

  if (isLoading) return <div className="text-white text-center py-12">Carregando dados...</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-8 space-y-8">
      {/* Header com Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Análise de Combustível</h1>
          <p className="text-gray-500 text-sm mt-1">Fechamento Médias Diesel 2026</p>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Mês</label>
            <select value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Tipo</label>
            <select value={filters.equipment} onChange={(e) => setFilters({...filters, equipment: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              {equipment.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Usina</label>
            <select value={filters.unit} onChange={(e) => setFilters({...filters, unit: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Placa</label>
            <select value={filters.plate} onChange={(e) => setFilters({...filters, plate: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              {plates.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Motorista</label>
            <select value={filters.driver} onChange={(e) => setFilters({...filters, driver: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              {drivers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 font-semibold">Total Litros</p>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-blue-600">⛽</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalLiters).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 font-semibold">Total Km</p>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-green-600">🛣️</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalKm).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 font-semibold">Custo Total</p>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-purple-600">💰</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ {(totalCost).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 font-semibold">Total M³</p>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-orange-600">📦</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalM3).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Chart 1: Monthly */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-8 text-sm tracking-widest text-gray-700">LITROS - QUILOMETROS - CUSTOS (MÊS)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 30, right: 80, left: 70, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={false} opacity={0.6} />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12, fontWeight: 500 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="liters" fill={BLUE} name="Litros" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="liters" position="top" content={<CustomLabel />} />
            </Bar>
            <Bar yAxisId="left" dataKey="km" fill={GREEN} name="Km" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="km" position="top" content={<CustomLabel />} />
            </Bar>
            <Bar yAxisId="right" dataKey="cost" fill={YELLOW} name="Custo (R$)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="cost" position="top" content={<CustomLabel />} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: By Unit */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-8 text-sm tracking-widest text-gray-700">LITROS - QUILOMETROS - CUSTOS (USINAS)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={byUnitData} margin={{ top: 30, right: 80, left: 120, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={false} opacity={0.6} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#6b7280" tick={{ fontSize: 11, fontWeight: 500 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="liters" fill={BLUE} name="Litros" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="km" fill={GREEN} name="Km" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="cost" fill={YELLOW} name="Custo (R$)" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: Km/L by Unit */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-8 text-sm tracking-widest text-gray-700">MÉDIAS KM/LT (USINAS E EQUIPAMENTOS)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={byUnitData} margin={{ top: 30, right: 50, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={false} opacity={0.6} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#6b7280" tick={{ fontSize: 11, fontWeight: 500 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="kmPerLiter" fill={BLUE} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="kmPerLiter" position="top" content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 4 & 5: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Km per Vehicle */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">KM PERCORRIDO POR VEÍCULO (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={vehicleKmArray} layout="vertical" margin={{ top: 10, right: 50, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={BLUE} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="km" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Km per Driver */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">KM PERCORRIDO POR MOTORISTA (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={driverKmArray} layout="vertical" margin={{ top: 10, right: 50, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={BLUE} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="km" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 6 & 7: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Km/L per Vehicle */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">KM/LITRO POR VEÍCULO (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={vehicleKmLiterArray} layout="vertical" margin={{ top: 10, right: 50, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={BLUE} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="kmPerLiter" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Km/L per Driver */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">KM/LITRO POR MOTORISTA (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={driverKmLiterArray} layout="vertical" margin={{ top: 10, right: 50, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={BLUE} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="kmPerLiter" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 8 & 9: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* R$/Km per Vehicle */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">R$/KM POR VEÍCULO (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={vehicleCostArray} layout="vertical" margin={{ top: 10, right: 50, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={YELLOW} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="costPerKm" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* R$/Km per Driver */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-6 text-sm tracking-widest text-gray-700">R$/KM POR MOTORISTA (TOP 15)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={driverCostArray} layout="vertical" margin={{ top: 10, right: 50, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={true} opacity={0.4} />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={YELLOW} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="costPerKm" position="right" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 10: Production by Equipment */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-8 text-sm tracking-widest text-gray-700">PRODUÇÃO POR EQUIPAMENTO (M³)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={equipmentArray} margin={{ top: 30, right: 50, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={false} opacity={0.6} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#6b7280" tick={{ fontSize: 11, fontWeight: 500 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="m3" fill={GREEN} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="m3" position="top" content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 11: Equipment Averages */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-8 text-sm tracking-widest text-gray-700">MÉDIAS POR EQUIPAMENTO (LT/M³ - R$/M³)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={equipmentArray} margin={{ top: 30, right: 80, left: 70, bottom: 100 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d1d5db" vertical={false} opacity={0.6} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} stroke="#6b7280" tick={{ fontSize: 11, fontWeight: 500 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="litersPerM3" fill={GREEN} name="LT/M³" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="litersPerM3" position="top" content={<CustomLabel />} />
            </Bar>
            <Bar yAxisId="right" dataKey="costPerM3" fill={YELLOW} name="R$/M³" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="costPerM3" position="top" content={<CustomLabel />} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}