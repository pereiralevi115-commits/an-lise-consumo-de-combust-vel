import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export default function TemplateDownload() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('base44_token');
      const response = await fetch(`https://api.base44.com/apps/${window.APP_ID}/functions/generateTemplate/invoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar template');
      }
      
      const blob = await response.blob();
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
      alert('Erro ao baixar template: ' + (error.message || 'erro desconhecido'));
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