import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TotalM3Card() {
  const { data: cubicMetros = [] } = useQuery({
    queryKey: ['cubicMetrosTotalCard'],
    queryFn: () => base44.entities.CubicMetros.list()
  });

  const totalM3 = cubicMetros.reduce((sum, record) => sum + (record.metros_cubicos || 0), 0);

  return (
    <Card className="bg-white border border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-800">Total M³ (Sem Exclusões)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-blue-900">{totalM3.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-slate-500 text-sm mt-2">{cubicMetros.length} registros</p>
      </CardContent>
    </Card>
  );
}