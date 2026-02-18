import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Users, Fuel, MapPin } from 'lucide-react';

function LegendaSection({ title, icon: Icon, entities, labelCodigo, labelNome, color }) {
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ codigo: '', nome: '', entity: entities[0].name });

  // Fetch entities individually (hooks cannot be called in loops)
  const query0 = useQuery({ queryKey: [entities[0]?.name], queryFn: () => base44.entities[entities[0].name].list('codigo'), enabled: !!entities[0] });
  const query1 = useQuery({ queryKey: [entities[1]?.name], queryFn: () => base44.entities[entities[1]?.name]?.list('codigo'), enabled: !!entities[1] });

  const allItems = entities.map((e, i) => ({
    entity: e,
    items: (i === 0 ? query0.data : query1.data) || []
  }));

  const createMutation = useMutation({
    mutationFn: ({ entityName, data }) => base44.entities[entityName].create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [vars.entityName] });
      setNovo({ ...novo, codigo: '', nome: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entityName, id }) => base44.entities[entityName].delete(id),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: [vars.entityName] })
  });

  const handleAdd = () => {
    if (!novo.codigo.trim() || !novo.nome.trim()) return;
    createMutation.mutate({ entityName: novo.entity, data: { codigo: novo.codigo.trim(), nome: novo.nome.trim() } });
  };

  const totalItems = allItems.reduce((acc, e) => acc + e.items.length, 0);

  const borderColors = { yellow: 'border-yellow-700', blue: 'border-blue-700', green: 'border-green-700' };
  const iconColors = { yellow: 'text-yellow-400', blue: 'text-blue-400', green: 'text-green-400' };
  const btnColors = { yellow: 'bg-yellow-600 hover:bg-yellow-700', blue: 'bg-blue-600 hover:bg-blue-700', green: 'bg-green-600 hover:bg-green-700' };

  return (
    <Card className={`bg-slate-800 border ${borderColors[color]}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColors[color]}`} />
          {title}
          <span className="ml-auto text-sm font-normal text-slate-400">{totalItems} cadastrados</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de adição */}
        <div className="flex gap-2 flex-wrap">
          {entities.length > 1 && (
            <select
              value={novo.entity}
              onChange={(e) => setNovo({ ...novo, entity: e.target.value })}
              className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-2 text-sm"
            >
              {entities.map(e => (
                <option key={e.name} value={e.name}>{e.label}</option>
              ))}
            </select>
          )}
          <Input
            placeholder={labelCodigo}
            value={novo.codigo}
            onChange={(e) => setNovo({ ...novo, codigo: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white w-28"
          />
          <Input
            placeholder={labelNome}
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white flex-1 min-w-[120px]"
          />
          <Button
            onClick={handleAdd}
            disabled={createMutation.isPending || !novo.codigo || !novo.nome}
            className={`${btnColors[color]} text-white`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Listas agrupadas por entidade */}
        {allItems.map(({ entity, items }) => (
          <div key={entity.name}>
            {entities.length > 1 && (
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{entity.label} ({items.length})</p>
            )}
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-2">Nenhum cadastro ainda</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-1.5">
                    <span className="text-slate-400 font-mono text-sm w-20">{item.codigo}</span>
                    <span className="text-white flex-1 text-sm">{item.nome}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ entityName: entity.name, id: item.id })}
                      className="h-7 w-7 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Legendas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Legendas</h1>
        <p className="text-slate-400">Cadastre os códigos e nomes para exibição na tela de Dados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LegendaSection
          title="Combustível"
          icon={Fuel}
          entities={[{ name: 'Combustivel', label: 'Combustível' }]}
          labelCodigo="Código"
          labelNome="Nome do combustível"
          color="yellow"
        />
        <LegendaSection
          title="Motoristas / Frentistas"
          icon={Users}
          entities={[
            { name: 'Motorista', label: 'Motoristas' },
            { name: 'Frentista', label: 'Frentistas' }
          ]}
          labelCodigo="Código"
          labelNome="Nome"
          color="blue"
        />
        <LegendaSection
          title="Pontos / Usinas"
          icon={MapPin}
          entities={[{ name: 'Ponto', label: 'Pontos/Usinas' }]}
          labelCodigo="Código"
          labelNome="Nome da usina"
          color="green"
        />
      </div>
    </div>
  );
}