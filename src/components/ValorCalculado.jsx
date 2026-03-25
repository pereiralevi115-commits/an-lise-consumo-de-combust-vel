import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, Save, CheckCircle } from 'lucide-react';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function ValorCalculado() {
  const [mesFilter, setMesFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ['Ponto'],
    queryFn: () => base44.entities.Ponto.list()
  });

  const { data: precos = [] } = useQuery({
    queryKey: ['PrecoCombustivel'],
    queryFn: () => base44.entities.PrecoCombustivel.list()
  });

  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));

  const anos = [...new Set(records.map(r => r.date ? parseISO(r.date).getFullYear() : null))]
    .filter(Boolean).sort((a, b) => b - a);

  const meses = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))]
    .filter(m => m !== null).sort((a, b) => a - b);

  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();

  const filtered = records.filter(r => {
    if (!r.date) return false;
    const d = parseISO(r.date);
    if (anoFilter && d.getFullYear() !== parseInt(anoFilter)) return false;
    if (mesFilter !== '' && d.getMonth() !== parseInt(mesFilter)) return false;
    if (unitFilter && r.unit !== unitFilter) return false;
    return true;
  });

  const totalLitros = filtered.reduce((sum, r) => sum + (r.liters || 0), 0);
  const preco = parseFloat(precoLitro.replace(',', '.')) || 0;
  const valorTotal = totalLitros * preco;

  // Preço já salvo para esse filtro
  const precoSalvo = mesFilter !== '' && anoFilter && unitFilter
    ? precos.find(p => p.mes === parseInt(mesFilter) && p.ano === parseInt(anoFilter) && p.ponto === unitFilter)
    : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dadosPreco = {
        mes: parseInt(mesFilter),
        ano: parseInt(anoFilter),
        ponto: unitFilter,
        preco_litro: preco
      };
      if (precoSalvo) {
        await base44.entities.PrecoCombustivel.update(precoSalvo.id, { preco_litro: preco });
      } else {
        await base44.entities.PrecoCombustivel.create(dadosPreco);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['PrecoCombustivel'] });
      setSaved(true);
      setErrorMsg('');
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      setErrorMsg(err?.message || 'Erro desconhecido');
    }
  });

  const canSave = preco > 0 && mesFilter !== '' && anoFilter && unitFilter;

  return (
    <Card className="bg-slate-800 border-orange-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-orange-400" />
          Preço de Combustível por Mês/Usina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-xs">Selecione mês, ano e usina para registrar o preço por litro. O custo será calculado dinamicamente.</p>
        <div className="grid grid-cols-1 gap-3">
          <select
            value={anoFilter}
            onChange={e => setAnoFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Selecione o ano *</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={mesFilter}
            onChange={e => setMesFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Selecione o mês *</option>
            {meses.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Selecione a usina *</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>

          <Input
            type="text"
            placeholder="Preço por litro (R$/L) *"
            value={precoLitro}
            onChange={e => setPrecoLitro(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        {precoSalvo && (
          <p className="text-blue-400 text-xs text-center bg-blue-900/20 rounded p-2">
            Preço atual salvo: R$ {precoSalvo.preco_litro.toFixed(4)}/L — será atualizado
          </p>
        )}

        <div className="border-t border-slate-600 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Registros encontrados:</span>
            <span className="text-white font-mono">{filtered.length}</span>
          </div>
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

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className={`w-full ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Preço salvo!</>
          ) : saveMutation.isPending ? (
            'Salvando...'
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Salvar Preço</>
          )}
        </Button>

        {errorMsg && (
          <p className="text-red-400 text-xs text-center bg-red-900/30 rounded p-2">
            ❌ Erro: {errorMsg}
          </p>
        )}

        {!canSave && (
          <p className="text-slate-500 text-xs text-center">
            * Selecione ano, mês, usina e informe o preço
          </p>
        )}
      </CardContent>
    </Card>
  );
}