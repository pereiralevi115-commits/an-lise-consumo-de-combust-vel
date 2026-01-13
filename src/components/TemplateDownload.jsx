import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export default function TemplateDownload() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('generateTemplate');
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_relatorio_diesel.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      alert('Erro ao baixar template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownloadTemplate}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="border-amber-600 text-amber-600 hover:bg-amber-600/10"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {isLoading ? 'Gerando...' : 'Baixar Template'}
    </Button>
  );
}