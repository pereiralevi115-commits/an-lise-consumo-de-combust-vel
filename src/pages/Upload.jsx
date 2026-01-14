import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Upload() {
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchData, setBatchData] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handlePDFUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      setResult({
        success: false,
        message: 'Tipo de arquivo inválido. Use apenas arquivos PDF'
      });
      return;
    }

    setIsProcessingPDF(true);
    setResult(null);
    
    try {
      // Upload PDF
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Process PDF
      const response = await base44.functions.invoke('processPDF', {
        fileUrl: uploadResult.file_url
      });

      setResult({
        success: true,
        message: `${response.data.count} registros importados do PDF com sucesso!`,
        count: response.data.count
      });

      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      event.target.value = '';
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao processar PDF'
      });
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchData.trim()) {
      setResult({
        success: false,
        message: 'Cole os dados do PDF no campo acima'
      });
      return;
    }

    setIsProcessingBatch(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('importPDFBatch', {
        textData: batchData,
        pageInfo: 'Dados colados manualmente'
      });

      setResult({
        success: true,
        message: `${response.data.count} registros importados com sucesso!`,
        count: response.data.count
      });

      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
      setBatchData('');
    } catch (error) {
      console.error('Erro ao importar lote:', error);
      setResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Erro ao processar dados'
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };



  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Upload de Dados</h1>
        <p className="text-slate-400">Importe arquivos PDF com os dados de combustível</p>
      </div>

      {/* Upload PDF */}
      <Card className="bg-gradient-to-r from-orange-900/20 to-orange-800/20 border-orange-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-500" />
            Importar PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              disabled={isProcessingPDF}
              className="hidden"
            />
            <div className="border-2 border-dashed border-orange-600 rounded-lg p-12 cursor-pointer hover:border-orange-500 hover:bg-orange-900/10 transition text-center">
              {isProcessingPDF ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <p className="text-white font-medium">Processando PDF...</p>
                  <p className="text-slate-400 text-sm">Isso pode levar alguns minutos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <UploadIcon className="w-12 h-12 text-orange-400" />
                  <div>
                    <p className="text-white font-medium mb-1">Clique para selecionar um PDF</p>
                    <p className="text-slate-400 text-sm">Apenas arquivos PDF com dados de combustível</p>
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

          {/* Importar dados em texto (para PDFs grandes) */}
          <Card className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border-blue-600">
          <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Importar Dados em Lote (PDFs Grandes)
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <p className="text-slate-300 text-sm">
            Para PDFs grandes, copie e cole os dados extraídos diretamente abaixo:
          </p>

          <Textarea
            value={batchData}
            onChange={(e) => setBatchData(e.target.value)}
            placeholder="Cole aqui os dados do PDF (formato: DATA HORA PLACA TIPO USINA FRENTISTA MOTORISTA COMBUSTÍVEL LITROS KM VALOR M³)"
            className="min-h-[300px] font-mono text-sm bg-slate-900/50 text-white border-blue-700"
            disabled={isProcessingBatch}
          />

          <Button
            onClick={handleBatchImport}
            disabled={isProcessingBatch || !batchData.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isProcessingBatch ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Importar Dados em Lote
              </>
            )}
          </Button>

          <div className="text-xs text-slate-400 bg-slate-900/30 p-3 rounded">
            <strong>Dica:</strong> Abra o PDF, selecione e copie os dados da tabela, depois cole aqui. 
            Cada linha deve conter: data, hora, placa, tipo, usina, frentista, motorista, combustível, litros, km, valor e m³.
          </div>
          </CardContent>
          </Card>
          </div>
          );
          }