import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '@/components/Pagination';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, EyeOff, Eye, AlertTriangle, Edit2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { monthNames } from '@/hooks/useAnaliseData';
import BulkEditMotorista from './BulkEditMotorista';

const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span className="text-slate-400 ml-1">↕</span>;
  return <span className="text-[#FDB913] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

// Limites máximos de eficiência (km/L) por tipo de equipamento
const EFICIENCIA_MAXIMA_POR_EQUIPAMENTO = {
  'CAMINHÃO BETONEIRA': 2.5,
  'CAMINHAO BETONEIRA': 2.5,
  'VEICULO DE APOIO': 16,
  'VEICULOS DIREÇÃO': 18,
  'VEICULOS DIRECAO': 18,
  'BOMBA LANÇA': 2.5,
  'BOMBA LANCA': 2.5,
  'BOMBA ESTACIONÁRIA': 2.5,
  'BOMBA ESTACIONARIA': 2.5,
  'CAMINHÃO BASCULANTE': 5,
  'CAMINHAO BASCULANTE': 5,
  'OUTROS': 5,
};

// Limites mínimos de eficiência (km/L) por tipo de equipamento
const EFICIENCIA_MINIMA_POR_EQUIPAMENTO = {
  'CAMINHÃO BETONEIRA': 0.5,
  'CAMINHAO BETONEIRA': 0.5,
  'VEICULO DE APOIO': 7,
  'VEICULOS DIREÇÃO': 7,
  'VEICULOS DIRECAO': 7,
  'BOMBA LANÇA': 0.5,
  'BOMBA LANCA': 0.5,
  'BOMBA ESTACIONÁRIA': 0.5,
  'BOMBA ESTACIONARIA': 0.5,
  'CAMINHÃO BASCULANTE': 0.5,
  'CAMINHAO BASCULANTE': 0.5,
  'OUTROS': 7,
};

function getLimiteEficiencia(equipment) {
  const key = (equipment || 'OUTROS').toUpperCase().trim();
  return EFICIENCIA_MAXIMA_POR_EQUIPAMENTO[key] ?? 5;
}

function getLimiteMinimoEficiencia(equipment) {
  const key = (equipment || 'OUTROS').toUpperCase().trim();
  return EFICIENCIA_MINIMA_POR_EQUIPAMENTO[key] ?? 7;
}

// Detecta inconsistências em um registro unitário
function detectInconsistencias(item) {
  const issues = [];

  if (!item.driverCode || item.driver === '-') {
    issues.push('Sem motorista');
  }
  if (item.liters <= 0) {
    issues.push('Litros zerados');
  }
  if (item.liters > 900) {
    issues.push(`Litros muito alto (${item.liters.toFixed(0)} L)`);
  }
  // Não re-flagar KM/eficiência de registros cujo delta foi afetado por ocultos
  if (!item.spansHidden) {
    if (item.kmPercorrido === 0 && item.liters > 0) {
      issues.push('KM percorrido zerado');
    }
    if (item.kmPercorrido > 1700) {
      issues.push(`KM muito alto (${item.kmPercorrido} km)`);
    }
    const limiteMin = getLimiteMinimoEficiencia(item.equipment);
    if (item.efficiency > 0 && item.efficiency < limiteMin) {
      issues.push(`Eficiência muito baixa (${item.efficiency} km/L)`);
    }
    const limite = getLimiteEficiencia(item.equipment);
    if (item.efficiency > limite) {
      issues.push(`Eficiência muito alta (${item.efficiency} km/L)`);
    }
  }
  if (item.cost <= 0 && item.liters > 0) {
    issues.push('Custo zerado');
  }

  return issues;
}

export default function TabMotorista({ data, exclusoesSet, pontosMap, motoristasMap, frentistasMap, months, years, plates, units, equipments, drivers }) {
  const [filters, setFilters] = useState({ month: '', year: '', plate: '', unit: '', equipment: '', driver: '', soInconsistencias: false, mostrarOcultos: false });
  const [sortBy, setSortBy] = useState('driver');
  const [sortDir, setSortDir] = useState('asc');
  const [loadingId, setLoadingId] = useState(null);
  const [ocultandoTodas, setOcultandoTodas] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const [progresso, setProgresso] = useState(null);

  const ocultarTodasInconsistencias = async () => {
    const inconsistentes = data.filter(item => !item.oculto && detectInconsistencias(item).length > 0);
    if (inconsistentes.length === 0) return;
    setOcultandoTodas(true);
    setProgresso(`0 / ${inconsistentes.length}`);

    // Atualização otimística: marca todos como oculto no cache imediatamente
    const idsSet = new Set(inconsistentes.map(i => i.id));
    queryClient.setQueryData(['fuelRecords'], (old) =>
      old ? old.map(r => idsSet.has(r.id) ? { ...r, oculto: true } : r) : old
    );

    // bulkUpdate direto no SDK (até 500 por chamada) — sem overhead de função backend
    const updates = inconsistentes.map(item => ({ id: item.id, oculto: true }));
    const CHUNK = 500;
    let done = 0;
    try {
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await base44.entities.FuelRecord.bulkUpdate(chunk);
        done += chunk.length;
        setProgresso(`${done} / ${inconsistentes.length}`);
      }
    } catch (e) {
      // Reverte em caso de erro
      queryClient.setQueryData(['fuelRecords'], (old) =>
        old ? old.map(r => idsSet.has(r.id) ? { ...r, oculto: false } : r) : old
      );
    }
    queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    setOcultandoTodas(false);
    setProgresso(null);
  };

  const toggleOculto = async (item) => {
    setLoadingId(item.id);
    await base44.entities.FuelRecord.update(item.id, { oculto: !item.oculto });
    queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    setLoadingId(null);
  };

  const filtered = data.filter(item => {
    if (!filters.mostrarOcultos && item.oculto) return false;
    if (filters.month && monthNames[parseInt(filters.month)] !== item.month) return false;
    if (filters.year && String(item.monthKey).split('-')[0] !== filters.year) return false;
    if (filters.plate && item.plate.toUpperCase() !== filters.plate.toUpperCase()) return false;
    if (filters.unit && item.unitCode !== filters.unit) return false;
    if (filters.equipment && item.equipment !== filters.equipment) return false;
    if (filters.driver) {
      const selectedName = (motoristasMap[String(filters.driver)] || frentistasMap[String(filters.driver)] || filters.driver).toUpperCase();
      if (!(item.driver || '').toUpperCase().includes(selectedName)) return false;
    }
    if (filters.soInconsistencias && detectInconsistencias(item).length === 0) return false;
    return true;
  }).sort((a, b) => {
    let valA, valB;
    if (sortBy === 'month') { valA = monthNames.indexOf(a.month); valB = monthNames.indexOf(b.month); }
    else if (sortBy === 'liters') { valA = a.liters; valB = b.liters; }
    else if (sortBy === 'kmPercorrido') { valA = a.kmPercorrido; valB = b.kmPercorrido; }
    else if (sortBy === 'cost') { valA = a.cost; valB = b.cost; }
    else if (sortBy === 'efficiency') { valA = a.efficiency; valB = b.efficiency; }
    else if (sortBy === 'efficiencyCost') { valA = a.efficiencyCost; valB = b.efficiencyCost; }
    else { valA = a[sortBy] || ''; valB = b[sortBy] || ''; }
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB, 'pt-BR') : (valA < valB ? -1 : valA > valB ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const PAGE_SIZE = 100;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Médias aritméticas (soma dos valores individuais ÷ quantidade)
  const summary = useMemo(() => {
    let sumLiters = 0, sumKm = 0, sumCost = 0;
    let effSum = 0, effCount = 0, effCostSum = 0, effCostCount = 0;
    filtered.forEach(item => {
      if (item.oculto) return;
      sumLiters += item.liters || 0;
      sumKm += item.kmPercorrido || 0;
      sumCost += item.cost || 0;
      if (item.efficiency > 0) { effSum += item.efficiency; effCount++; }
      if (item.efficiencyCost > 0) { effCostSum += item.efficiencyCost; effCostCount++; }
    });
    return {
      sumLiters, sumKm, sumCost,
      avgEff: effCount > 0 ? effSum / effCount : 0,
      avgEffCost: effCostCount > 0 ? effCostSum / effCostCount : 0,
    };
  }, [filtered]);

  const totalInconsistencias = data.filter(item => !item.oculto && detectInconsistencias(item).length > 0).length;

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(item => item.id)));
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const usableW = pageW - margin * 2;
    const cols = [
      { h: 'Motorista', w: 0.20, align: 'left' }, { h: 'Mês', w: 0.07, align: 'left' },
      { h: 'Placa', w: 0.07, align: 'left' }, { h: 'Equipamento', w: 0.13, align: 'left' },
      { h: 'Usina', w: 0.11, align: 'left' }, { h: 'Combustível', w: 0.07, align: 'left' },
      { h: 'Litros', w: 0.07, align: 'right' }, { h: 'KM', w: 0.07, align: 'right' },
      { h: 'Valor (R$)', w: 0.09, align: 'right' }, { h: 'KM/L', w: 0.06, align: 'right' },
      { h: 'R$/KM', w: 0.06, align: 'right' },
    ];
    const colWidths = cols.map(c => c.w * usableW);
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const drawHeaders = (yPos) => {
      let x = margin;
      doc.setFillColor(30, 41, 59); doc.rect(margin, yPos, totalW, 7, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont(undefined, 'bold');
      cols.forEach((col, i) => {
        const cellX = col.align === 'right' ? x + colWidths[i] - 1.5 : x + 1.5;
        doc.text(col.h, cellX, yPos + 4.8, { align: col.align === 'right' ? 'right' : 'left' });
        x += colWidths[i];
      });
    };
    const drawRow = (rowData, yPos, isBg) => {
      let x = margin;
      if (isBg) { doc.setFillColor(245, 247, 250); doc.rect(margin, yPos, totalW, 7, 'F'); }
      doc.setTextColor(40, 40, 40); doc.setFontSize(6.5); doc.setFont(undefined, 'normal');
      rowData.forEach((text, i) => {
        const cellX = cols[i].align === 'right' ? x + colWidths[i] - 1.5 : x + 1.5;
        doc.text(String(text ?? '-'), cellX, yPos + 4.8, { align: cols[i].align === 'right' ? 'right' : 'left' });
        x += colWidths[i];
      });
      doc.setDrawColor(220, 220, 220); doc.line(margin, yPos + 7, margin + totalW, yPos + 7);
    };
    let y = 14;
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('Análise por Motorista - Concretar Concreto Usinado', margin, y); y += 5;
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | ${filtered.length} registros`, margin, y); y += 5;
    drawHeaders(y); y += 7;
    filtered.forEach((item, idx) => {
      if (y + 7 > pageH - 8) { doc.addPage(); y = 10; drawHeaders(y); y += 7; }
      drawRow([
        item.driver, item.month, item.plate, item.equipment, item.unit, item.fuelType,
        item.liters.toFixed(2),
        item.kmPercorrido > 0 ? item.kmPercorrido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0',
        `R$ ${item.cost.toFixed(2)}`,
        item.oculto ? 'oculto' : item.efficiency > 0 ? item.efficiency.toFixed(2) : '0',
        item.oculto ? 'oculto' : item.efficiencyCost > 0 ? `R$ ${item.efficiencyCost.toFixed(2)}` : '-'
      ], y, idx % 2 === 0);
      y += 7;
    });
    doc.save('analise-por-motorista.pdf');
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Mês</option>
          {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
        </select>
        <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.plate} onChange={e => setFilters({ ...filters, plate: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Placa</option>
          {plates.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.unit} onChange={e => setFilters({ ...filters, unit: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Usina</option>
          {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
        </select>
        <select value={filters.equipment} onChange={e => setFilters({ ...filters, equipment: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Equipamento</option>
          {equipments.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filters.driver} onChange={e => setFilters({ ...filters, driver: e.target.value })} className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
          <option value="">Motorista</option>
          {drivers.map(d => <option key={d} value={d}>{motoristasMap[String(d)] || frentistasMap[String(d)] || d}</option>)}
        </select>
      </div>

      {/* Barra de ação */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <p className="text-slate-500 text-sm">Total de {filtered.length} registros</p>
          {selectedIds.size > 0 && (
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
              {selectedIds.size} selecionados
            </span>
          )}
          {totalInconsistencias > 0 && (
            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {totalInconsistencias} inconsistência{totalInconsistencias > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters(f => ({ ...f, soInconsistencias: !f.soInconsistencias }))}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${filters.soInconsistencias ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            {filters.soInconsistencias ? 'Ver todos' : 'Ver inconsistências'}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkEdit(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              <Edit2 className="w-4 h-4" />
              Editar {selectedIds.size}
            </button>
          )}
          {totalInconsistencias > 0 && (
            <button
              onClick={ocultarTodasInconsistencias}
              disabled={ocultandoTodas}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" />
              {ocultandoTodas ? (progresso ? `Ocultando... ${progresso}` : 'Ocultando...') : `Ocultar ${totalInconsistencias} inconsistência${totalInconsistencias > 1 ? 's' : ''}`}
            </button>
          )}
          <button
            onClick={() => setFilters(f => ({ ...f, mostrarOcultos: !f.mostrarOcultos }))}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${filters.mostrarOcultos ? 'bg-slate-200 border-slate-400 text-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Eye className="w-4 h-4" />
            {filters.mostrarOcultos ? 'Ocultar ocultos' : 'Mostrar ocultos'}
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-4 py-2 rounded-lg transition text-sm">
            <FileDown className="w-4 h-4" />Baixar PDF
          </button>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1300px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </TableHead>
                  {[['driver','Motorista'],['month','Mês'],['plate','Placa'],['equipment','Equipamento'],['unit','Usina'],['fuelType','Combustível']].map(([f,l]) => (
                    <TableHead key={f} className="text-slate-600 cursor-pointer select-none" onClick={() => toggleSort(f)}>{l}<SortIcon field={f} sortBy={sortBy} sortDir={sortDir} /></TableHead>
                  ))}
                  {[['liters','Litros'],['kmPercorrido','KM'],['cost','Valor (R$)'],['efficiency','KM/L'],['efficiencyCost','R$/KM']].map(([f,l]) => (
                    <TableHead key={f} className="text-slate-600 text-right cursor-pointer select-none" onClick={() => toggleSort(f)}>{l}<SortIcon field={f} sortBy={sortBy} sortDir={sortDir} /></TableHead>
                  ))}
                  <TableHead className="text-slate-600 text-center w-10">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-slate-400 py-8">Nenhum registro encontrado</TableCell></TableRow>
                ) : paginated.map((item, idx) => {
                  const inconsistencias = detectInconsistencias(item);
                  const hasIssue = inconsistencias.length > 0;

                  let rowClass = 'border-slate-200 hover:bg-slate-50';
                  if (item.oculto) rowClass = 'border-slate-200 bg-slate-100 opacity-60 hover:opacity-80';
                  else if (hasIssue) rowClass = 'border-orange-200 bg-orange-50 hover:bg-orange-100';

                  return (
                    <TableRow key={item.id || idx} className={rowClass}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-slate-800 font-medium">
                        <div className="flex items-center gap-1">
                          {item.driver}
                          {hasIssue && !item.oculto && (
                            <span title={inconsistencias.join(' | ')} className="cursor-help">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        {hasIssue && !item.oculto && (
                          <div className="text-xs text-orange-600 mt-0.5 font-normal">
                            {inconsistencias.join(' · ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-800">{item.month}</TableCell>
                      <TableCell className="text-slate-800 font-mono font-bold">{item.plate}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{item.equipment}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{item.unit}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{item.fuelType}</TableCell>
                      <TableCell className="text-slate-800 text-right">{item.liters.toFixed(2)} L</TableCell>
                      <TableCell className="text-slate-800 text-right">{item.kmPercorrido > 0 ? item.kmPercorrido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} km</TableCell>
                      <TableCell className="text-slate-800 text-right">R$ {item.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-amber-600 text-right font-bold">
                        {item.oculto ? <span className="text-slate-400 text-xs font-normal italic">oculto</span> : item.efficiency > 0 ? `${item.efficiency} km/L` : <span className="text-slate-400">0</span>}
                      </TableCell>
                      <TableCell className="text-amber-600 text-right font-bold">
                        {item.oculto ? <span className="text-slate-400 text-xs font-normal italic">oculto</span> : item.efficiencyCost > 0 ? `R$ ${item.efficiencyCost}/km` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          title={item.oculto ? 'Revelar registro' : 'Ocultar do cálculo de média'}
                          onClick={() => toggleOculto(item)}
                          disabled={loadingId === item.id}
                          className={`p-1.5 rounded-lg transition ${item.oculto ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-100'}`}
                        >
                          {item.oculto ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td colSpan={10} className="px-3 py-2.5 text-slate-700 text-sm text-right">Média aritmética ({filtered.filter(i => !i.oculto).length} registros):</td>
                  <td className="px-3 py-2.5 text-amber-700 text-right text-sm">{summary.avgEff > 0 ? summary.avgEff.toFixed(2) + ' km/L' : '-'}</td>
                  <td className="px-3 py-2.5 text-amber-700 text-right text-sm">{summary.avgEffCost > 0 ? 'R$ ' + summary.avgEffCost.toFixed(2) + '/km' : '-'}</td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </CardContent>
      </Card>

      {showBulkEdit && (
        <BulkEditMotorista
          selectedIds={Array.from(selectedIds)}
          onClose={() => {
            setShowBulkEdit(false);
            setSelectedIds(new Set());
          }}
          data={data}
          pontosMap={pontosMap}
        />
      )}
    </div>
  );
}