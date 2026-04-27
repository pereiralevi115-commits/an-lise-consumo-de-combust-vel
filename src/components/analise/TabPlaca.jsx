import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import DebugDriverPanel from '@/components/DebugDriverPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Pencil, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { monthNames } from '@/hooks/useAnaliseData';

const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span className="text-slate-400 ml-1">↕</span>;
  return <span className="text-[#FDB913] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

export default function TabPlaca({ data, cubicMetros, placaEquipamentos, exclusoesSet, pontosMap, motoristasMap, frentistasMap, months, years, plates, units, equipments, drivers }) {
  const [filters, setFilters] = useState({ month: '', year: '', plate: '', unit: '', equipment: '', driver: '' });
  const [sortBy, setSortBy] = useState('month');
  const [sortDir, setSortDir] = useState('asc');
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ unit: '', equipment: '' });
  const queryClient = useQueryClient();

  const filtered = data.filter(item => {
    if (filters.month && monthNames[parseInt(filters.month)] !== item.month) return false;
    if (filters.year && String(item.monthKey).split('-')[0] !== filters.year) return false;
    if (filters.plate && !item.plate.toUpperCase().includes(filters.plate.toUpperCase())) return false;
    if (filters.unit && item.unitCode !== filters.unit && !item.unit.includes(filters.unit)) return false;
    if (filters.equipment && item.equipment !== filters.equipment) return false;
    if (filters.driver) {
      const selectedName = (motoristasMap[String(filters.driver)] || frentistasMap[String(filters.driver)] || filters.driver).toUpperCase();
      const itemName = (item.driver || '').toUpperCase();
      if (!itemName.includes(selectedName) && itemName !== selectedName) return false;
    }
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
    else if (sortBy === 'efficiency') { valA = a.efficiency; valB = b.efficiency; }
    else if (sortBy === 'efficiencyCost') { valA = a.efficiencyCost; valB = b.efficiencyCost; }
    else { valA = a[sortBy]; valB = b[sortBy]; }
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : (valA < valB ? -1 : valA > valB ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const startEdit = (item) => {
    setEditingRow({ plate: item.plate, monthKey: item.monthKey });
    setEditValues({ unit: item.unit === '-' ? '' : item.unit, equipment: item.equipment === '-' ? '' : item.equipment });
  };
  const cancelEdit = () => setEditingRow(null);
  const saveEdit = async (item) => {
    const cm = cubicMetros.find(c => String(c.placa).toUpperCase() === String(item.plate).toUpperCase() && c.mes === item.monthKey);
    if (cm) {
      const updateData = {};
      if (editValues.equipment !== '') updateData.equipamento = editValues.equipment;
      if (editValues.unit !== '') updateData.unidade = editValues.unit;
      await base44.entities.CubicMetros.update(cm.id, updateData);
      queryClient.invalidateQueries({ queryKey: ['cubicMetros'] });
    }
    if (editValues.equipment !== '') {
      const pe = placaEquipamentos.find(p => String(p.placa).toUpperCase() === String(item.plate).toUpperCase());
      if (pe) await base44.entities.PlacaEquipamento.update(pe.id, { tipo: editValues.equipment });
      else await base44.entities.PlacaEquipamento.create({ placa: item.plate, tipo: editValues.equipment });
      queryClient.invalidateQueries({ queryKey: ['PlacaEquipamento'] });
    }
    setEditingRow(null);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const usableW = pageW - margin * 2;
    const cols = [
      { h: 'Mês', w: 0.07, align: 'left' }, { h: 'Placa', w: 0.07, align: 'left' },
      { h: 'Usina', w: 0.12, align: 'left' }, { h: 'Equipamento', w: 0.16, align: 'left' },
      { h: 'Combustível', w: 0.07, align: 'left' },
      { h: 'Litros', w: 0.09, align: 'right' }, { h: 'KM', w: 0.08, align: 'right' },
      { h: 'M³', w: 0.07, align: 'right' }, { h: 'Valor (R$)', w: 0.10, align: 'right' },
      { h: 'KM/L', w: 0.07, align: 'right' }, { h: 'R$/KM', w: 0.10, align: 'right' },
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
    doc.text('Análise por Placa - Concretar Concreto Usinado', margin, y); y += 5;
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | ${filtered.length} registros`, margin, y); y += 5;
    drawHeaders(y); y += 7;
    filtered.forEach((item, idx) => {
      if (y + 7 > pageH - 8) { doc.addPage(); y = 10; drawHeaders(y); y += 7; }
      drawRow([item.month, item.plate, item.unit, item.equipment, item.fuelType,
        item.totalLiters.toFixed(2), item.kmDelta > 0 ? item.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0',
        item.m3.toFixed(2), `R$ ${item.cost.toFixed(2)}`,
        item.efficiency > 0 ? item.efficiency.toFixed(2) : '0',
        item.efficiencyCost > 0 ? `R$ ${item.efficiencyCost.toFixed(2)}` : '-'
      ], y, idx % 2 === 0);
      y += 7;
    });
    doc.save('analise-por-placa.pdf');
  };

  return (
    <div className="space-y-4">
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
      </div>

      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Total de {filtered.length} registros</p>
        <button onClick={exportPDF} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-4 py-2 rounded-lg transition text-sm">
          <FileDown className="w-4 h-4" />Baixar PDF
        </button>
      </div>

      <Card className="bg-white border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  {[['month','Mês'],['plate','Placa'],['unit','Usina'],['equipment','Equipamentos'],['fuelType','Combustível']].map(([f,l]) => (
                    <TableHead key={f} className="text-slate-600 cursor-pointer select-none" onClick={() => toggleSort(f)}>{l}<SortIcon field={f} sortBy={sortBy} sortDir={sortDir} /></TableHead>
                  ))}
                  {[['totalLiters','Litros'],['kmDelta','KM (Máx - Mín)'],['m3','M³'],['cost','Valor (R$)'],['efficiency','Eficiência (KM/L)'],['efficiencyCost','Eficiência (R$/KM)']].map(([f,l]) => (
                    <TableHead key={f} className="text-slate-600 text-right cursor-pointer select-none" onClick={() => toggleSort(f)}>{l}<SortIcon field={f} sortBy={sortBy} sortDir={sortDir} /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-slate-400 py-8">Nenhum registro encontrado</TableCell></TableRow>
                ) : filtered.map((item, idx) => {
                 const isM3Only = item.totalLiters === 0 && item.kmDelta === 0 && item.cost === 0;
                 const isEditing = editingRow && editingRow.plate === item.plate && editingRow.monthKey === item.monthKey;
                 const excluded = exclusoesSet.has(`${String(item.plate).toUpperCase()}-${item.monthKey}`);
                 return (
                   <TableRow key={idx} className={`border-slate-200 ${isM3Only ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-slate-50'}`}>
                     <TableCell className="text-slate-800">{item.month}</TableCell>
                     <TableCell className="text-slate-800 font-mono font-bold">{item.plate}</TableCell>
                     <TableCell className="text-slate-600 text-sm">
                       {isM3Only && isEditing ? <input className="bg-slate-700 text-white rounded px-2 py-1 text-xs w-28 border border-green-500 outline-none" value={editValues.unit} onChange={e => setEditValues(v => ({ ...v, unit: e.target.value }))} placeholder="Usina..." /> : item.unit}
                     </TableCell>
                     <TableCell className="text-slate-600 text-sm">
                       {isM3Only && isEditing ? <input className="bg-slate-700 text-white rounded px-2 py-1 text-xs w-36 border border-green-500 outline-none" value={editValues.equipment} onChange={e => setEditValues(v => ({ ...v, equipment: e.target.value }))} placeholder="Equipamento..." /> : item.equipment}
                     </TableCell>
                     <TableCell className="text-slate-600 text-sm">{item.fuelType}</TableCell>
                      <TableCell className="text-slate-800 text-right">{item.totalLiters.toFixed(2)} L</TableCell>
                      <TableCell className="text-slate-800 text-right">{item.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</TableCell>
                      <TableCell className="text-slate-800 text-right">{item.m3.toFixed(2)} m³</TableCell>
                      <TableCell className="text-slate-800 text-right">R$ {item.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-amber-600 text-right font-bold">
                        {excluded ? <span className="text-red-400 text-xs font-normal italic">excluído</span> : `${item.efficiency} km/L`}
                      </TableCell>
                      <TableCell className="text-amber-600 text-right font-bold">
                        {excluded ? (
                          <span className="text-red-400 text-xs font-normal italic">excluído</span>
                        ) : isM3Only ? (
                          isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => saveEdit(item)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                              <button onClick={cancelEdit} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(item)} className="text-green-400 hover:text-green-300 flex items-center gap-1 ml-auto"><Pencil className="w-3 h-3" /></button>
                          )
                        ) : `R$ ${item.efficiencyCost}/km`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}