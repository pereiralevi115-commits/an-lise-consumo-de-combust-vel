import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Fuel, DollarSign, Gauge } from 'lucide-react';
import { ComposedChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const YELLOW = '#FCD34D';
const GRAY = '#9CA3AF';
const ORANGE = '#F59E0B';
const BLUE = '#60A5FA';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR', {maximumFractionDigits: 2}) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatCurrency = (value) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
};

const formatNumber = (value) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toLocaleString('pt-BR', {maximumFractionDigits: 1});
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

  // By unit data
  const byUnitData = units.map(unit => {
    const unitRecords = filteredRecords.filter(r => r.unit === unit);
    return {
      name: unit,
      liters: unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0),
      km: unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0),
      cost: unitRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
      m3: unitRecords.reduce((sum, r) => sum + (r.cubic_meters || 0), 0),
      kmPerLiter: unitRecords.length > 0 ? (unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0) / unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0)) : 0
    };
  }).sort((a, b) => b.cost - a.cost);

  // By equipment type
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
  const vehicleArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      km: data.km,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .sort((a, b) => b.km - a.km)
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
  const driverArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      km: data.km,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .sort((a, b) => b.km - a.km)
    .slice(0, 15);

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold text-white mb-2">Fechamento Médias Diesel 2026</h1>
        <p className="text-slate-400">Análise Completa de Combustível e Desempenho</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          { value: filters.month, onChange: (e) => setFilters({...filters, month: e.target.value}), label: 'Mês', options: months.map(m => ({ value: m, label: monthNames[m] })) },
          { value: filters.equipment, onChange: (e) => setFilters({...filters, equipment: e.target.value}), label: 'Equipamento', options: equipment.map(e => ({ value: e, label: e })) },
          { value: filters.unit, onChange: (e) => setFilters({...filters, unit: e.target.value}), label: 'Usina', options: units.map(u => ({ value: u, label: u })) },
          { value: filters.plate, onChange: (e) => setFilters({...filters, plate: e.target.value}), label: 'Placa', options: plates.map(p => ({ value: p, label: p })) },
          { value: filters.driver, onChange: (e) => setFilters({...filters, driver: e.target.value}), label: 'Motorista', options: drivers.map(d => ({ value: d, label: d })) }
        ].map((filter, idx) => (
          <select key={idx} value={filter.value} onChange={filter.onChange} className="bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500">
            <option value="">Todos {filter.label.toLowerCase()}s</option>
            {filter.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-300">Total Litros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{formatNumber(totalLiters)}</p>
            <p className="text-xs text-slate-500 mt-1">L</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-300">Total Km</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{formatNumber(totalKm)}</p>
            <p className="text-xs text-slate-500 mt-1">km</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-300">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">R$ {formatCurrency(totalCost)}</p>
            <p className="text-xs text-slate-500 mt-1">Gasto total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-300">Total M³</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">{formatNumber(totalM3)}</p>
            <p className="text-xs text-slate-500 mt-1">m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Chart 1: Monthly */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Litros, Km, Custos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 30, right: 50, left: 80, bottom: 20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="liters" fill={YELLOW} name="Litros" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="left" dataKey="km" fill={GRAY} name="Km" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="cost" fill={ORANGE} name="Custo (R$)" radius={[8, 8, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: By Unit */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Litros, Km, Custos por Usina</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={450}>
              <ComposedChart data={byUnitData} margin={{ top: 30, right: 50, left: 150, bottom: 80 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="liters" fill={YELLOW} name="Litros" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="left" dataKey="km" fill={GRAY} name="Km" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="cost" fill={ORANGE} name="Custo (R$)" radius={[8, 8, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Km/L by Unit */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Média Km/L por Usina</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={byUnitData} margin={{ top: 30, right: 50, left: 80, bottom: 80 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={YELLOW} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Production by Equipment */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Produção por Tipo de Equipamento (M³)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={equipmentArray} margin={{ top: 30, right: 50, left: 80, bottom: 80 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="m3" fill={YELLOW} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 5: Km per Vehicle (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Km Percorrido por Veículo (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vehicleArray} layout="vertical" margin={{ top: 10, right: 50, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="placa" type="category" width={90} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="km" fill={YELLOW} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 6: Km per Driver (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Km Percorrido por Motorista (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={driverArray} layout="vertical" margin={{ top: 10, right: 50, left: 180, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="driver" type="category" width={170} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="km" fill={YELLOW} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 7: Km/L per Vehicle (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">KM/LITRO por Veículo (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vehicleArray} layout="vertical" margin={{ top: 10, right: 50, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="placa" type="category" width={90} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={BLUE} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 8: Km/L per Driver (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">KM/LITRO por Motorista (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={driverArray} layout="vertical" margin={{ top: 10, right: 50, left: 180, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="driver" type="category" width={170} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={BLUE} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 9: R$/Km per Vehicle (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">R$/KM por Veículo (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vehicleArray} layout="vertical" margin={{ top: 10, right: 50, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="placa" type="category" width={90} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="costPerKm" fill={ORANGE} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 10: R$/Km per Driver (Top 15) */}
        <Card className="bg-slate-800 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-lg font-semibold text-white">R$/KM por Motorista (Top 15)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={driverArray} layout="vertical" margin={{ top: 10, right: 50, left: 180, bottom: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#475569" opacity={0.3} vertical={true} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis dataKey="driver" type="category" width={170} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="costPerKm" fill={ORANGE} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}