import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const YELLOW = '#FCD34D';
const GRAY = '#9CA3AF';
const ORANGE = '#F59E0B';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded p-2">
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
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
  const chartData = Object.values(monthlyData).sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

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
  }).sort((a, b) => b.cost - a.cost);

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
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  const vehicleKmLiterArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
    }))
    .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
    .slice(0, 15);

  const vehicleCostArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0,
    }))
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
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  const driverKmLiterArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
    }))
    .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
    .slice(0, 15);

  const driverCostArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0,
    }))
    .sort((a, b) => b.costPerKm - a.costPerKm)
    .slice(0, 15);

  if (isLoading) return <div className="text-white text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-8">
      {/* Header com Filtros */}
      <div className="bg-gradient-to-r from-yellow-300 to-yellow-200 p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Fechamento Médias Diesel 2026</h1>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">MÊS</label>
            <select value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Todos</option>
              {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">TIPO</label>
            <select value={filters.equipment} onChange={(e) => setFilters({...filters, equipment: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Todos</option>
              {equipment.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">USINA</label>
            <select value={filters.unit} onChange={(e) => setFilters({...filters, unit: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Todos</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">PLACA</label>
            <select value={filters.plate} onChange={(e) => setFilters({...filters, plate: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Todos</option>
              {plates.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">MOTORISTA</label>
            <select value={filters.driver} onChange={(e) => setFilters({...filters, driver: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Todos</option>
              {drivers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 bg-white p-6 rounded-lg shadow-sm">
        <div className="text-center p-4 border-r border-gray-200">
          <p className="text-sm text-gray-600 font-semibold mb-1">Total Litros</p>
          <p className="text-2xl font-bold text-gray-900">{(totalLiters).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="text-center p-4 border-r border-gray-200">
          <p className="text-sm text-gray-600 font-semibold mb-1">Total Km</p>
          <p className="text-2xl font-bold text-gray-900">{(totalKm).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="text-center p-4 border-r border-gray-200">
          <p className="text-sm text-gray-600 font-semibold mb-1">Custo Total</p>
          <p className="text-2xl font-bold text-gray-900">R$ {(totalCost).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="text-center p-4">
          <p className="text-sm text-gray-600 font-semibold mb-1">Total M³</p>
          <p className="text-2xl font-bold text-gray-900">{(totalM3).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Chart 1: Monthly */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-center font-bold text-gray-900 mb-6 text-base">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (MÊS)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 60, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="liters" fill={YELLOW} name="Litros" />
            <Bar yAxisId="left" dataKey="km" fill={GRAY} name="Km" />
            <Bar yAxisId="right" dataKey="cost" fill={ORANGE} name="Custo (R$)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: By Unit */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-center font-bold text-gray-900 mb-6 text-base">LITROS ABASTECIDOS - QUILOMETROS PERCORRIDOS - CUSTOS DOS ABASTECIMENTOS (USINAS)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={byUnitData} margin={{ top: 20, right: 40, left: 120, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="liters" fill={YELLOW} name="Litros" />
            <Bar yAxisId="left" dataKey="km" fill={GRAY} name="Km" />
            <Bar yAxisId="right" dataKey="cost" fill={ORANGE} name="Custo (R$)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: Km/L by Unit */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-center font-bold text-gray-900 mb-6 text-base">MÉDIAS POR USINA E TIPO DE EQUIPAMENTO (KM/LT)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byUnitData} margin={{ top: 20, right: 40, left: 80, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="kmPerLiter" fill={YELLOW} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 4 & 5: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Km per Vehicle */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">KM PERCORRIDO POR VEÍCULO</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleKmArray} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={YELLOW} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Km per Driver */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">KM PERCORRIDO POR MOTORISTA</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverKmArray} layout="vertical" margin={{ top: 10, right: 30, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="km" fill={YELLOW} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 6 & 7: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Km/L per Vehicle */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">KM/LITRO POR VEÍCULO</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleKmLiterArray} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={YELLOW} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Km/L per Driver */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">KM/LITRO POR MOTORISTA</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverKmLiterArray} layout="vertical" margin={{ top: 10, right: 30, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kmPerLiter" fill={YELLOW} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts 8 & 9: Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* R$/Km per Vehicle */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">R$/KM POR VEÍCULO</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleCostArray} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="placa" type="category" width={85} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={ORANGE} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* R$/Km per Driver */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-center font-bold text-gray-900 mb-4 text-sm">R$/KM POR MOTORISTA</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverCostArray} layout="vertical" margin={{ top: 10, right: 30, left: 150, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="driver" type="category" width={140} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerKm" fill={ORANGE} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 10: Production by Equipment */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-center font-bold text-gray-900 mb-6 text-base">PRODUÇÃO POR TIPO DE EQUIPAMENTO (M³)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={equipmentArray} margin={{ top: 20, right: 40, left: 80, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="m3" fill={YELLOW} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 11: Equipment Averages */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-center font-bold text-gray-900 mb-6 text-base">MÉDIAS POR EQUIPAMENTO (LT/M³ - R$/M³)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={equipmentArray} margin={{ top: 20, right: 40, left: 80, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="litersPerM3" fill={YELLOW} name="LT/M³" />
            <Bar yAxisId="right" dataKey="costPerM3" fill={ORANGE} name="R$/M³" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}