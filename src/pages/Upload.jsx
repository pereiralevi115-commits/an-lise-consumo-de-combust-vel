import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generateTemplate', {});
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_combustivel.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      setResult({
        success: false,
        message: 'Erro ao baixar template'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.some(type => fileName.endsWith(type));
    
    if (!isValid) {
      setResult({
        success: false,
        message: 'Tipo de arquivo inválido. Use apenas arquivos Excel (.xlsx, .xls) ou CSV'
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Call backend function with FormData
      const response = await base44.functions.invoke('processExcel', formData);

      setResult({
        success: true,
        message: `${response.count} registros importados com sucesso!`,
        count: response.count
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Erro no upload:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao processar arquivo'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Upload de Dados</h1>
        <p className="text-slate-400">Carregue planilhas Excel ou CSV com os dados de combustível</p>
      </div>

      {/* Download Template */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              Template Excel
            </span>
            <Button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Template
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm">
            Baixe o template Excel com a estrutura correta e exemplos de dados. 
            Preencha com seus dados e faça o upload abaixo.
          </p>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-500" />
            Importar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 cursor-pointer hover:border-orange-500 hover:bg-slate-700/30 transition text-center">
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <p className="text-white font-medium">Processando arquivo...</p>
                  <p className="text-slate-400 text-sm">Isso pode levar alguns segundos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <UploadIcon className="w-12 h-12 text-slate-400" />
                  <div>
                    <p className="text-white font-medium mb-1">Clique para selecionar um arquivo</p>
                    <p className="text-slate-400 text-sm">Excel (.xlsx, .xls) ou CSV</p>
                  </div>
                </div>
              )}
            </div>
          </label>

          {result && (
            <Alert className={`mt-4 ${result.success ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <AlertDescription className={result.success ? 'text-green-200' : 'text-red-200'}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Formato do Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-300 space-y-3">
          <p className="text-sm">Colunas obrigatórias:</p>
          <div className="flex flex-wrap gap-2 text-xs mt-3">
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Data</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Hora</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Placa</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Tipo</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Usina</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Frentista</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Motorista</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Combustível</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Litros</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Km Rodado</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">Valor</span>
            <span className="bg-slate-900 px-2 py-1 rounded text-slate-300">M³</span>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            💡 Baixe o template acima para ter a estrutura correta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}