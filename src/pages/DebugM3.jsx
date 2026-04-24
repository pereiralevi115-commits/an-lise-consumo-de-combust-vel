import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DebugM3() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebug = async () => {
      try {
        const res = await base44.functions.invoke('debugM3Totals', {});
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDebug();
  }, []);

  if (loading) return <div className="text-center py-12">Carregando análise...</div>;
  if (!data) return <div className="text-center py-12">Erro ao carregar dados</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Debug M³</h1>
        <p className="text-slate-500">Análise de discrepâncias nos registros de metros cúbicos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalCubicMetros}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total M³ (Somado)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalM3Geral.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Duplicatas Encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{data.duplicateRecords.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Grupos (Placa/Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.allGroupedRecords}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Resumo por Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.equipmentTotals).map(([eq, total]) => (
              <div key={eq} className="flex justify-between">
                <span className="text-slate-700">{eq}</span>
                <span className="font-bold text-slate-800">{total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} M³</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.duplicateRecords.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              ⚠️ {data.duplicateRecords.length} Registros com Duplicatas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-100">
                    <TableHead>Placa</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead className="text-right">Soma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.duplicateRecords.map((d, i) => (
                    <TableRow key={i} className="border-red-200 hover:bg-red-100">
                      <TableCell className="font-mono">{d.placa}</TableCell>
                      <TableCell>{d.mes}</TableCell>
                      <TableCell>{d.equipamento}</TableCell>
                      <TableCell className="text-right font-bold">{d.recordCount}</TableCell>
                      <TableCell className="text-sm">
                        {d.valores.map((v, j) => (
                          <div key={j}>{v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-bold">{d.soma.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}