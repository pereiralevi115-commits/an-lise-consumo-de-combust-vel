import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, TrendingUp } from 'lucide-react';

import UploadSection from '../components/UploadSection.js';
import MonthlyMetrics from '../components/MonthlyMetrics.js';
import PlantAnalysis from '../components/PlantAnalysis.js';
import VehicleAnalysis from '../components/VehicleAnalysis.js';
import DriverAnalysis from '../components/DriverAnalysis.js';
import EquipmentAnalysis from '../components/EquipmentAnalysis.js';

export default function Dashboard() {
  const [selectedReport, setSelectedReport] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['dieselReports'],
    queryFn: () => base44.entities.DieselReport.list('-updated_date', 50)
  });

  const latestReport = selectedReport || (reports && reports[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">Análise de Combustível Diesel</h1>
          </div>
          <p className="text-slate-400">Dashboard de BI - Eficiência e Custos Operacionais</p>
        </div>

        {/* Upload Section */}
        <UploadSection onReportCreated={() => {}} />

        {/* Reports List */}
        {reports.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Relatórios Disponíveis</h2>
            <div className="flex gap-2 flex-wrap">
              {reports.map((report) => (
                <Button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  variant={selectedReport?.id === report.id ? 'default' : 'outline'}
                  className={selectedReport?.id === report.id ? 'bg-amber-500 hover:bg-amber-600' : 'border-slate-600 text-white hover:bg-slate-800'}
                >
                  {report.file_name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {latestReport && (
          <div className="space-y-6">
            {/* Monthly Metrics */}
            <MonthlyMetrics data={latestReport.monthly_summary} />

            {/* Analysis Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PlantAnalysis plants={latestReport.by_plant} />
              <EquipmentAnalysis equipment={latestReport.by_equipment_type} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VehicleAnalysis vehicles={latestReport.by_vehicle} />
              <DriverAnalysis drivers={latestReport.by_driver} />
            </div>
          </div>
        )}

        {!latestReport && !isLoading && (
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="p-12 text-center">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum relatório disponível. Comece fazendo upload de um PDF.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}