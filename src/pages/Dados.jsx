import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dados() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  if (isLoading) {
    return <div className="text-white text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dados de Combustível</h1>
        <p className="text-slate-400">Total de {records.length} registros</p>
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
                {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-slate-400 py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                    <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">
                        {record.date ? format(new Date(record.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
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