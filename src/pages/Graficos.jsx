import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Fuel, DollarSign, Gauge } from 'lucide-react';

export default function Graficos() {
  const [selectedUnit, setSelectedUnit] = useState('all');
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
    if (selectedUnit !== 'all' && r.unit !== selectedUnit) return false;
    if (filters.month && new Date(r.date).getMonth() !== parseInt(filters.month)) return false;
    if (filters.equipment && r.vehicle_type !== filters.equipment) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  });

  // Get unique units and other filters
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const months = [...new Set(records.map(r => r.date ? new Date(r.date).getMonth() : null))].filter(m => m !== null).sort();
  const equipment = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Calculate metrics
  const totalLiters = filteredRecords.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalKm = filteredRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0);
  const totalM3 = filteredRecords.reduce((sum, r) => sum + (r.cubic_meters || 0), 0);

  // Cost by unit
  const costByUnit = units.map(unit => ({
    name: unit,
    custo: filteredRecords
      .filter(r => r.unit === unit)
      .reduce((sum, r) => sum + (r.cost || 0), 0)
  })).sort((a, b) => b.custo - a.custo);

  // Liters by vehicle type
  const litersByType = {};
  filteredRecords.forEach(r => {
    if (r.vehicle_type) {
      litersByType[r.vehicle_type] = (litersByType[r.vehicle_type] || 0) + (r.liters || 0);
    }
  });
  const typeData = Object.entries(litersByType).map(([name, value]) => ({ name, value }));

  // Cost by vehicle
  const vehicleCost = {};
  filteredRecords.forEach(r => {
    if (r.vehicle_plate) {
      vehicleCost[r.vehicle_plate] = (vehicleCost[r.vehicle_plate] || 0) + (r.cost || 0);
    }
  });
  const costData = Object.entries(vehicleCost)
    .map(([plate, cost]) => ({
      placa: plate,
      custo: cost
    }))
    .sort((a, b) => b.custo - a.custo)
    .slice(0, 10);

  // M³ by unit
  const m3ByUnit = units.map(unit => ({
    name: unit,
    m3: filteredRecords
      .filter(r => r.unit === unit)
      .reduce((sum, r) => sum + (r.cubic_meters || 0), 0)
  })).sort((a, b) => b.m3 - a.m3);

  const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6">Análise de Desempenho</h1>

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
          value={filters.equipment} 
          onChange={(e) => setFilters({...filters, equipment: e.target.value})}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
        >
          <option value="">Todos equipamentos</option>
          {equipment.map(e => <option key={e} value={e}>{e}</option>)}
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-orange-500" />
              Total de Litros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalLiters.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-slate-400 mt-1">L</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">R$ {totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-400 mt-1">Gasto total</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Km Rodados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalKm.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-slate-400 mt-1">km</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-500" />
              Total M³
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{totalM3.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs text-slate-400 mt-1">m³</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Unit */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Custo por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costByUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="custo" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Liters by Vehicle Type */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Litros por Tipo de Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Vehicle */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Custo por Veículo (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="placa" stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="custo" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* M³ by Unit */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">M³ por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={m3ByUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="m3" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}