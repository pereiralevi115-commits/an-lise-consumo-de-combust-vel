import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function EquipmentAnalysis({ equipment }) {
  if (!equipment || equipment.length === 0) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Análise por Tipo de Equipamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">Produção por Tipo de Equipamento (m³)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={equipment}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.type || 'Outro'}: ${entry.production_m3?.toLocaleString('pt-BR') || 0} m³`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="production_m3"
            >
              {equipment.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value) => `${value?.toLocaleString('pt-BR')} m³`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}