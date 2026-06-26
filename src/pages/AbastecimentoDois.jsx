import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const emptyForm = {
  date: '', time: '', vehicle_plate: '', unit: '', equipamento: '',
  attendant: '', driver: '', fuel_type: '', liters: '', km_driven: '', cost: ''
};

export default function AbastecimentoDois() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['AbastecimentoManual'],
    queryFn: () => base44.entities.AbastecimentoManual.list('-date', 10000)
  });

  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: combustiveis = [] } = useQuery({ queryKey: ['Combustivel'], queryFn: () => base44.entities.Combustivel.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });

  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const setField = (k, v) => {
    const updated = { ...form, [k]: v };
    // auto-fill equipamento when plate changes
    if (k === 'vehicle_plate') {
      const tipo = placaEquipamentosMap[String(v).toUpperCase()];
      if (tipo) updated.equipamento = tipo;
    }
    setForm(updated);
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (r) => {
    setForm({
      date: r.date || '', time: r.time || '', vehicle_plate: r.vehicle_plate || '',
      unit: r.unit || '', equipamento: r.equipamento || '', attendant: r.attendant || '',
      driver: r.driver || '', fuel_type: r.fuel_type || '',
      liters: r.liters ?? '', km_driven: r.km_driven ?? '', cost: r.cost ?? ''
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      liters: form.liters !== '' ? Number(form.liters) : null,
      km_driven: form.km_driven !== '' ? Number(form.km_driven) : null,
      cost: form.cost !== '' ? Number(form.cost) : null,
    };
    if (editId) {
      await base44.entities.AbastecimentoManual.update(editId, payload);
    } else {
      await base44.entities.AbastecimentoManual.create(payload);
    }
    qc.invalidateQueries({ queryKey: ['AbastecimentoManual'] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este registro?')) return;
    setDeleting(id);
    await base44.entities.AbastecimentoManual.delete(id);
    qc.invalidateQueries({ queryKey: ['AbastecimentoManual'] });
    setDeleting(null);
  };

  if (isLoading) return <div className="text-slate-600 text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-1">Abastecimento</h1>
          <p className="text-slate-500">Cadastro manual de abastecimentos — {records.length} registro(s)</p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-2 bg-[#FDB913] text-slate-900 hover:bg-[#e5a710]">
          <Plus className="w-4 h-4" /> Novo Registro
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="border-[#FDB913] shadow-lg">
          <CardContent className="p-6">
            <h2 className="font-semibold text-slate-800 mb-4">{editId ? 'Editar Registro' : 'Novo Registro'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Data *</label>
                <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hora</label>
                <input type="time" value={form.time} onChange={e => setField('time', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Placa *</label>
                <input type="text" value={form.vehicle_plate} onChange={e => setField('vehicle_plate', e.target.value.toUpperCase())}
                  placeholder="EX-0000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Usina</label>
                <select value={form.unit} onChange={e => setField('unit', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {pontos.map(p => <option key={p.id} value={p.codigo}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Equipamento</label>
                <input type="text" value={form.equipamento} onChange={e => setField('equipamento', e.target.value)}
                  placeholder="Auto-preenchido pela placa" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Posto/Frentista</label>
                <select value={form.attendant} onChange={e => setField('attendant', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {frentistas.map(f => <option key={f.id} value={f.codigo}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Motorista</label>
                <select value={form.driver} onChange={e => setField('driver', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {motoristas.map(m => <option key={m.id} value={m.codigo}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Combustível</label>
                <select value={form.fuel_type} onChange={e => setField('fuel_type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {combustiveis.map(c => <option key={c.id} value={c.codigo}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Litros *</label>
                <input type="number" step="0.001" value={form.liters} onChange={e => setField('liters', e.target.value)}
                  placeholder="0.000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">KM Rodados</label>
                <input type="number" value={form.km_driven} onChange={e => setField('km_driven', e.target.value)}
                  placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Valor (R$)</label>
                <input type="number" step="0.01" value={form.cost} onChange={e => setField('cost', e.target.value)}
                  placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex items-center gap-1">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.date || !form.vehicle_plate || !form.liters}
                className="flex items-center gap-1 bg-[#FDB913] text-slate-900 hover:bg-[#e5a710]">
                <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card className="bg-white border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600">Data</TableHead>
                  <TableHead className="text-slate-600">Hora</TableHead>
                  <TableHead className="text-slate-600">Placa</TableHead>
                  <TableHead className="text-slate-600">Usina</TableHead>
                  <TableHead className="text-slate-600">Equipamento</TableHead>
                  <TableHead className="text-slate-600">Posto</TableHead>
                  <TableHead className="text-slate-600">Motorista</TableHead>
                  <TableHead className="text-slate-600">Combustível</TableHead>
                  <TableHead className="text-slate-600 text-right">Litros</TableHead>
                  <TableHead className="text-slate-600 text-right">KM</TableHead>
                  <TableHead className="text-slate-600 text-right">Valor (R$)</TableHead>
                  <TableHead className="text-slate-600 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-slate-400 py-12">
                      Nenhum registro cadastrado. Clique em "Novo Registro" para começar.
                    </TableCell>
                  </TableRow>
                ) : records.map(r => {
                  const pontoNome = pontos.find(p => String(p.codigo) === String(r.unit))?.nome || r.unit || '-';
                  const frentistaNome = frentistas.find(f => String(f.codigo) === String(r.attendant))?.nome || r.attendant || '-';
                  const motoristaNome = motoristas.find(m => String(m.codigo) === String(r.driver))?.nome || r.driver || '-';
                  const combustivelNome = combustiveis.find(c => String(c.codigo) === String(r.fuel_type))?.nome || r.fuel_type || '-';
                  return (
                    <TableRow key={r.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell className="text-slate-800">
                        {r.date ? format(parseISO(r.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">{r.time || '-'}</TableCell>
                      <TableCell className="text-slate-800 font-mono font-bold">{r.vehicle_plate || '-'}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{pontoNome}</TableCell>
                      <TableCell className="text-slate-600">{r.equipamento || '-'}</TableCell>
                      <TableCell className="text-slate-600">{frentistaNome}</TableCell>
                      <TableCell className="text-slate-600">{String(motoristaNome).toUpperCase()}</TableCell>
                      <TableCell className="text-slate-600">{combustivelNome}</TableCell>
                      <TableCell className="text-slate-800 text-right">{r.liters != null ? r.liters.toFixed(3) : '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">{r.km_driven != null && r.km_driven > 0 ? r.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">{r.cost != null ? `R$ ${r.cost.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}