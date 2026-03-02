import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, RefreshCw, Truck, Trash2 } from 'lucide-react';
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

      {/* Upload Abastecimentos Externos */}
      <Card className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-yellow-400" />
            Importar Abastecimentos Externos (Excel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">
            Colunas esperadas: DATA | HORA | PLACA | USINA | EQUIPAMENTOS | FRENTISTA | MOTORISTA | COMBUSTIVEL | LITROS | Hodômetro | Valor total
          </p>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExternoUpload}
              disabled={isProcessingExterno}
              className="hidden"
            />
            <div className="border-2 border-dashed border-yellow-600 rounded-lg p-10 cursor-pointer hover:border-yellow-500 hover:bg-yellow-900/10 transition text-center">
              {isProcessingExterno ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                  <p className="text-white font-medium">Processando...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Truck className="w-10 h-10 text-yellow-400" />
                  <p className="text-white font-medium">Clique para selecionar o Excel de externos</p>
                  <p className="text-slate-400 text-sm">Arquivos .xlsx ou .xls</p>
                </div>
              )}
            </div>
          </label>
          {externoResult && (
            <Alert className={`mt-3 ${externoResult.success ? 'bg-yellow-900/20 border-yellow-600 text-yellow-100' : 'bg-red-900/20 border-red-600 text-red-100'}`}>
              <AlertDescription className="flex items-center gap-2">
                {externoResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {externoResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </div>
  );
}