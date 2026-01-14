import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Get unique filter values
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort();
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

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-6">Dados de Combustível</h1>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Select value={filters.month} onValueChange={(value) => setFilters({...filters, month: value})}>
            <SelectTrigger className="bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos meses</SelectItem>
              {months.map(m => <SelectItem key={m} value={m.toString()}>{monthNames[m]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
            <SelectTrigger className="bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos tipos</SelectItem>
              {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.unit} onValueChange={(value) => setFilters({...filters, unit: value})}>
            <SelectTrigger className="bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Usina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas usinas</SelectItem>
              {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.plate} onValueChange={(value) => setFilters({...filters, plate: value})}>
            <SelectTrigger className="bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Placa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas placas</SelectItem>
              {plates.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.driver} onValueChange={(value) => setFilters({...filters, driver: value})}>
            <SelectTrigger className="bg-slate-800 text-white border-slate-700">
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos motoristas</SelectItem>
              {drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
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
                  <TableHead className="text-slate-300">Tipo</TableHead>
                  <TableHead className="text-slate-300">Usina</TableHead>
                  <TableHead className="text-slate-300">Frentista</TableHead>
                  <TableHead className="text-slate-300">Motorista</TableHead>
                  <TableHead className="text-slate-300">Combustível</TableHead>
                  <TableHead className="text-slate-300 text-right">Litros</TableHead>
                  <TableHead className="text-slate-300 text-right">Km</TableHead>
                  <TableHead className="text-slate-300 text-right">Valor</TableHead>
                  <TableHead className="text-slate-300 text-right">M³</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-slate-400 py-8">
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
                      <TableCell className="text-slate-300">{record.vehicle_type}</TableCell>
                      <TableCell className="text-slate-300">{record.unit}</TableCell>
                      <TableCell className="text-slate-300">{record.attendant}</TableCell>
                      <TableCell className="text-slate-300">{record.driver}</TableCell>
                      <TableCell className="text-slate-300">{record.fuel_type}</TableCell>
                      <TableCell className="text-white text-right">{record.liters?.toFixed(1)}</TableCell>
                      <TableCell className="text-white text-right">{record.km_driven?.toFixed(0)}</TableCell>
                      <TableCell className="text-white text-right">R$ {record.cost?.toFixed(2)}</TableCell>
                      <TableCell className="text-white text-right">{record.cubic_meters?.toFixed(2)}</TableCell>
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