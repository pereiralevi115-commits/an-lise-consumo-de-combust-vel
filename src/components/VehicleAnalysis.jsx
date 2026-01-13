import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VehicleAnalysis({ vehicles }) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Análise por Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by kilometers
  const topVehicles = [...vehicles]
    .sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0))
    .slice(0, 12);

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">Veículos - Quilômetros Percorridos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topVehicles}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="plate" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value) => `${value?.toLocaleString('pt-BR')} km`}
            />
            <Bar dataKey="kilometers" fill="#06b6d4" name="Quilômetros" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}