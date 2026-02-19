import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-yellow-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
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

        <p className="text-slate-400">Total de {filtered.length} registros</p>
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
                  <TableHead className="text-slate-300">Equipamento</TableHead>
                  <TableHead className="text-slate-300">Frentista</TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('driver')}>Motorista<SortIcon field="driver" /></TableHead>
                  <TableHead className="text-slate-300">Combustível</TableHead>
                  <TableHead className="text-slate-300 text-right">Litros</TableHead>
                  <TableHead className="text-slate-300 text-right">KM</TableHead>
                  <TableHead className="text-slate-300 text-right">Valor (R$)</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-slate-400 py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((record) => (
                    <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">
                        {record.date ? format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell className="text-white">{record.time}</TableCell>
                      <TableCell className="text-white font-mono">{record.vehicle_plate}</TableCell>

                      <TableCell className="text-slate-300 text-xs">{pontosMap[String(record.unit)] || record.unit || '-'}</TableCell>
                      <TableCell className="text-slate-300">{record.vehicle_type || '-'}</TableCell>
                      <TableCell className="text-slate-300">{frentistasMap[String(record.attendant)] || motoristasMap[String(record.attendant)] || record.attendant || '-'}</TableCell>
                      <TableCell className="text-slate-300">{motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '-'}</TableCell>
                      <TableCell className="text-slate-300">{combustiveisMap[String(record.fuel_type)] || record.fuel_type || '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.liters != null ? record.liters.toFixed(3) : '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.km_driven != null && record.km_driven > 0 ? record.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.cost != null && record.cost > 0 ? `R$ ${record.cost.toFixed(2)}` : '-'}</TableCell>
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