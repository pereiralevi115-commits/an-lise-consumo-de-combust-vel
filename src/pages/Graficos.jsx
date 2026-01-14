import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Graficos() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  // Get unique values
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const types = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();

  // Cost by unit
  const costByUnit = units.map(unit => ({
    name: unit,
    value: records
      .filter(r => r.unit === unit)
      .reduce((sum, r) => sum + (r.cost || 0), 0)
  })).sort((a, b) => b.value - a.value);

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-yellow-400 px-8 py-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">FECHAMENTO ANÁLISE COMBUSTÍVEL</h1>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">CONCRETAR</p>
        </div>
      </div>

      {/* Filters Tables */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="border-2 border-yellow-400 bg-yellow-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">USINA</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto text-sm text-gray-800">
              {units.slice(0, 8).map(u => <div key={u}>{u}</div>)}
            </div>
          </div>

          <div className="border-2 border-yellow-400 bg-yellow-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">TIPO</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto text-sm text-gray-800">
              {types.map(t => <div key={t}>{t}</div>)}
            </div>
          </div>

          <div className="border-2 border-yellow-400 bg-yellow-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">PLACA</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto text-sm text-gray-800">
              {plates.slice(0, 8).map(p => <div key={p}>{p}</div>)}
            </div>
          </div>

          <div className="border-2 border-yellow-400 bg-yellow-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">MOTORISTA</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto text-sm text-gray-800">
              {drivers.slice(0, 8).map(d => <div key={d}>{d}</div>)}
            </div>
          </div>

          <div className="border-2 border-yellow-400 bg-yellow-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">TOTAL</h3>
            <div className="space-y-2 text-sm text-gray-800">
              <div><strong>{records.length}</strong> registros</div>
              <div>R$ {records.reduce((s, r) => s + (r.cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="border-t-4 border-gray-300 pt-8">
          <h2 className="text-center font-bold text-gray-800 text-lg mb-6">CUSTOS POR UNIDADE</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={costByUnit}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="value" fill="#FBBF24" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}