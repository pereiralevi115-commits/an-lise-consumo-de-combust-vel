import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function UploadSection({ onReportCreated }) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await base44.functions.invoke('extractDieselData', formData);
      
      setUploadSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['dieselReports'] });
      onReportCreated();

      setTimeout(() => setUploadSuccess(false), 3000);
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao processar o arquivo: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-8 border-slate-700 bg-gradient-to-br from-slate-800 to-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          Carregar Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
            />
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 cursor-pointer hover:border-amber-500 hover:bg-slate-700/50 transition text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  <p className="text-slate-300">Processando arquivo...</p>
                </div>
              ) : uploadSuccess ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <p className="text-green-400">Arquivo processado com sucesso!</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 font-medium">Clique para selecionar um PDF</p>
                  <p className="text-slate-500 text-sm mt-1">ou arraste o arquivo aqui</p>
                </div>
              )}
            </div>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}