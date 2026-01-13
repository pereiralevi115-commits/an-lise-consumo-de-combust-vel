import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PlantAnalysis({ plants }) {
  if (!plants || plants.length === 0) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Análise por Usina</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by cost and take top 10
  const topPlants = [...plants]
    .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0))
    .slice(0, 10);

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">Top 10 Usinas por Custo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topPlants} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="name" type="category" width={200} stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value) => `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Bar dataKey="total_cost" fill="#ef4444" name="Custo (R$)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}