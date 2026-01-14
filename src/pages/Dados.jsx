import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';

export default function Dados() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 1000)
  });

  // Get unique months and units
  const months = [...new Set(records.map(r => r.month))].filter(Boolean);
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean);

  // Filter records
  const filteredRecords = records.filter(r => {
    if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
    if (selectedUnit !== 'all' && r.unit !== selectedUnit) return false;
    if (searchTerm && !JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dados de Combustível</h1>
        <p className="text-slate-400">Total de {filteredRecords.length} registros</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 text-white border-slate-700"
                />
              </div>
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48 bg-slate-900 text-white border-slate-700">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-48 bg-slate-900 text-white border-slate-700">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas unidades</SelectItem>
                {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">Mês</TableHead>
                  <TableHead className="text-slate-300">Data</TableHead>
                  <TableHead className="text-slate-300">Placa</TableHead>
                  <TableHead className="text-slate-300">Tipo</TableHead>
                  <TableHead className="text-slate-300">Unidade</TableHead>
                  <TableHead className="text-slate-300">Motorista</TableHead>
                  <TableHead className="text-slate-300">Combustível</TableHead>
                  <TableHead className="text-slate-300 text-right">Litros</TableHead>
                  <TableHead className="text-slate-300 text-right">Km</TableHead>
                  <TableHead className="text-slate-300 text-right">Km/L</TableHead>
                  <TableHead className="text-slate-300 text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-slate-400 py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">{record.month}</TableCell>
                      <TableCell className="text-white">{record.date}</TableCell>
                      <TableCell className="text-white font-mono">{record.vehicle_plate}</TableCell>
                      <TableCell className="text-slate-300">{record.vehicle_type}</TableCell>
                      <TableCell className="text-slate-300">{record.unit}</TableCell>
                      <TableCell className="text-slate-300">{record.driver}</TableCell>
                      <TableCell className="text-slate-300">{record.fuel_type}</TableCell>
                      <TableCell className="text-white text-right">{record.liters?.toFixed(1)}</TableCell>
                      <TableCell className="text-white text-right">{record.km_driven?.toFixed(0)}</TableCell>
                      <TableCell className="text-white text-right">{record.efficiency?.toFixed(2)}</TableCell>
                      <TableCell className="text-white text-right">R$ {record.cost?.toFixed(2)}</TableCell>
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