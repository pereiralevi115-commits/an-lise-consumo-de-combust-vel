import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TotalM3Card() {
  const { data: cubicMetros = [] } = useQuery({
    queryKey: ['cubicMetrosTotalCard'],
    queryFn: () => base44.entities.CubicMetros.list()
  });

  const { data: placaEquipamentos = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const totalM3Betoneira = cubicMetros.filter(record => {
    const placa = String(record.placa || '').toUpperCase();
    const equipamento = (placaEquipamentosMap[placa] || record.equipamento || '').toUpperCase();
    return equipamento.includes('CAMINHÃO BETONEIRA') || equipamento.includes('BETONEIRA');
  }).reduce((sum, record) => sum + (record.metros_cubicos || 0), 0);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-0 shadow-lg p-6">
      <p className="text-blue-900 text-sm font-medium mb-2">Total M³ Betoneira</p>
      <p className="text-4xl font-bold text-blue-900">{totalM3Betoneira.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
    </Card>
  );
}