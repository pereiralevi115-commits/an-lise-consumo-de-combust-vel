import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Fuel, DollarSign, Gauge } from 'lucide-react';
import { ComposedChart, Bar, BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function Graficos() {
  const [filters, setFilters] = useState({
    month: '',
    equipment: '',
    unit: '',
    plate: '',
    driver: ''
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 1000)
  });

  // Filter records
  const filteredRecords = records.filter(r => {
    if (filters.month && new Date(r.date).getMonth() !== parseInt(filters.month)) return false;
    if (filters.equipment && r.vehicle_type !== filters.equipment) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const months = [...new Set(records.map(r => r.date ? new Date(r.date).getMonth() : null))].filter(m => m !== null).sort();
  const equipment = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  // Calculate metrics
  const totalLiters = filteredRecords.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalKm = filteredRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0);
  const totalM3 = filteredRecords.reduce((sum, r) => sum + (r.cubic_meters || 0), 0);

  // Monthly data - 3 bars per month (Litros, Km, Custos)
  const monthlyData = {};
  filteredRecords.forEach(r => {
    const date = new Date(r.date);
    const monthKey = date.getMonth();
    const monthName = monthNames[monthKey];

    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { name: monthName, liters: 0, km: 0, cost: 0 };
    }
    monthlyData[monthName].liters += r.liters || 0;
    monthlyData[monthName].km += r.km_driven || 0;
    monthlyData[monthName].cost += r.cost || 0;
  });

  const chartData = Object.values(monthlyData).sort((a, b) => 
    monthNames.indexOf(a.name) - monthNames.indexOf(b.name)
  );

  // By unit data
  const byUnitData = units.map(unit => {
    const unitRecords = filteredRecords.filter(r => r.unit === unit);
    return {
      name: unit,
      liters: unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0),
      km: unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0),
      cost: unitRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
      kmPerLiter: unitRecords.length > 0 
        ? (unitRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0) / 
           unitRecords.reduce((sum, r) => sum + (r.liters || 0), 0)).toFixed(2)
        : 0
    };
  }).sort((a, b) => b.cost - a.cost);

  // By vehicle data
  const byVehicleData = {};
  const byVehicleKmPerLiter = {};
  const byVehicleCostPerKm = {};
  
  filteredRecords.forEach(r => {
    const plate = r.vehicle_plate;
    if (!byVehicleData[plate]) {
      byVehicleData[plate] = { liters: 0, km: 0, cost: 0 };
    }
    byVehicleData[plate].liters += r.liters || 0;
    byVehicleData[plate].km += r.km_driven || 0;
    byVehicleData[plate].cost += r.cost || 0;
  });

  const vehicleArray = Object.entries(byVehicleData)
    .map(([plate, data]) => ({
      placa: plate,
      liters: data.liters,
      km: data.km,
      cost: data.cost,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .sort((a, b) => b.km - a.km);

  // By driver data
  const byDriverData = {};
  filteredRecords.forEach(r => {
    const driver = r.driver;
    if (!byDriverData[driver]) {
      byDriverData[driver] = { liters: 0, km: 0, cost: 0 };
    }
    byDriverData[driver].liters += r.liters || 0;
    byDriverData[driver].km += r.km_driven || 0;
    byDriverData[driver].cost += r.cost || 0;
  });

  const driverArray = Object.entries(byDriverData)
    .map(([driver, data]) => ({
      driver,
      liters: data.liters,
      km: data.km,
      cost: data.cost,
      kmPerLiter: data.liters > 0 ? (data.km / data.liters).toFixed(2) : 0,
      costPerKm: data.km > 0 ? (data.cost / data.km).toFixed(2) : 0
    }))
    .sort((a, b) => b.km - a.km);

  const CustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#1f2937" 
        textAnchor="middle" 
        fontSize="12" 
        fontWeight="bold"
      >
        {typeof value === 'number' ? value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) : value}
      </text>
    );
  };

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white mb-2">Fechamento Médias Diesel 2026</h1>
      <p className="text-slate-400 mb-6">Sistema de Análise de Combustível</p>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <select 
          value={filters.month} 
          onChange={(e) => setFilters({...filters, month: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Todos meses</option>
          {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
        </select>

        <select 
          value={filters.equipment} 
          onChange={(e) => setFilters({...filters, equipment: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Todos equipamentos</option>
          {equipment.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select 
          value={filters.unit} 
          onChange={(e) => setFilters({...filters, unit: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Todas usinas</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select 
          value={filters.plate} 
          onChange={(e) => setFilters({...filters, plate: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Todas placas</option>
          {plates.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select 
          value={filters.driver} 
          onChange={(e) => setFilters({...filters, driver: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Todos motoristas</option>
          {drivers.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-yellow-400" />
              Total Litros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{(totalLiters/1000).toLocaleString('pt-BR', {maximumFractionDigits: 1})}K</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Total Km
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{(totalKm/1000).toLocaleString('pt-BR', {maximumFractionDigits: 1})}K</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-500" />
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">R$ {(totalCost/1000).toLocaleString('pt-BR', {maximumFractionDigits: 0})}K</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              Total M³
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{(totalM3/1000).toLocaleString('pt-BR', {maximumFractionDigits: 1})}K</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {/* Chart 1: Monthly - Litros, Km, Custos */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Litros Abastecidos - Quilômetros Percorridos - Custos dos Abastecimentos (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => value.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                />
                <Bar yAxisId="left" dataKey="liters" fill="#fbbf24" name="Litros" label={<CustomLabel />} />
                <Bar yAxisId="left" dataKey="km" fill="#9ca3af" name="Km" label={<CustomLabel />} />
                <Bar yAxisId="right" dataKey="cost" fill="#f59e0b" name="Custo (R$)" label={<CustomLabel />} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: By Unit - Litros, Km, Custos */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Litros Abastecidos - Quilômetros Percorridos - Custos dos Abastecimentos (Usinas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={byUnitData} margin={{ top: 20, right: 30, left: 150, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                />
                <YAxis yAxisId="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => value.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="liters" fill="#fbbf24" name="Litros" />
                <Bar yAxisId="left" dataKey="km" fill="#9ca3af" name="Km" />
                <Bar yAxisId="right" dataKey="cost" fill="#f59e0b" name="Custo (R$)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Km per Liter by Unit */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Médias por Usina e Tipo de Equipamento (KM/LT)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={byUnitData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => parseFloat(value).toFixed(2) + ' km/lt'}
                />
                <Bar dataKey="kmPerLiter" fill="#fbbf24" name="Km/L" label={<CustomLabel />} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Km per Vehicle */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Km Percorrido por Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={vehicleArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="placa" type="category" stroke="#64748b" width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + ' km'}
                />
                <Bar dataKey="km" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 5: Km per Driver */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Km Percorrido por Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={driverArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="driver" type="category" stroke="#64748b" width={170} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => value.toLocaleString('pt-BR', {maximumFractionDigits: 0}) + ' km'}
                />
                <Bar dataKey="km" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 6: Km/L by Vehicle */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">KM/LITRO por Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={vehicleArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="placa" type="category" stroke="#64748b" width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => parseFloat(value).toFixed(2) + ' km/lt'}
                />
                <Bar dataKey="kmPerLiter" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 7: Km/L by Driver */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">KM/LITRO por Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={driverArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="driver" type="category" stroke="#64748b" width={170} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => parseFloat(value).toFixed(2) + ' km/lt'}
                />
                <Bar dataKey="kmPerLiter" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 8: R$/Km by Vehicle */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">R$/KM por Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={vehicleArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="placa" type="category" stroke="#64748b" width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => 'R$ ' + parseFloat(value).toFixed(2) + '/km'}
                />
                <Bar dataKey="costPerKm" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 9: R$/Km by Driver */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">R$/KM por Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={driverArray.slice(0, 12)} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} vertical={true} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="driver" type="category" stroke="#64748b" width={170} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px' }}
                  formatter={(value) => 'R$ ' + parseFloat(value).toFixed(2) + '/km'}
                />
                <Bar dataKey="costPerKm" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}