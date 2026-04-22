import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Ban } from 'lucide-react';

export default function ExclusaoMediaSection() {
  const queryClient = useQueryClient();
  const [nova, setNova] = useState({ placa: '', mes: '', motivo: '' });

  const { data: items = [] } = useQuery({
    queryKey: ['ExclusaoMedia'],
    queryFn: () => base44.entities.ExclusaoMedia.list('-mes')
  });

  const { data: placaEquipamentos = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const plates = [...new Set(placaEquipamentos.map(p => p.placa))].sort();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExclusaoMedia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ExclusaoMedia'] });
      setNova({ placa: '', mes: '', motivo: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExclusaoMedia.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ExclusaoMedia'] })
  });

  const handleAdd = () => {
    if (!nova.placa.trim() || !nova.mes) return;
    // Check for duplicate
    const exists = items.some(i => i.placa.toUpperCase() === nova.placa.toUpperCase() && i.mes === nova.mes);
    if (exists) return alert('Já existe uma exclusão para essa placa nesse mês.');
    createMutation.mutate({ placa: nova.placa.trim().toUpperCase(), mes: nova.mes, motivo: nova.motivo.trim() });
  };

  return (
    <Card className="bg-white border border-red-200 shadow-lg md:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-800 flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          Excluir Média de KM/L por Placa/Mês
          <span className="ml-auto text-sm font-normal text-slate-500">{items.length} exclusões</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-500 text-sm">
          Placas/meses marcados aqui terão a coluna <strong>KM/L</strong> e <strong>R$/KM</strong> ocultadas na análise, pois os dados de hodômetro estão imprecisos.
        </p>

        <div className="flex gap-2 flex-wrap">
          <select
            value={nova.placa}
            onChange={(e) => setNova({ ...nova, placa: e.target.value })}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm w-36"
          >
            <option value="">Placa...</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Input
            type="month"
            value={nova.mes}
            onChange={(e) => setNova({ ...nova, mes: e.target.value })}
            className="border-slate-200 text-slate-800 w-40"
          />
          <Input
            placeholder="Motivo (opcional)"
            value={nova.motivo}
            onChange={(e) => setNova({ ...nova, motivo: e.target.value })}
            className="border-slate-200 text-slate-800 flex-1 min-w-[150px]"
          />
          <Button
            onClick={handleAdd}
            disabled={createMutation.isPending || !nova.placa || !nova.mes}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Nenhuma exclusão cadastrada</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded px-3 py-2 gap-2">
                <span className="text-slate-800 font-mono font-bold text-sm w-24 shrink-0">{item.placa}</span>
                <span className="text-red-700 font-medium text-sm w-20 shrink-0">{item.mes}</span>
                <span className="text-slate-500 text-sm flex-1 truncate">{item.motivo || '-'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}