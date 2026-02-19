import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calculator } from 'lucide-react';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function ValorCalculado() {
  const [mesFilter, setMesFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');

  const { data: records = [] } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ['Ponto'],
    queryFn: () => base44.entities.Ponto.list()
  });

  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));

  const meses = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))]
    .filter(m => m !== null).sort((a, b) => a - b);

  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();

  const filtered = records.filter(r => {
    if (mesFilter !== '' && parseISO(r.date).getMonth() !== parseInt(mesFilter)) return false;
    if (unitFilter && r.unit !== unitFilter) return false;
    return true;
  });

  const totalLitros = filtered.reduce((sum, r) => sum + (r.liters || 0), 0);
  const preco = parseFloat(precoLitro.replace(',', '.')) || 0;
  const valorTotal = totalLitros * preco;

  return (
    <Card className="bg-slate-800 border-orange-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-orange-400" />
          Cálculo de Valor por Litro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <select
            value={mesFilter}
            onChange={e => setMesFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Todas as usinas</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>

          <Input
            type="text"
            placeholder="Preço por litro (R$/L)"
            value={precoLitro}
            onChange={e => setPrecoLitro(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        <div className="border-t border-slate-600 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total de Litros:</span>
            <span className="text-white font-mono">{totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Preço por Litro:</span>
            <span className="text-white font-mono">R$ {preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-slate-600 pt-2 mt-2">
            <span className="text-orange-400">Valor Total:</span>
            <span className="text-orange-300">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}