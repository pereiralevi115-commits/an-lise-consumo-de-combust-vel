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

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: combustiveis = [] } = useQuery({ queryKey: ['Combustivel'], queryFn: () => base44.entities.Combustivel.list() });

  const frentistasMap = Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome]));
  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const combustiveisMap = Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome]));

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
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">Data</TableHead>
                  <TableHead className="text-slate-300">Hora</TableHead>
                  <TableHead className="text-slate-300">Placa</TableHead>

                  <TableHead className="text-slate-300">Ponto (Usina)</TableHead>
                  <TableHead className="text-slate-300">Cód. Frentista</TableHead>
                  <TableHead className="text-slate-300">Cód. Motorista</TableHead>
                  <TableHead className="text-slate-300">Combustível</TableHead>
                  <TableHead className="text-slate-300 text-right">Litros</TableHead>
                  <TableHead className="text-slate-300 text-right">Medidor (km/h)</TableHead>
                  <TableHead className="text-slate-300 text-right">Valor (R$)</TableHead>
                  <TableHead className="text-slate-300 text-right">M³</TableHead>
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
                      <TableCell className="text-slate-300">{frentistasMap[String(record.attendant)] || motoristasMap[String(record.attendant)] || record.attendant || '-'}</TableCell>
                      <TableCell className="text-slate-300">{motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '-'}</TableCell>
                      <TableCell className="text-slate-300">{combustiveisMap[String(record.fuel_type)] || record.fuel_type || '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.liters != null ? record.liters.toFixed(3) : '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.km_driven != null && record.km_driven > 0 ? record.km_driven.toFixed(0) : '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.cost != null && record.cost > 0 ? `R$ ${record.cost.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-white text-right">{record.cubic_meters != null ? record.cubic_meters.toFixed(2) : '-'}</TableCell>
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