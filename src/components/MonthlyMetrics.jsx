import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlyMetrics({ data }) {
  if (!data) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <CardContent className="p-8">
          <p className="text-slate-400">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    {
      month: 'Setembro',
      liters: data.september?.liters || 0,
      kilometers: data.september?.kilometers || 0,
      cost: data.september?.cost || 0
    },
    {
      month: 'Outubro',
      liters: data.october?.liters || 0,
      kilometers: data.october?.kilometers || 0,
      cost: data.october?.cost || 0
    },
    {
      month: 'Novembro',
      liters: data.november?.liters || 0,
      kilometers: data.november?.kilometers || 0,
      cost: data.november?.cost || 0
    },
    {
      month: 'Dezembro',
      liters: data.december?.liters || 0,
      kilometers: data.december?.kilometers || 0,
      cost: data.december?.cost || 0
    }
  ];

  // Summary cards
  const totalLiters = chartData.reduce((acc, m) => acc + m.liters, 0);
  const totalKm = chartData.reduce((acc, m) => acc + m.kilometers, 0);
  const totalCost = chartData.reduce((acc, m) => acc + m.cost, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-700 bg-gradient-to-br from-blue-900/30 to-blue-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Total de Litros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{totalLiters.toLocaleString('pt-BR')} L</div>
            <p className="text-xs text-slate-400 mt-1">4 meses</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-gradient-to-br from-green-900/30 to-green-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Total de Km</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{totalKm.toLocaleString('pt-BR')} km</div>
            <p className="text-xs text-slate-400 mt-1">4 meses</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-gradient-to-br from-amber-900/30 to-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-400 mt-1">4 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Dados Mensais - Litros Abastecidos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="liters" fill="#3b82f6" name="Litros" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Dados Mensais - Quilômetros</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="kilometers" fill="#10b981" name="Quilômetros" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Dados Mensais - Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="cost" fill="#f59e0b" name="Custo (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}