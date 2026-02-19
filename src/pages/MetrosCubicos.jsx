import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MetrosCubicos() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['CubicMetros'],
    queryFn: () => base44.entities.CubicMetros.list('-mes', 10000)
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
    await base44.entities.CubicMetros.delete(id);
    queryClient.invalidateQueries({ queryKey: ['CubicMetros'] });
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
      <h1 className="text-3xl font-bold text-white">M³ por Placa</h1>

      {/* Upload Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-400" />
            Importar arquivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            O arquivo deve conter as colunas na ordem: <span className="text-white font-semibold">MÊS | PLACA | EQUIPAMENTO | M³</span>
          </p>

          <label className={`flex items-center gap-3 cursor-pointer w-fit px-5 py-2.5 rounded-lg font-medium text-sm transition
            ${uploading ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'}`}>
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

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">
            Registros ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">Mês</TableHead>
                  <TableHead className="text-slate-300">Placa</TableHead>
                  <TableHead className="text-slate-300">Equipamento</TableHead>
                  <TableHead className="text-slate-300 text-right">M³</TableHead>
                  <TableHead className="text-slate-300 text-right w-16"></TableHead>
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
                  records.map((r) => (
                    <TableRow key={r.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">{formatMes(r.mes)}</TableCell>
                      <TableCell className="text-white font-mono">{r.placa}</TableCell>
                      <TableCell className="text-slate-300">{r.equipamento || '-'}</TableCell>
                      <TableCell className="text-white text-right">
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