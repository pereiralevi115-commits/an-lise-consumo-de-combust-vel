import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MetrosCubicos() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [deleteMes, setDeleteMes] = useState('2026-02');
  const [isDeletingMes, setIsDeletingMes] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [sortBy, setSortBy] = useState('mes');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [editField, setEditField] = useState(null); // 'equipamento' ou 'metros_cubicos'
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [filterMes, setFilterMes] = useState('');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterEquipamento, setFilterEquipamento] = useState('');
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['CubicMetros'],
    queryFn: async () => {
      const allRecords = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.CubicMetros.list('-mes', limit, offset);
        if (batch.length === 0) hasMore = false;
        else {
          allRecords.push(...batch);
          offset += limit;
        }
      }
      return allRecords;
    }
  });

  const { data: placaEquipamentos = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const uniqueMeses = [...new Set(records.map(r => r.mes))].filter(Boolean).sort((a, b) => b.localeCompare(a));
  const uniquePlacas = [...new Set(records.map(r => String(r.placa).toUpperCase()))].filter(Boolean).sort();
  const uniqueEquipamentos = [...new Set(records.map(r => placaEquipamentosMap[String(r.placa).toUpperCase()] || r.equipamento))].filter(Boolean).sort();

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-[#FDB913] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const filteredRecords = records.filter(r => {
    const mes = r.mes || '';
    const placa = String(r.placa || '').toUpperCase();
    const equipamento = (placaEquipamentosMap[placa] || r.equipamento || '').toUpperCase();
    
    if (filterMes && !mes.includes(filterMes)) return false;
    if (filterPlaca && !placa.includes(filterPlaca.toUpperCase())) return false;
    if (filterEquipamento && !equipamento.includes(filterEquipamento.toUpperCase())) return false;
    return true;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'mes') { valA = a.mes; valB = b.mes; }
    else if (sortBy === 'placa') { valA = a.placa; valB = b.placa; }
    else if (sortBy === 'equipamento') { valA = placaEquipamentosMap[String(a.placa).toUpperCase()] || a.equipamento; valB = placaEquipamentosMap[String(b.placa).toUpperCase()] || b.equipamento; }
    else if (sortBy === 'm3') { valA = a.metros_cubicos; valB = b.metros_cubicos; }
    
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : (valA < valB ? -1 : valA > valB ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('importCubicMetros', { fileUrl: file_url });
      setStatus({ type: 'success', message: `${res.data.count} registros importados com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['CubicMetros'] });
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.error || err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.CubicMetros.delete(id);
    } catch (_) {}
    queryClient.invalidateQueries({ queryKey: ['CubicMetros'] });
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selected);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === sortedRecords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedRecords.map(r => r.id)));
    }
  };

  const handleBulkEdit = async () => {
    if (selected.size === 0 || !editField || editValue === '') return;
    if (!window.confirm(`Atualizar ${selected.size} registro(s)?`)) return;
    
    setIsEditing(true);
    try {
      const updates = Array.from(selected).map(id => {
        const record = records.find(r => r.id === id);
        const updateData = { ...record };
        if (editField === 'mes') updateData.mes = editValue;
        else if (editField === 'equipamento') updateData.equipamento = editValue;
        else if (editField === 'metros_cubicos') updateData.metros_cubicos = parseFloat(editValue.replace(',', '.'));
        return base44.entities.CubicMetros.update(id, updateData).catch(() => {});
      });
      await Promise.all(updates);
      setSelected(new Set());
      setEditField(null);
      setEditValue('');
      queryClient.invalidateQueries({ queryKey: ['CubicMetros'] });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMes = async () => {
    if (!deleteMes) return;
    const [ano, mes] = deleteMes.split('-').map(Number);
    const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const mesExibicao = `${monthNames[mes - 1]} / ${ano}`;
    if (!window.confirm(`Excluir todos os registros de M³ de ${mesExibicao}?`)) return;
    setIsDeletingMes(true);
    setDeleteStatus(null);
    try {
      const toDelete = records.filter(r => r.mes === mesStr);
      if (toDelete.length === 0) {
        setDeleteStatus({ type: 'error', message: 'Nenhum registro encontrado para este mês.' });
        return;
      }
      const batchSize = 20;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        await Promise.all(toDelete.slice(i, i + batchSize).map(r => base44.entities.CubicMetros.delete(r.id).catch(() => {})));
      }
      setDeleteStatus({ type: 'success', message: `${toDelete.length} registros excluídos com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['CubicMetros'] });
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err.message });
    } finally {
      setIsDeletingMes(false);
    }
  };

  const formatMes = (mes) => {
    if (!mes) return '-';
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    // Formato YYYY-MM
    if (/^\d{4}-\d{2}$/.test(mes)) {
      const [year, month] = mes.split('-');
      return `${monthNames[parseInt(month) - 1]} / ${year}`;
    }
    // Formato MM/YYYY
    if (/^\d{2}\/\d{4}$/.test(mes)) {
      const [month, year] = mes.split('/');
      return `${monthNames[parseInt(month) - 1]} / ${year}`;
    }
    // Qualquer outro formato, exibe como está
    return mes;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-1">M³ por Placa</h1>
        <p className="text-slate-500">Gerencie registros de metros cúbicos por veículo</p>
      </div>

      {/* Upload Card */}
      <Card className="bg-white border-slate-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#FDB913]" />
            Importar arquivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500 text-sm">
            O arquivo deve conter as colunas na ordem: <span className="text-slate-800 font-semibold">MÊS | PLACA | EQUIPAMENTO | M³</span>
          </p>

          <label className={`flex items-center gap-3 cursor-pointer w-fit px-5 py-2.5 rounded-lg font-medium text-sm transition
            ${uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#FDB913] hover:bg-amber-400 text-slate-900'}`}>
            <Upload className="w-4 h-4" />
            {uploading ? 'Importando...' : 'Selecionar arquivo (.xlsx)'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>

          {status && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
              status.type === 'success' ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-red-900/40 text-red-300 border border-red-700'
            }`}>
              {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {status.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete by month */}
      <Card className="bg-white border-red-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Excluir Registros por Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end">
            <div className="space-y-1 flex-1 max-w-xs">
              <Label className="text-slate-700 text-sm">Mês / Ano</Label>
              <Input
                type="month"
                value={deleteMes}
                onChange={(e) => setDeleteMes(e.target.value)}
                className="border-slate-200 text-slate-800"
              />
            </div>
            <Button
              onClick={handleDeleteMes}
              disabled={isDeletingMes || !deleteMes}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              {isDeletingMes ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</> : <><Trash2 className="w-4 h-4 mr-2" />Excluir</>}
            </Button>
          </div>
          {deleteStatus && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
              deleteStatus.type === 'success' ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-red-900/40 text-red-300 border border-red-700'
            }`}>
              {deleteStatus.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {deleteStatus.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Edit Card */}
      {selected.size > 0 && (
        <Card className="bg-blue-50 border-blue-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-800 text-base">
              {selected.size} registro(s) selecionado(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 text-sm">Campo a editar</Label>
                <select
                  value={editField || ''}
                  onChange={(e) => { setEditField(e.target.value); setEditValue(''); }}
                  className="w-full bg-white text-slate-800 border border-blue-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">-- selecione --</option>
                  <option value="mes">Mês</option>
                  <option value="equipamento">Equipamento</option>
                  <option value="metros_cubicos">M³</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 text-sm">Novo valor</Label>
                {editField === 'mes' ? (
                  <Input
                    type="month"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="border-blue-300 text-slate-800"
                  />
                ) : (
                  <Input
                    type={editField === 'metros_cubicos' ? 'number' : 'text'}
                    step={editField === 'metros_cubicos' ? '0.01' : undefined}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Digite o novo valor"
                    className="border-blue-300 text-slate-800"
                  />
                )}
              </div>
              <div className="flex gap-2 items-end">
                <Button
                  onClick={handleBulkEdit}
                  disabled={isEditing || !editField || !editValue}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isEditing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando...</> : 'Atualizar'}
                </Button>
                <Button
                  onClick={() => setSelected(new Set())}
                  variant="outline"
                  className="text-slate-600"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      {records.length > 10000 && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Carregando todos os registros:</strong> Encontrados {records.length.toLocaleString('pt-BR')} registros de M³. A tabela está exibindo todos eles.
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800 text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-slate-700 text-sm">Mês</Label>
              <select
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded px-3 py-2 text-sm"
              >
                <option value="">Todos os meses</option>
                {uniqueMeses.map(mes => (
                  <option key={mes} value={mes}>{mes}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 text-sm">Placa</Label>
              <select
                value={filterPlaca}
                onChange={(e) => setFilterPlaca(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded px-3 py-2 text-sm"
              >
                <option value="">Todas as placas</option>
                {uniquePlacas.map(placa => (
                  <option key={placa} value={placa}>{placa}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 text-sm">Equipamento</Label>
              <select
                value={filterEquipamento}
                onChange={(e) => setFilterEquipamento(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded px-3 py-2 text-sm"
              >
                <option value="">Todos os equipamentos</option>
                {uniqueEquipamentos.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
          </div>
          {(filterMes || filterPlaca || filterEquipamento) && (
            <Button
              onClick={() => {
                setFilterMes('');
                setFilterPlaca('');
                setFilterEquipamento('');
              }}
              variant="outline"
              className="mt-3 text-slate-600"
            >
              Limpar Filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-slate-200 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-800 text-base">
            Registros ({sortedRecords.length} de {records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selected.size === sortedRecords.length && sortedRecords.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('mes')}>Mês<SortIcon field="mes" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('placa')}>Placa<SortIcon field="placa" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('equipamento')}>Equipamento<SortIcon field="equipamento" /></TableHead>
                  <TableHead className="text-slate-600 text-right cursor-pointer select-none" onClick={() => toggleSort('m3')}>M³<SortIcon field="m3" /></TableHead>
                  <TableHead className="text-slate-600 text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">Carregando...</TableCell>
...
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">Nenhum registro encontrado</TableCell>
                  </TableRow>
                ) : (
                  sortedRecords.map((r) => (
                    <TableRow key={r.id} className={`border-slate-200 hover:bg-slate-50 ${selected.has(r.id) ? 'bg-blue-100' : ''}`}>
                      <TableCell className="text-center w-10">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-slate-800">{formatMes(r.mes)}</TableCell>
                      <TableCell className="text-slate-800 font-mono">{r.placa}</TableCell>
                      <TableCell className="text-slate-600">{placaEquipamentosMap[String(r.placa).toUpperCase()] || r.equipamento || '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">
                        {r.metros_cubicos?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 h-7 w-7"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}