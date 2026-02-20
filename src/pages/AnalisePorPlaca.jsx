import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';

export default function AnalisePorPlaca() {
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    plate: '',
    unit: '',
    equipment: '',
    driver: ''
  });
  const [sortBy, setSortBy] = useState('month');
  const [sortDir, setSortDir] = useState('asc');

  const { data: records = [] } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: cubicMetros = [] } = useQuery({
    queryKey: ['cubicMetros'],
    queryFn: () => base44.entities.CubicMetros.list()
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ['Ponto'],
    queryFn: () => base44.entities.Ponto.list()
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ['Motorista'],
    queryFn: () => base44.entities.Motorista.list()
  });

  const { data: combustiveis = [] } = useQuery({
    queryKey: ['Combustivel'],
    queryFn: () => base44.entities.Combustivel.list()
  });

  const { data: placaEquipamentos = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const { data: frentistas = [] } = useQuery({
    queryKey: ['Frentista'],
    queryFn: () => base44.entities.Frentista.list()
  });

  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const combustiveisMap = Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome]));
  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Get unique filter values
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const years = [...new Set(records.map(r => r.date ? parseISO(r.date).getFullYear() : null))].filter(y => y !== null).sort((a, b) => b - a);
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const equipments = [...new Set(placaEquipamentos.map(p => p.tipo))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  // Agrupar por mês e placa
  const groupedData = {};

  records.forEach(r => {
    if (!r.date || !r.vehicle_plate) return;

    const month = parseISO(r.date).getMonth();
    const year = parseISO(r.date).getFullYear();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const plateKey = r.vehicle_plate.toUpperCase();
    const groupKey = `${monthKey}-${plateKey}`;

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        month: monthNames[month],
        year: year,
        monthKey: monthKey,
        plate: r.vehicle_plate,
        unit: r.unit,
        equipment: placaEquipamentosMap[plateKey] || r.vehicle_type || '',
        vehicle_type: r.vehicle_type,
        driver: r.driver,
        fuelType: r.fuel_type,
        totalLiters: 0,
        kmRecords: [],
        cost: 0,
        recordCount: 0
      };
    }

    groupedData[groupKey].totalLiters += r.liters || 0;
    groupedData[groupKey].cost += r.cost || 0;
    if (Number(r.km_driven) > 0) {
      groupedData[groupKey].kmRecords.push(Number(r.km_driven));
    }
    groupedData[groupKey].recordCount += 1;
  });

  // Calcular delta KM e M³
  const analysisData = Object.values(groupedData).map(item => {
    const kmDelta = item.kmRecords.length > 0 
      ? Math.max(...item.kmRecords) - Math.min(...item.kmRecords)
      : 0;

    const m3Data = cubicMetros.find(cm => 
      String(cm.placa).toUpperCase() === String(item.plate).toUpperCase() && 
      cm.mes === item.monthKey
    );
    const m3 = m3Data ? Number(m3Data.metros_cubicos) : 0;

    return {
      month: item.month,
      plate: item.plate,
      unit: pontosMap[String(item.unit)] || item.unit || '-',
      equipment: placaEquipamentosMap[String(item.plate).toUpperCase()] || '-',
      vehicle_type: item.vehicle_type || '-',
      driver: motoristasMap[String(item.driver)] || item.driver || '-',
      fuelType: combustiveisMap[String(item.fuelType)] || item.fuelType || '-',
      totalLiters: item.totalLiters,
      kmDelta: kmDelta,
      m3: m3,
      cost: item.cost,
      efficiency: item.totalLiters > 0 ? (kmDelta / item.totalLiters).toFixed(2) : 0,
      efficiencyCost: item.cost > 0 ? (item.cost / kmDelta).toFixed(2) : 0
    };
  });

  // Aplicar filtros
  const filtered = analysisData.filter(item => {
    if (filters.month && !item.month.includes(monthNames[parseInt(filters.month)])) return false;
    if (filters.year && !item.month.includes(filters.year)) return false;
    if (filters.plate && !item.plate.toUpperCase().includes(filters.plate.toUpperCase())) return false;
    if (filters.unit && !item.unit.includes(filters.unit)) return false;
    if (filters.equipment && item.equipment !== filters.equipment) return false;
    if (filters.driver && !item.driver.toLowerCase().includes(filters.driver.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let valA, valB;
    if (sortBy === 'month') { valA = monthNames.indexOf(a.month); valB = monthNames.indexOf(b.month); }
    else if (sortBy === 'plate') { valA = a.plate; valB = b.plate; }
    else if (sortBy === 'unit') { valA = a.unit; valB = b.unit; }
    else if (sortBy === 'equipment') { valA = a.equipment; valB = b.equipment; }
    else if (sortBy === 'driver') { valA = a.driver; valB = b.driver; }
    else if (sortBy === 'fuelType') { valA = a.fuelType; valB = b.fuelType; }
    else if (sortBy === 'totalLiters') { valA = a.totalLiters; valB = b.totalLiters; }
    else if (sortBy === 'kmDelta') { valA = a.kmDelta; valB = b.kmDelta; }
    else if (sortBy === 'm3') { valA = a.m3; valB = b.m3; }
    else if (sortBy === 'cost') { valA = a.cost; valB = b.cost; }
    else if (sortBy === 'efficiency') { valA = parseFloat(a.efficiency); valB = parseFloat(b.efficiency); }
    else if (sortBy === 'efficiencyCost') { valA = parseFloat(a.efficiencyCost); valB = parseFloat(b.efficiencyCost); }
    
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : (valA < valB ? -1 : valA > valB ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-yellow-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Análise por Placa - Concretar Concreto Usinado', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | ${filtered.length} registros`, 14, 21);

    const head = [['Mês', 'Placa', 'Usina', 'Equipamento', 'Motorista', 'Combustível', 'Litros', 'KM', 'M³', 'Valor (R$)', 'KM/L', 'R$/KM']];
    const body = filtered.map(item => [
      item.month,
      item.plate,
      item.unit,
      item.equipment,
      item.driver,
      item.fuelType,
      item.totalLiters.toFixed(2),
      item.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
      item.m3.toFixed(2),
      `R$ ${item.cost.toFixed(2)}`,
      `${item.efficiency}`,
      `R$ ${item.efficiencyCost}`
    ]);

    doc.autoTable({
      head,
      body,
      startY: 26,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    doc.save('analise-por-placa.pdf');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-6">Análise por Placa</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-6">
          <select 
            value={filters.month} 
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Mês</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.year} 
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Ano</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={filters.plate} 
            onChange={(e) => setFilters({...filters, plate: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Placa</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filters.unit} 
            onChange={(e) => setFilters({...filters, unit: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Usina</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>

          <select 
            value={filters.equipment} 
            onChange={(e) => setFilters({...filters, equipment: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Equipamento</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select 
            value={filters.driver} 
            onChange={(e) => setFilters({...filters, driver: e.target.value})}
            className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="">Motorista</option>
            {drivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400">Total de {filtered.length} registros</p>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            <FileDown className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('month')}>Mês<SortIcon field="month" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('plate')}>Placa<SortIcon field="plate" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('unit')}>Usina<SortIcon field="unit" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('equipment')}>Equipamentos<SortIcon field="equipment" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('driver')}>Motorista<SortIcon field="driver" /></TableHead>
                  <TableHead className="text-slate-300 cursor-pointer select-none" onClick={() => toggleSort('fuelType')}>Combustível<SortIcon field="fuelType" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('totalLiters')}>Litros<SortIcon field="totalLiters" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('kmDelta')}>KM (Máx - Mín)<SortIcon field="kmDelta" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('m3')}>M³<SortIcon field="m3" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('cost')}>Valor (R$)<SortIcon field="cost" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('efficiency')}>Eficiência (KM/L)<SortIcon field="efficiency" /></TableHead>
                  <TableHead className="text-slate-300 text-right cursor-pointer select-none" onClick={() => toggleSort('efficiencyCost')}>Eficiência (R$/KM)<SortIcon field="efficiencyCost" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-slate-400 py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item, idx) => (
                    <TableRow key={idx} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">{item.month}</TableCell>
                      <TableCell className="text-white font-mono font-bold">{item.plate}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{item.unit}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{item.equipment}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{item.driver}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{item.fuelType}</TableCell>
                      <TableCell className="text-white text-right">{item.totalLiters.toFixed(2)} L</TableCell>
                      <TableCell className="text-white text-right">{item.kmDelta.toLocaleString('pt-BR', {maximumFractionDigits: 0})} km</TableCell>
                      <TableCell className="text-white text-right">{item.m3.toFixed(2)} m³</TableCell>
                      <TableCell className="text-white text-right">R$ {item.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-yellow-400 text-right font-bold">{item.efficiency} km/L</TableCell>
                      <TableCell className="text-yellow-400 text-right font-bold">R$ {item.efficiencyCost}/km</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}