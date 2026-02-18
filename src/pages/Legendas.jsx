import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Users, Fuel, MapPin } from 'lucide-react';

function LegendaSection({ title, icon: Icon, entityName, labelCodigo, labelNome, color }) {
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ codigo: '', nome: '' });

  const { data: items = [] } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list('codigo')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setNovo({ codigo: '', nome: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] })
  });

  const handleAdd = () => {
    if (!novo.codigo.trim() || !novo.nome.trim()) return;
    createMutation.mutate({ codigo: novo.codigo.trim(), nome: novo.nome.trim() });
  };

  return (
    <Card className={`bg-slate-800 border-${color}-700 border`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-400`} />
          {title}
          <span className="ml-auto text-sm font-normal text-slate-400">{items.length} cadastrados</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de adição */}
        <div className="flex gap-2">
          <Input
            placeholder={labelCodigo}
            value={novo.codigo}
            onChange={(e) => setNovo({ ...novo, codigo: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white w-32"
          />
          <Input
            placeholder={labelNome}
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={createMutation.isPending || !novo.codigo || !novo.nome}
            className={`bg-${color}-600 hover:bg-${color}-700 text-white`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum cadastro ainda</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2">
                <span className="text-slate-400 font-mono text-sm w-20">{item.codigo}</span>
                <span className="text-white flex-1">{item.nome}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="h-7 w-7 text-slate-500 hover:text-red-400"
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

export default function Legendas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Legendas</h1>
        <p className="text-slate-400">Cadastre os códigos e nomes para exibição na tela de Dados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LegendaSection
          title="Frentistas"
          icon={Fuel}
          entityName="Frentista"
          labelCodigo="Código"
          labelNome="Nome do frentista"
          color="yellow"
        />
        <LegendaSection
          title="Motoristas"
          icon={Users}
          entityName="Motorista"
          labelCodigo="Código"
          labelNome="Nome do motorista"
          color="blue"
        />
        <LegendaSection
          title="Pontos / Usinas"
          icon={MapPin}
          entityName="Ponto"
          labelCodigo="Código"
          labelNome="Nome da usina"
          color="green"
        />
      </div>
    </div>
  );
}