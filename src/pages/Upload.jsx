import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, RefreshCw, Truck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Upload() {
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [isImportingKorth, setIsImportingKorth] = useState(false);
  const [isProcessingExterno, setIsProcessingExterno] = useState(false);
  const [result, setResult] = useState(null);
  const [korthResult, setKorthResult] = useState(null);
  const [externoResult, setExternoResult] = useState(null);
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const queryClient = useQueryClient();

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setResult({
        success: false,
        message: 'Tipo de arquivo inválido. Use apenas arquivos Excel (.xlsx ou .xls)'
      });
      return;
    }

    setIsProcessingExcel(true);
    setResult(null);
    
    try {
      // Upload Excel
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Process Excel
      const response = await base44.functions.invoke('importExcel', {
        fileUrl: uploadResult.file_url
      });

      setResult({
        success: true,
        message: `${response.data.count} registros importados do Excel com sucesso!`,
        count: response.data.count
      });

      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      event.target.value = '';
    } catch (error) {
      console.error('Erro ao processar Excel:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao processar Excel'
      });
    } finally {
      setIsProcessingExcel(false);
    }
  };



  const handleExternoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setExternoResult({ success: false, message: 'Use apenas arquivos Excel (.xlsx ou .xls)' });
      return;
    }

    setIsProcessingExterno(true);
    setExternoResult(null);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('importExternoExcel', { fileUrl: uploadResult.file_url });
      const { count, duplicates } = response.data;
      setExternoResult({
        success: true,
        message: `${count} registros importados com sucesso!${duplicates > 0 ? ` (${duplicates} duplicatas ignoradas)` : ''}`
      });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      event.target.value = '';
    } catch (error) {
      setExternoResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao processar arquivo'
      });
    } finally {
      setIsProcessingExterno(false);
    }
  };

  const handleKorthImport = async () => {
    setIsImportingKorth(true);
    setKorthResult(null);
    try {
      const payload = {};
      if (dataIni) payload.dataIni = dataIni;
      if (dataFim) payload.dataFim = dataFim;

      const response = await base44.functions.invoke('importKorth', payload);
      setKorthResult({
        success: true,
        message: `${response.data.count} registros importados do Korth Guardian (${response.data.periodo})!`
      });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    } catch (error) {
      setKorthResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao importar do Korth Guardian'
      });
    } finally {
      setIsImportingKorth(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Upload de Dados</h1>
        <p className="text-slate-400">Importe arquivos PDF com os dados de combustível</p>
      </div>

      {/* Korth Guardian Integration */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border-blue-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            Importar do Korth Guardian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Busca os abastecimentos diretamente da API do Korth Guardian. Se não informar datas, importa o dia anterior automaticamente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Data Início</Label>
              <Input
                type="date"
                value={dataIni}
                onChange={(e) => setDataIni(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-sm">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <Button
            onClick={handleKorthImport}
            disabled={isImportingKorth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isImportingKorth ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Importar Agora</>
            )}
          </Button>
          {korthResult && (
            <Alert className={korthResult.success ? 'bg-blue-900/20 border-blue-600 text-blue-100' : 'bg-red-900/20 border-red-600 text-red-100'}>
              <AlertDescription className="flex items-center gap-2">
                {korthResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {korthResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Excel */}
          <Card className="bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
            Importar Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={isProcessingExcel}
              className="hidden"
            />
            <div className="border-2 border-dashed border-green-600 rounded-lg p-12 cursor-pointer hover:border-green-500 hover:bg-green-900/10 transition text-center">
              {isProcessingExcel ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                  <p className="text-white font-medium">Processando Excel...</p>
                  <p className="text-slate-400 text-sm">Aguarde enquanto lemos o arquivo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileSpreadsheet className="w-12 h-12 text-green-400" />
                  <div>
                    <p className="text-white font-medium mb-1">Clique para selecionar um Excel</p>
                    <p className="text-slate-400 text-sm">Arquivos .xlsx ou .xls com dados de combustível</p>
                  </div>
                </div>
              )}
            </div>
          </label>

          {result && (
            <Alert className={result.success ? 'bg-green-900/20 border-green-600 text-green-100' : 'bg-red-900/20 border-red-600 text-red-100'}>
              <AlertDescription className="flex items-center gap-2">
                {result.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}