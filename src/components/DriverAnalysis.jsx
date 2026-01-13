import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DriverAnalysis({ drivers }) {
  if (!drivers || drivers.length === 0) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Análise por Motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by kilometers
  const topDrivers = [...drivers]
    .sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0))
    .slice(0, 10);

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">Top 10 Motoristas - Quilômetros</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topDrivers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="name" type="category" width={200} stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value) => `${value?.toLocaleString('pt-BR')} km`}
            />
            <Bar dataKey="kilometers" fill="#8b5cf6" name="Quilômetros" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}