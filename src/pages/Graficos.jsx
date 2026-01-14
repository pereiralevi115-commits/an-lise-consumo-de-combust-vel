import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Graficos() {
  const [loading, setLoading] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 1000)
  });

  if (isLoading) return <div className="p-8 text-center">Carregando dados...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Gráficos</h1>
      <p className="text-gray-600 mb-4">Total de {records.length} registros</p>
    </div>
  );
}