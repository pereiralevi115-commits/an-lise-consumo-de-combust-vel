import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function TemplateDownload() {
  const handleDownloadTemplate = () => {
    const templateData = `MONTH,LITERS,KILOMETERS,COST
September,5000,12000,15000
October,5200,13000,16000
November,4800,11500,14500
December,5100,12500,15500

PLANT,TOTAL_COST
Usina A,25000
Usina B,20000
Usina C,18000

PLATE,KILOMETERS
ABC-1234,15000
XYZ-5678,12000
DEF-9012,14000

DRIVER,KILOMETERS
João Silva,15000
Maria Santos,12000
Pedro Costa,14000

EQUIPMENT_TYPE,PRODUCTION_M3
Escavadeira,500
Retroescavadeira,450
Pá Carregadeira,550`;

    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_relatorio_diesel.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      onClick={handleDownloadTemplate}
      variant="outline"
      size="sm"
      className="border-amber-600 text-amber-600 hover:bg-amber-600/10"
    >
      <Download className="w-4 h-4 mr-2" />
      Baixar Template
    </Button>
  );
}