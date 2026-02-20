import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Users, Fuel, MapPin, Truck, Upload, Edit2, Check, X } from 'lucide-react';
import ValorCalculado from '@/components/ValorCalculado';

function LegendaSection({ title, icon: Icon, entities, labelCodigo, labelNome, color }) {
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ codigo: '', nome: '', entity: entities[0].name });
  const [editing, setEditing] = useState(null); // { entityName, id, codigo, nome }

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

  const updateMutation = useMutation({
    mutationFn: ({ entityName, id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [vars.entityName] });
      setEditing(null);
    }
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
          {isPointEntity(novo.entity) && (
            <Input
              placeholder="Código 2"
              value={novo.codigo2}
              onChange={(e) => setNovo({ ...novo, codigo2: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white w-28"
            />
          )}
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
                   <div key={item.id}>
                     {editing?.id === item.id && editing?.entityName === entity.name ? (
                       <div className="flex items-center gap-1 bg-slate-700 rounded px-2 py-1.5">
                         <input
                           type="text"
                           value={editing.codigo}
                           onChange={(e) => setEditing({ ...editing, codigo: e.target.value })}
                           className="bg-slate-600 text-white rounded px-2 py-1 text-sm w-20 font-mono"
                         />
                         {entity.name === 'Ponto' && (
                           <input
                             type="text"
                             value={editing.codigo2 || ''}
                             onChange={(e) => setEditing({ ...editing, codigo2: e.target.value })}
                             placeholder="Código 2"
                             className="bg-slate-600 text-white rounded px-2 py-1 text-sm w-20 font-mono"
                           />
                         )}
                         <input
                           type="text"
                           value={editing.nome}
                           onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                           className="bg-slate-600 text-white rounded px-2 py-1 text-sm flex-1"
                         />
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => {
                             const data = { codigo: editing.codigo, nome: editing.nome };
                             if (entity.name === 'Ponto') data.codigo2 = editing.codigo2 || '';
                             updateMutation.mutate({ entityName: entity.name, id: item.id, data });
                           }}
                           className="h-6 w-6 text-green-400 hover:text-green-300"
                         >
                           <Check className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => setEditing(null)}
                           className="h-6 w-6 text-slate-500 hover:text-red-400"
                         >
                           <X className="w-4 h-4" />
                         </Button>
                       </div>
                     ) : (
                       <div className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-1.5">
                         <span className="text-slate-400 font-mono text-sm w-20">{item.codigo}</span>
                         {entity.name === 'Ponto' && (
                           <span className="text-slate-500 font-mono text-sm w-20">{item.codigo2 || '-'}</span>
                         )}
                         <span className="text-white flex-1 text-sm">{item.nome}</span>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => setEditing({ entityName: entity.name, id: item.id, codigo: item.codigo, codigo2: item.codigo2 || '', nome: item.nome })}
                           className="h-7 w-7 text-slate-500 hover:text-yellow-400"
                         >
                           <Edit2 className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => deleteMutation.mutate({ entityName: entity.name, id: item.id })}
                           className="h-7 w-7 text-slate-500 hover:text-red-400"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     )}
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

function PlacaEquipamentoSection() {
  const queryClient = useQueryClient();
  const [nova, setNova] = useState({ placa: '', tipo: '' });
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlacaEquipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['PlacaEquipamento'] });
      setNova({ placa: '', tipo: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlacaEquipamento.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['PlacaEquipamento'] })
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (records) => {
      await base44.entities.PlacaEquipamento.bulkCreate(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['PlacaEquipamento'] });
      setBulkText('');
      setShowBulk(false);
    }
  });

  const handleAdd = () => {
    if (!nova.placa.trim() || !nova.tipo.trim()) return;
    createMutation.mutate({ placa: nova.placa.trim().toUpperCase(), tipo: nova.tipo.trim().toUpperCase() });
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const records = lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) return { placa: parts[0].trim().toUpperCase(), tipo: parts[1].trim().toUpperCase() };
      return null;
    }).filter(Boolean);
    if (records.length === 0) return;
    bulkCreateMutation.mutate(records);
  };

  return (
    <Card className="bg-slate-800 border border-purple-700 md:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-400" />
          Placa / Equipamento
          <span className="ml-auto text-sm font-normal text-slate-400">{items.length} cadastrados</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBulk(!showBulk)}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 ml-2"
          >
            <Upload className="w-4 h-4 mr-1" />
            Importar em lote
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário individual */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Placa"
            value={nova.placa}
            onChange={(e) => setNova({ ...nova, placa: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white w-32"
          />
          <Input
            placeholder="Tipo de equipamento"
            value={nova.tipo}
            onChange={(e) => setNova({ ...nova, tipo: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white flex-1 min-w-[200px]"
          />
          <Button
            onClick={handleAdd}
            disabled={createMutation.isPending || !nova.placa || !nova.tipo}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Importação em lote */}
        {showBulk && (
          <div className="space-y-2 bg-slate-700/40 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Cole os dados no formato: PLACA [TAB] TIPO (uma por linha)</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={"APS9D92\tBOMBA LANÇA\nAYC4D06\tCAMINHÃO BETONEIRA"}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2 text-sm font-mono"
            />
            <Button
              onClick={handleBulkImport}
              disabled={bulkCreateMutation.isPending || !bulkText.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {bulkCreateMutation.isPending ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        )}

        {/* Lista */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-1.5 gap-1">
              <div className="min-w-0">
                <p className="text-white font-mono text-xs truncate">{item.placa}</p>
                <p className="text-slate-400 text-xs truncate">{item.tipo}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(item.id)}
                className="h-6 w-6 shrink-0 text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <ValorCalculado />
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
        <PlacaEquipamentoSection />
      </div>
    </div>
  );
}