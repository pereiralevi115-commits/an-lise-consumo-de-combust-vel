import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

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
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Call backend function
      const response = await base44.functions.invoke('processExcel', {
        fileContent: base64,
        fileName: file.name
      });

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
          <p>O arquivo deve conter as seguintes colunas:</p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>date</strong> - Data do abastecimento</li>
            <li><strong>time</strong> - Hora do abastecimento</li>
            <li><strong>vehicle_plate</strong> - Placa do veículo</li>
            <li><strong>vehicle_type</strong> - Tipo de veículo (ex: Caminhão, Betoneira)</li>
            <li><strong>unit</strong> - Usina</li>
            <li><strong>attendant</strong> - Frentista</li>
            <li><strong>driver</strong> - Motorista</li>
            <li><strong>fuel_type</strong> - Tipo de combustível</li>
            <li><strong>liters</strong> - Quantidade em litros</li>
            <li><strong>km_driven</strong> - Quilômetros rodados</li>
            <li><strong>cost</strong> - Valor gasto em reais</li>
            <li><strong>cubic_meters</strong> - Metros cúbicos (M³)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}