import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Fuel, DollarSign, Gauge } from 'lucide-react';

export default function Graficos() {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 1000)
  });

  // Filter records
  const filteredRecords = records.filter(r => {
    if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
    if (selectedUnit !== 'all' && r.unit !== selectedUnit) return false;
    return true;
  });

  // Get unique months and units
  const months = [...new Set(records.map(r => r.month))].filter(Boolean);
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean);

  // Calculate metrics
  const totalLiters = filteredRecords.reduce((sum, r) => sum + (r.liters || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalKm = filteredRecords.reduce((sum, r) => sum + (r.km_driven || 0), 0);
  const avgEfficiency = filteredRecords.length > 0
    ? filteredRecords.reduce((sum, r) => sum + (r.efficiency || 0), 0) / filteredRecords.length
    : 0;

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

  // Efficiency by vehicle
  const vehicleEfficiency = {};
  filteredRecords.forEach(r => {
    if (r.vehicle_plate && r.efficiency) {
      if (!vehicleEfficiency[r.vehicle_plate]) {
        vehicleEfficiency[r.vehicle_plate] = { total: 0, count: 0 };
      }
      vehicleEfficiency[r.vehicle_plate].total += r.efficiency;
      vehicleEfficiency[r.vehicle_plate].count += 1;
    }
  });
  const efficiencyData = Object.entries(vehicleEfficiency)
    .map(([plate, data]) => ({
      placa: plate,
      eficiencia: (data.total / data.count).toFixed(2)
    }))
    .sort((a, b) => b.eficiencia - a.eficiencia)
    .slice(0, 10);

  // Monthly trend
  const monthlyData = months.map(month => {
    const monthRecords = records.filter(r => r.month === month);
    return {
      mes: month,
      litros: monthRecords.reduce((sum, r) => sum + (r.liters || 0), 0),
      custo: monthRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    };
  });

  const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Análise de Desempenho</h1>
        
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-40 bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas unidades</SelectItem>
              {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
            <p className="text-2xl font-bold text-white">{totalLiters.toFixed(0)}</p>
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
            <p className="text-2xl font-bold text-white">R$ {totalCost.toFixed(2)}</p>
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
            <p className="text-2xl font-bold text-white">{totalKm.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-500" />
              Eficiência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{avgEfficiency.toFixed(2)} km/l</p>
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

        {/* Vehicle Efficiency */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Eficiência por Veículo (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="placa" stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="eficiencia" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Legend />
                <Line type="monotone" dataKey="litros" stroke="#0ea5e9" name="Litros" />
                <Line type="monotone" dataKey="custo" stroke="#f59e0b" name="Custo (R$)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}