import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span className="text-slate-400 ml-1">↕</span>;
  return <span className="text-[#FDB913] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AbastecimentoDois() {
  const [filters, setFilters] = useState({ month: '', unit: '', equipment: '', plate: '', driver: '' });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: combustiveis = [] } = useQuery({ queryKey: ['Combustivel'], queryFn: () => base44.entities.Combustivel.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });
  const { data: precosCombustivel = [] } = useQuery({ queryKey: ['PrecoCombustivel'], queryFn: () => base44.entities.PrecoCombustivel.list() });

  const frentistasMap = Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome]));
  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const combustiveisMap = Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome]));
  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const equipments = [...new Set(records.map(r => placaEquipamentosMap[String(r.vehicle_plate).toUpperCase()]))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort((a, b) => {
    const nameA = motoristasMap[String(a)] || a;
    const nameB = motoristasMap[String(b)] || b;
    return nameA.localeCompare(nameB, 'pt-BR');
  });

  const getValor = (record) => {
    if (!record.korth_id) return record.cost != null && record.cost > 0 ? record.cost : null;
    const d = record.date ? parseISO(record.date) : null;
    const preco = d ? precosCombustivel.find(p =>
      String(p.ponto) === String(record.unit) &&
      Number(p.mes) === d.getMonth() &&
      Number(p.ano) === d.getFullYear()
    ) : null;
    return preco ? (record.liters || 0) * preco.preco_litro : null;
  };

  const filtered = records.filter(r => {
    if (filters.month && (!r.date || parseISO(r.date).getMonth() !== parseInt(filters.month))) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.equipment && placaEquipamentosMap[String(r.vehicle_plate).toUpperCase()] !== filters.equipment) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver && r.driver !== filters.driver) return false;
    return true;
  }).sort((a, b) => {
    let valA, valB;
    if (sortBy === 'date') {
      const da = (a.date || '') + ' ' + (a.time || '');
      const db = (b.date || '') + ' ' + (b.time || '');
      return sortDir === 'asc' ? (da < db ? -1 : da > db ? 1 : 0) : (da > db ? -1 : da < db ? 1 : 0);
    }
    if (sortBy === 'liters') { valA = a.liters || 0; valB = b.liters || 0; }
    else if (sortBy === 'km') { valA = a.km_driven || 0; valB = b.km_driven || 0; }
    else if (sortBy === 'cost') { valA = getValor(a) || 0; valB = getValor(b) || 0; }
    else if (sortBy === 'plate') { valA = a.vehicle_plate || ''; valB = b.vehicle_plate || ''; }
    else if (sortBy === 'unit') { valA = pontosMap[String(a.unit)] || a.unit || ''; valB = pontosMap[String(b.unit)] || b.unit || ''; }
    else if (sortBy === 'equipment') { valA = placaEquipamentosMap[String(a.vehicle_plate).toUpperCase()] || ''; valB = placaEquipamentosMap[String(b.vehicle_plate).toUpperCase()] || ''; }
    else if (sortBy === 'posto') { valA = frentistasMap[String(a.attendant)] || a.attendant || ''; valB = frentistasMap[String(b.attendant)] || b.attendant || ''; }
    else if (sortBy === 'driver') { valA = motoristasMap[String(a.driver)] || a.driver || ''; valB = motoristasMap[String(b.driver)] || b.driver || ''; }
    else if (sortBy === 'fuel') { valA = combustiveisMap[String(a.fuel_type)] || a.fuel_type || ''; valB = combustiveisMap[String(b.fuel_type)] || b.fuel_type || ''; }
    else { valA = ''; valB = ''; }
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB, 'pt-BR') : (valA < valB ? -1 : valA > valB ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  if (isLoading) return <div className="text-slate-600 text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-1">Abastecimento</h1>
        <p className="text-slate-500 mb-6">Registros detalhados de abastecimento</p>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
            <option value="">Todos os meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>
          <select value={filters.unit} onChange={e => setFilters({ ...filters, unit: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
            <option value="">Todas as usinas</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>
          <select value={filters.equipment} onChange={e => setFilters({ ...filters, equipment: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
            <option value="">Todos os equipamentos</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filters.plate} onChange={e => setFilters({ ...filters, plate: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
            <option value="">Todas as placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.driver} onChange={e => setFilters({ ...filters, driver: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
            <option value="">Todos os motoristas</option>
            {drivers.map(d => <option key={d} value={d}>{motoristasMap[String(d)] || d}</option>)}
          </select>
        </div>

        <p className="text-slate-500 text-sm">Total de {filtered.length} registros</p>
      </div>

      <Card className="bg-white border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  {[
                    ['date', 'Data'],
                    ['date', 'Hora'],
                    ['plate', 'Placa'],
                    ['unit', 'Usina'],
                    ['equipment', 'Equipamento'],
                    ['posto', 'Posto'],
                    ['driver', 'Motorista'],
                    ['fuel', 'Combustível'],
                  ].map(([field, label], i) => (
                    <TableHead
                      key={`${field}-${i}`}
                      className="text-slate-600 cursor-pointer select-none"
                      onClick={() => toggleSort(field === 'date' && i === 1 ? 'time' : field)}
                    >
                      {label}
                      <SortIcon field={field === 'date' && i === 1 ? 'time' : field} sortBy={sortBy} sortDir={sortDir} />
                    </TableHead>
                  ))}
                  {[['liters', 'Litros'], ['km', 'KM'], ['cost', 'Valor (R$)']].map(([field, label]) => (
                    <TableHead key={field} className="text-slate-600 text-right cursor-pointer select-none" onClick={() => toggleSort(field)}>
                      {label}<SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-slate-400 py-8">Nenhum registro encontrado</TableCell>
                  </TableRow>
                ) : filtered.map(record => {
                  const valor = getValor(record);
                  const rowClass = !record.korth_id ? 'border-slate-200 bg-green-50 hover:bg-green-100' : 'border-slate-200 hover:bg-slate-50';
                  return (
                    <TableRow key={record.id} className={rowClass}>
                      <TableCell className="text-slate-800">
                        {record.date ? format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-800">{record.time || '-'}</TableCell>
                      <TableCell className="text-slate-800 font-mono font-bold">{record.vehicle_plate || '-'}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{pontosMap[String(record.unit)] || record.unit || '-'}</TableCell>
                      <TableCell className="text-slate-600">{placaEquipamentosMap[String(record.vehicle_plate).toUpperCase()] || '-'}</TableCell>
                      <TableCell className="text-slate-600">{frentistasMap[String(record.attendant)] || motoristasMap[String(record.attendant)] || record.attendant || '-'}</TableCell>
                      <TableCell className="text-slate-600">
                        {(motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '-').toUpperCase()}
                      </TableCell>
                      <TableCell className="text-slate-600">{combustiveisMap[String(record.fuel_type)] || record.fuel_type || '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">{record.liters != null ? record.liters.toFixed(3) : '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">
                        {record.km_driven != null && record.km_driven > 0 ? record.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-800 text-right">
                        {valor != null ? `R$ ${valor.toFixed(2)}` : '-'}
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