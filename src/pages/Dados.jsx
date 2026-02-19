import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X } from 'lucide-react';

export default function Dados() {
  const [filters, setFilters] = useState({
    month: '',
    type: '',
    unit: '',
    plate: '',
    driver: ''
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingKm, setEditingKm] = useState(null); // { id, value }
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: combustiveis = [] } = useQuery({ queryKey: ['Combustivel'], queryFn: () => base44.entities.Combustivel.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });

  const frentistasMap = Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome]));
  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const combustiveisMap = Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome]));
  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  // Get unique filter values
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const types = [...new Set(records.map(r => r.vehicle_type))].filter(Boolean).sort();
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  // Apply filters
  const filtered = records.filter(r => {
    if (filters.month && parseISO(r.date).getMonth() !== parseInt(filters.month)) return false;
    if (filters.type && r.vehicle_type !== filters.type) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  }).sort((a, b) => {
    let valA, valB;
    if (sortBy === 'date') { valA = a.date || ''; valB = b.date || ''; }
    else if (sortBy === 'plate') { valA = a.vehicle_plate || ''; valB = b.vehicle_plate || ''; }
    else if (sortBy === 'unit') { valA = pontosMap[String(a.unit)] || a.unit || ''; valB = pontosMap[String(b.unit)] || b.unit || ''; }
    else if (sortBy === 'driver') { valA = motoristasMap[String(a.driver)] || a.driver || ''; valB = motoristasMap[String(b.driver)] || b.driver || ''; }
    else if (sortBy === 'equipamento') { valA = placaEquipamentosMap[String(a.vehicle_plate).toUpperCase()] || a.vehicle_type || ''; valB = placaEquipamentosMap[String(b.vehicle_plate).toUpperCase()] || b.vehicle_type || ''; }
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    const primarySort = sortDir === 'asc' ? cmp : -cmp;
    if (primarySort !== 0) return primarySort;
    // Sempre data decrescente como critério secundário
    return (b.date || '') < (a.date || '') ? -1 : (b.date || '') > (a.date || '') ? 1 : 0;
  });

  // Detectar inconsistências de KM por placa
  const kmInconsistencyIds = new Set();
  const KM_MAX_DIFF = 2000;

  const plateGroups = {};
  records.forEach(r => {
    const plate = r.vehicle_plate;
    if (!plate) return;
    if (!plateGroups[plate]) plateGroups[plate] = [];
    plateGroups[plate].push(r);
  });

  Object.values(plateGroups).forEach(group => {
    const sorted = [...group].sort((a, b) => {
      const da = (a.date || '') + ' ' + (a.time || '');
      const db = (b.date || '') + ' ' + (b.time || '');
      return da < db ? -1 : da > db ? 1 : 0;
    });

    const kmsWithValue = sorted.filter(r => Number(r.km_driven) > 0).map(r => Number(r.km_driven));
    const avgKm = kmsWithValue.length > 0 ? kmsWithValue.reduce((s, v) => s + v, 0) / kmsWithValue.length : 0;
    const threshold = Math.max(KM_MAX_DIFF, avgKm * 3);

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const km = Number(r.km_driven);

      // Regra 2: KM zerado ou vazio quando outros registros da placa têm KM
      if ((km == null || km === 0 || isNaN(km)) && kmsWithValue.length > 0) {
        kmInconsistencyIds.add(r.id);
        continue;
      }

      if (km > 0 && i > 0) {
        let prev = null;
        for (let j = i - 1; j >= 0; j--) {
          if (Number(sorted[j].km_driven) > 0) { prev = sorted[j]; break; }
        }
        if (prev) {
          const diff = km - Number(prev.km_driven);
          // Regra 1: hodômetro voltou
          if (diff < 0) {
            kmInconsistencyIds.add(r.id);
            kmInconsistencyIds.add(prev.id);
          }
          // Regra 3: diferença muito grande
          if (diff > threshold) {
            kmInconsistencyIds.add(r.id);
          }
        }
      }
    }
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-yellow-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const saveKm = async (id, value) => {
    const km = parseFloat(String(value).replace(',', '.'));
    if (!isNaN(km)) {
      await base44.entities.FuelRecord.update(id, { km_driven: km });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingKm(null);
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6 max-w-full">
      <div>
         <h1 className="text-3xl font-bold text-white mb-6">Dados de Combustível</h1>

         {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <select 
            value={filters.month} 
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.type} 
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos tipos</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={filters.unit} 
            onChange={(e) => setFilters({...filters, unit: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todas usinas</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>

          <select 
            value={filters.plate} 
            onChange={(e) => setFilters({...filters, plate: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todas placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filters.driver} 
            onChange={(e) => setFilters({...filters, driver: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
          >
            <option value="">Todos motoristas</option>
            {drivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-slate-400">Total de {filtered.length} registros</p>
          {kmInconsistencyIds.size > 0 && (
            <span className="flex items-center gap-2 text-red-400 text-sm">
              <span className="inline-block w-3 h-3 rounded bg-red-700"></span>
              {kmInconsistencyIds.size} registro(s) com inconsistência de KM
            </span>
          )}
        </div>
        </div>
  
      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('date')}>Data<SortIcon field="date" /></TableHead>
                  <TableHead className="text-slate-300">Hora</TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('plate')}>Placa<SortIcon field="plate" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('unit')}>Usina<SortIcon field="unit" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('equipamento')}>Equipamento<SortIcon field="equipamento" /></TableHead>
                  <TableHead className="text-slate-300">Frentista</TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('driver')}>Motorista<SortIcon field="driver" /></TableHead>
                  <TableHead className="text-slate-300">Combustível</TableHead>
                  <TableHead className="text-slate-300 text-right">Litros</TableHead>
                   <TableHead className="text-slate-300 text-right">KM</TableHead>
                   <TableHead className="text-slate-300 text-right">Valor (R$)</TableHead>
                   <TableHead className="text-slate-300">Data Criação</TableHead>
                   <TableHead className="text-slate-300">Criado por</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-slate-400 py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((record) => (
                    <TableRow key={record.id} className={`border-slate-700 ${kmInconsistencyIds.has(record.id) ? 'bg-red-900/40 hover:bg-red-900/50' : 'hover:bg-slate-700/30'}`}>
                      <TableCell className="text-white">
                        {record.date ? format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell className="text-white">{record.time}</TableCell>
                      <TableCell className="text-white font-mono">{record.vehicle_plate}</TableCell>

                      <TableCell className="text-slate-300 text-xs">{pontosMap[String(record.unit)] || record.unit || '-'}</TableCell>
                      <TableCell className="text-slate-300">{placaEquipamentosMap[String(record.vehicle_plate).toUpperCase()] || '-'}</TableCell>
                      <TableCell className="text-slate-300">{frentistasMap[String(record.attendant)] || motoristasMap[String(record.attendant)] || record.attendant || '-'}</TableCell>
                      <TableCell className="text-slate-300">{motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '-'}</TableCell>
                      <TableCell className="text-slate-300">{combustiveisMap[String(record.fuel_type)] || record.fuel_type || '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.liters != null ? record.liters.toFixed(3) : '-'}</TableCell>
                      <TableCell className="text-white text-right">
                        {kmInconsistencyIds.has(record.id) ? (
                          editingKm?.id === record.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                className="w-24 bg-slate-700 text-white border border-yellow-400 rounded px-2 py-0.5 text-right text-sm"
                                value={editingKm.value}
                                onChange={e => setEditingKm({ id: record.id, value: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveKm(record.id, editingKm.value);
                                  if (e.key === 'Escape') setEditingKm(null);
                                }}
                                autoFocus
                              />
                              <button onClick={() => saveKm(record.id, editingKm.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingKm(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <span
                              className="cursor-pointer underline decoration-dotted text-red-300 hover:text-yellow-300"
                              title="Clique para editar"
                              onClick={() => setEditingKm({ id: record.id, value: record.km_driven || '' })}
                            >
                              {record.km_driven != null && record.km_driven > 0 ? record.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                            </span>
                          )
                        ) : (
                          record.km_driven != null && record.km_driven > 0 ? record.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'
                        )}
                      </TableCell>
                      <TableCell className="text-white text-right">{record.cost != null && record.cost > 0 ? `R$ ${record.cost.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{record.created_date ? format(parseISO(record.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{record.created_by || '-'}</TableCell>
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