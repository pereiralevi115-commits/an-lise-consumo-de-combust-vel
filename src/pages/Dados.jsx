import React, { useState, useMemo, useEffect } from 'react';
import Pagination from '@/components/Pagination';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, AlertTriangle, Trash2, EyeOff } from 'lucide-react';

export default function Dados() {
  const [filters, setFilters] = useState({
    month: '',
    unit: '',
    equipment: '',
    plate: '',
    driver: '',
    onlyInconsistent: false
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingKm, setEditingKm] = useState(null); // { id, value }
  const [editingPlate, setEditingPlate] = useState(null); // { id, value }
  const [editingDriver, setEditingDriver] = useState(null); // { id, value }
  const [editingTime, setEditingTime] = useState(null); // { id, value }
  const [editingLiters, setEditingLiters] = useState(null); // { id, value }
  const [editingUnit, setEditingUnit] = useState(null); // { id, value }
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const ignoreInconsistency = async (id) => {
    await base44.entities.FuelRecord.update(id, { oculto: true });
    queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
  };

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: combustiveis = [] } = useQuery({ queryKey: ['Combustivel'], queryFn: () => base44.entities.Combustivel.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });
  const { data: precosCombustivel = [] } = useQuery({ queryKey: ['PrecoCombustivel'], queryFn: () => base44.entities.PrecoCombustivel.list() });
  const frentistasMap = useMemo(() => Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome])), [frentistas]);
  const motoristasMap = useMemo(() => Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome])), [motoristas]);
  const pontosMap = useMemo(() => Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome])), [pontos]);
  const combustiveisMap = useMemo(() => Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome])), [combustiveis]);
  const placaEquipamentosMap = useMemo(() => Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo])), [placaEquipamentos]);

  // Get unique filter values
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const equipments = [...new Set(records.map(r => placaEquipamentosMap[String(r.vehicle_plate).toUpperCase()]))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).reduce((acc, code) => {
    const name = motoristasMap[String(code)] || frentistasMap[String(code)] || code;
    if (!acc.seen.has(name)) { acc.seen.add(name); acc.list.push(code); }
    return acc;
  }, { seen: new Set(), list: [] }).list.sort((a, b) => {
    const nameA = motoristasMap[String(a)] || frentistasMap[String(a)] || a;
    const nameB = motoristasMap[String(b)] || frentistasMap[String(b)] || b;
    return nameA.localeCompare(nameB, 'pt-BR');
  });


  // Detectar inconsistências de KM por placa — guarda razão para tooltip
  const { kmInconsistencyIds, kmInconsistencyReasons } = useMemo(() => {
  const kmInconsistencyIds = new Set();
  const kmInconsistencyReasons = {}; // id -> string[]
  const KM_MAX_DIFF = 1700;

  const addReason = (id, reason) => {
    if (!kmInconsistencyReasons[id]) kmInconsistencyReasons[id] = [];
    if (!kmInconsistencyReasons[id].includes(reason)) kmInconsistencyReasons[id].push(reason);
    kmInconsistencyIds.add(id);
  };

  const plateGroups = {};
  records.filter(r => !r.oculto).forEach(r => {
    const plate = r.vehicle_plate;
    if (!plate) return;
    if (!plateGroups[plate]) plateGroups[plate] = [];
    plateGroups[plate].push(r);
  });

  Object.values(plateGroups).forEach(group => {
    const sorted = [...group].sort((a, b) => {
      const da = (a.date || '') + ' ' + (a.time || '');
      const db = (b.date || '') + ' ' + (b.time || '');
      return da < db ? -1 : da > db ? 1 : 0;
    });

    const kmsWithValue = sorted.filter(r => Number(r.km_driven) > 0).map(r => Number(r.km_driven));

    const kmDateMap = {};
    sorted.forEach(r => {
      const km = Number(r.km_driven);
      if (km > 0) {
        if (!kmDateMap[km]) kmDateMap[km] = [];
        kmDateMap[km].push(r);
      }
    });
    Object.values(kmDateMap).forEach(sameKmRecords => {
      const uniqueDates = new Set(sameKmRecords.map(r => r.date));
      if (uniqueDates.size > 1) {
        sameKmRecords.forEach(r => addReason(r.id, `KM ${Number(r.km_driven).toLocaleString('pt-BR')} duplicado em datas diferentes. Verifique e corrija o hodômetro.`));
      }
      // KM duplicado na mesma data
      const byDate = {};
      sameKmRecords.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = [];
        byDate[r.date].push(r);
      });
      Object.entries(byDate).forEach(([date, recs]) => {
        if (recs.length > 1) {
          recs.forEach(r => addReason(r.id, `KM ${Number(r.km_driven).toLocaleString('pt-BR')} duplicado em ${date} — ${recs.length} registros com o mesmo hodômetro na mesma data.`));
        }
      });
    });

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const km = Number(r.km_driven);
      if ((km == null || km === 0 || isNaN(km)) && kmsWithValue.length > 0) {
        addReason(r.id, `KM não informado (hodômetro zerado). Clique no campo KM para corrigir.`);
        continue;
      }
      if (km > 0 && i > 0) {
        let prev = null;
        for (let j = i - 1; j >= 0; j--) {
          if (Number(sorted[j].km_driven) > 0) { prev = sorted[j]; break; }
        }
        if (prev) {
          const diff = km - Number(prev.km_driven);
          if (diff < 0) {
            addReason(r.id, `KM ${km.toLocaleString('pt-BR')} é menor que o anterior (${Number(prev.km_driven).toLocaleString('pt-BR')}). O hodômetro regrediu — verifique se a placa está correta ou corrija o KM.`);
            addReason(prev.id, `KM ${Number(prev.km_driven).toLocaleString('pt-BR')} seguido de regressão no registro de ${r.date}. Verifique os dois registros.`);
          }
          if (diff > KM_MAX_DIFF) {
            addReason(r.id, `Variação de KM muito alta: +${diff.toLocaleString('pt-BR')} km desde o abastecimento anterior (limite: ${KM_MAX_DIFF.toLocaleString('pt-BR')} km). Verifique se o hodômetro foi digitado corretamente.`);
          }
        }
      }
    }
  });

  return { kmInconsistencyIds, kmInconsistencyReasons };
  }, [records]);

  // Apply filters (kmInconsistencyIds computed above)
  const filtered = useMemo(() => records.filter(r => {
    if (filters.month && (!r.date || parseISO(r.date).getMonth() !== parseInt(filters.month))) return false;
    if (filters.unit && r.unit !== filters.unit) return false;
    if (filters.equipment && placaEquipamentosMap[String(r.vehicle_plate).toUpperCase()] !== filters.equipment) return false;
    if (filters.plate && r.vehicle_plate !== filters.plate) return false;
    if (filters.driver) {
      const selectedName = (motoristasMap[String(filters.driver)] || frentistasMap[String(filters.driver)] || filters.driver).toUpperCase();
      const recordName = (motoristasMap[String(r.driver)] || frentistasMap[String(r.driver)] || r.driver || '').toUpperCase();
      if (recordName !== selectedName) return false;
    }
    if (filters.onlyInconsistent && !kmInconsistencyIds.has(r.id)) return false;
    return true;
  }).sort((a, b) => {
    // Ordenação base: sempre data crescente, depois hora crescente
    const dateA = a.date || '';
    const dateB = b.date || '';
    const timeA = a.time || '';
    const timeB = b.time || '';

    // Se está ordenando por data ou hora, aplica direção escolhida
    if (sortBy === 'date') {
      if (dateA !== dateB) return sortDir === 'asc' ? (dateA < dateB ? -1 : 1) : (dateA > dateB ? -1 : 1);
      return sortDir === 'asc' ? (timeA < timeB ? -1 : timeA > timeB ? 1 : 0) : (timeA > timeB ? -1 : timeA < timeB ? 1 : 0);
    }
    if (sortBy === 'time') {
      if (timeA !== timeB) return sortDir === 'asc' ? (timeA < timeB ? -1 : 1) : (timeA > timeB ? -1 : 1);
      return sortDir === 'asc' ? (dateA < dateB ? -1 : dateA > dateB ? 1 : 0) : (dateA > dateB ? -1 : dateA < dateB ? 1 : 0);
    }

    // Para outros campos: ordena pelo campo, depois data crescente, depois hora crescente
    let valA, valB;
    if (sortBy === 'plate') { valA = a.vehicle_plate || ''; valB = b.vehicle_plate || ''; }
    else if (sortBy === 'unit') { valA = pontosMap[String(a.unit)] || a.unit || ''; valB = pontosMap[String(b.unit)] || b.unit || ''; }
    else if (sortBy === 'equipment') { valA = placaEquipamentosMap[String(a.vehicle_plate).toUpperCase()] || ''; valB = placaEquipamentosMap[String(b.vehicle_plate).toUpperCase()] || ''; }
    else if (sortBy === 'driver') { valA = motoristasMap[String(a.driver)] || a.driver || ''; valB = motoristasMap[String(b.driver)] || b.driver || ''; }
    else if (sortBy === 'fuel') { valA = combustiveisMap[String(a.fuel_type)] || a.fuel_type || ''; valB = combustiveisMap[String(b.fuel_type)] || b.fuel_type || ''; }
    else if (sortBy === 'attendant') { valA = frentistasMap[String(a.attendant)] || motoristasMap[String(a.attendant)] || a.attendant || ''; valB = frentistasMap[String(b.attendant)] || motoristasMap[String(b.attendant)] || b.attendant || ''; }
    else if (sortBy === 'liters') { return sortDir === 'asc' ? (a.liters || 0) - (b.liters || 0) : (b.liters || 0) - (a.liters || 0); }
    else if (sortBy === 'km') { return sortDir === 'asc' ? (a.km_driven || 0) - (b.km_driven || 0) : (b.km_driven || 0) - (a.km_driven || 0); }
    else if (sortBy === 'cost') {
      const getCost = (r) => {
        if (!r.korth_id) return r.cost || 0;
        const d = r.date ? parseISO(r.date) : null;
        const precoReg = d ? precosCombustivel.find(p => String(p.ponto) === String(r.unit) && Number(p.mes) === d.getMonth() && Number(p.ano) === d.getFullYear()) : null;
        return precoReg ? (r.liters || 0) * precoReg.preco_litro : 0;
      };
      return sortDir === 'asc' ? getCost(a) - getCost(b) : getCost(b) - getCost(a);
    }
    else { valA = ''; valB = ''; }

    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    const primarySort = sortDir === 'asc' ? cmp : -cmp;
    if (primarySort !== 0) return primarySort;
    if (dateA !== dateB) return dateA > dateB ? -1 : 1;
    return timeA > timeB ? -1 : timeA < timeB ? 1 : 0;
  }), [records, filters, kmInconsistencyIds, pontosMap, placaEquipamentosMap, motoristasMap, frentistasMap, combustiveisMap, precosCombustivel, sortBy, sortDir]);

  const PAGE_SIZE = 100;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setCurrentPage(1); }, [filters]);



  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-[#FDB913] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const saveKm = async (id, value) => {
    const km = parseFloat(String(value).replace(',', '.'));
    if (!isNaN(km)) {
      await base44.entities.FuelRecord.update(id, { km_driven: km });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingKm(null);
  };

  const savePlate = async (id, value) => {
    const plate = String(value).trim().toUpperCase();
    if (plate) {
      await base44.entities.FuelRecord.update(id, { vehicle_plate: plate });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingPlate(null);
  };

  const saveDriver = async (id, value) => {
    const driver = String(value).trim();
    if (driver) {
      await base44.entities.FuelRecord.update(id, { driver });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingDriver(null);
  };

  const saveLiters = async (id, value) => {
    const liters = parseFloat(String(value).replace(',', '.'));
    if (!isNaN(liters) && liters >= 0) {
      await base44.entities.FuelRecord.update(id, { liters });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingLiters(null);
  };

  const saveUnit = async (id, value) => {
    const unit = String(value).trim();
    if (unit) {
      await base44.entities.FuelRecord.update(id, { unit });
      queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    }
    setEditingUnit(null);
  };

  const saveTime = async (id, value) => {
    const time = String(value).trim();
    await base44.entities.FuelRecord.update(id, { time });
    queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
    setEditingTime(null);
  };

  const deleteRecord = async (record) => {
    if (!window.confirm(`Excluir o abastecimento de ${record.date ? format(parseISO(record.date), 'dd/MM/yyyy') : '?'} — placa ${record.vehicle_plate || '?'}?\n\nEste registro não será reimportado futuramente.`)) return;
    // Se tem korth_id, guarda na tabela de excluídos para não reimportar
    if (record.korth_id) {
      await base44.entities.KorthExcluido.create({
        korth_id: record.korth_id,
        vehicle_plate: record.vehicle_plate || '',
        date: record.date || '',
      });
    }
    await base44.entities.FuelRecord.delete(record.id);
    queryClient.invalidateQueries({ queryKey: ['fuelRecords'] });
  };



  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']; // months pt-BR



  if (isLoading) {
    return <div className="text-slate-600 text-center py-12">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-1">Dados de Combustível</h1>
        <p className="text-slate-500 mb-6">Registros detalhados de abastecimento</p>

         {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <select 
            value={filters.month} 
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos meses</option>
            {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
          </select>

          <select 
            value={filters.unit} 
            onChange={(e) => setFilters({...filters, unit: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todas usinas</option>
            {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
          </select>

          <select 
            value={filters.equipment} 
            onChange={(e) => setFilters({...filters, equipment: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos equipamentos</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select 
            value={filters.plate} 
            onChange={(e) => setFilters({...filters, plate: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todas placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filters.driver} 
            onChange={(e) => setFilters({...filters, driver: e.target.value})}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <option value="">Todos motoristas</option>
            {drivers.map(d => <option key={d} value={d}>{motoristasMap[String(d)] || d}</option>)}
          </select>


        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-slate-500">Total de {filtered.length} registros</p>
          {kmInconsistencyIds.size > 0 && (
            <span
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full cursor-pointer select-none transition ${filters.onlyInconsistent ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
              onClick={() => setFilters(f => ({...f, onlyInconsistent: !f.onlyInconsistent}))}
              title="Clique para filtrar inconsistências"
            >
              <AlertTriangle className="w-3 h-3" />
              {kmInconsistencyIds.size} inconsistência{kmInconsistencyIds.size > 1 ? 's' : ''}{filters.onlyInconsistent ? ' (mostrando)' : ''}
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-medium text-slate-500">Total Litros:</span>
              <span className="text-sm font-bold text-slate-800">
                {filtered.reduce((sum, r) => sum + (Number(r.liters) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#FDB913]/15 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-medium text-slate-500">Total Valor:</span>
              <span className="text-sm font-bold text-slate-800">
                R$ {filtered.reduce((sum, r) => {
                  if (!r.korth_id) return sum + (Number(r.cost) || 0);
                  const d = r.date ? parseISO(r.date) : null;
                  const precoReg = d ? precosCombustivel.find(p =>
                    String(p.ponto) === String(r.unit) &&
                    Number(p.mes) === d.getMonth() &&
                    Number(p.ano) === d.getFullYear()
                  ) : null;
                  return sum + (precoReg ? (Number(r.liters) || 0) * precoReg.preco_litro : 0);
                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        </div>
  
      {/* Table */}
      <Card className="bg-white border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-slate-50 bg-slate-50">
                  <TableHead className="text-slate-600 cursor-pointer select-none w-28" onClick={() => toggleSort('date')}>Data<SortIcon field="date" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-20" onClick={() => toggleSort('time')}>Hora<SortIcon field="time" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-24" onClick={() => toggleSort('plate')}>Placa<SortIcon field="plate" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-28" onClick={() => toggleSort('unit')}>Usina<SortIcon field="unit" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-36" onClick={() => toggleSort('equipment')}>Equipamentos<SortIcon field="equipment" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-36" onClick={() => toggleSort('attendant')}>Frentista<SortIcon field="attendant" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-40" onClick={() => toggleSort('driver')}>Motorista<SortIcon field="driver" /></TableHead>
                  <TableHead className="text-slate-600 cursor-pointer select-none w-24" onClick={() => toggleSort('fuel')}>Combustível<SortIcon field="fuel" /></TableHead>
                  <TableHead className="text-slate-600 text-right w-20 cursor-pointer select-none" onClick={() => toggleSort('liters')}>Litros<SortIcon field="liters" /></TableHead>
                  <TableHead className="text-slate-600 text-right w-24 cursor-pointer select-none" onClick={() => toggleSort('km')}>KM<SortIcon field="km" /></TableHead>
                  <TableHead className="text-slate-600 text-right w-24 cursor-pointer select-none" onClick={() => toggleSort('cost')}>Valor (R$)<SortIcon field="cost" /></TableHead>
                  <TableHead className="text-slate-600 text-center w-10"></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center text-slate-400 py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : paginated.map((record) => {
                    const hasIssue = kmInconsistencyIds.has(record.id);
                    const reasons = kmInconsistencyReasons[record.id] || [];
                    let rowClass = !record.korth_id ? 'border-slate-200 bg-green-50 hover:bg-green-100' : 'border-slate-200 hover:bg-slate-50';
                    if (hasIssue) rowClass = 'border-orange-200 bg-orange-50 hover:bg-orange-100';
                    return (
                    <TableRow key={record.id} className={rowClass}>
                      <TableCell className="text-slate-800">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1">
                            {record.date ? format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                            {hasIssue && (
                              <span title={reasons.join(' | ')} className="cursor-help">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                              </span>
                            )}
                          </span>
                          {hasIssue && (
                            <div className="text-xs text-orange-600 mt-0.5 font-normal">
                              {reasons.join(' · ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-800">
                         {editingTime?.id === record.id ? (
                           <div className="flex items-center gap-1">
                             <input
                               type="time"
                               className="w-28 bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-sm"
                              value={editingTime.value}
                              onChange={e => setEditingTime({ id: record.id, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveTime(record.id, editingTime.value);
                                if (e.key === 'Escape') setEditingTime(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveTime(record.id, editingTime.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingTime(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer underline decoration-dotted hover:text-[#FDB913] text-slate-800"
                            title="Clique para editar"
                            onClick={() => setEditingTime({ id: record.id, value: record.time || '' })}
                          >
                            {record.time || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-800 font-mono">
                         {editingPlate?.id === record.id ? (
                           <div className="flex items-center gap-1">
                             <input
                               type="text"
                               className="w-24 bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-sm font-mono uppercase"
                              value={editingPlate.value}
                              onChange={e => setEditingPlate({ id: record.id, value: e.target.value.toUpperCase() })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') savePlate(record.id, editingPlate.value);
                                if (e.key === 'Escape') setEditingPlate(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => savePlate(record.id, editingPlate.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingPlate(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer underline decoration-dotted hover:text-[#FDB913] text-slate-800"
                            title="Clique para editar"
                            onClick={() => setEditingPlate({ id: record.id, value: record.vehicle_plate || '' })}
                          >
                            {record.vehicle_plate || '-'}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-slate-600 text-xs">
                        {editingUnit?.id === record.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              className="bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-xs"
                              value={editingUnit.value}
                              onChange={e => setEditingUnit({ id: record.id, value: e.target.value })}
                              autoFocus
                            >
                              <option value="">-- selecione --</option>
                              {pontos.map(p => (
                                <option key={p.codigo} value={p.codigo}>{p.nome}</option>
                              ))}
                            </select>
                            <button onClick={() => saveUnit(record.id, editingUnit.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingUnit(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer underline decoration-dotted hover:text-[#FDB913] text-slate-600"
                            title="Clique para editar usina"
                            onClick={() => setEditingUnit({ id: record.id, value: record.unit || '' })}
                          >
                            {pontosMap[String(record.unit)] || record.unit || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{placaEquipamentosMap[String(record.vehicle_plate).toUpperCase()] || '-'}</TableCell>
                      <TableCell className="text-slate-600">{frentistasMap[String(record.attendant)] || motoristasMap[String(record.attendant)] || record.attendant || '-'}</TableCell>
                      <TableCell className="text-slate-600">
                        {editingDriver?.id === record.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              className="w-36 bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-sm"
                              value={editingDriver.value}
                              onChange={e => setEditingDriver({ id: record.id, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveDriver(record.id, editingDriver.value);
                                if (e.key === 'Escape') setEditingDriver(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveDriver(record.id, editingDriver.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingDriver(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer underline decoration-dotted hover:text-[#FDB913] text-slate-800"
                            title="Clique para editar"
                            onClick={() => setEditingDriver({ id: record.id, value: (motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '').toUpperCase() })}
                          >
                            {(motoristasMap[String(record.driver)] || frentistasMap[String(record.driver)] || record.driver || '-').toUpperCase()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{combustiveisMap[String(record.fuel_type)] || record.fuel_type || '-'}</TableCell>
                      <TableCell className="text-slate-800 text-right">
                        {editingLiters?.id === record.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="0.001"
                              className="w-24 bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-right text-sm"
                              value={editingLiters.value}
                              onChange={e => setEditingLiters({ id: record.id, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveLiters(record.id, editingLiters.value);
                                if (e.key === 'Escape') setEditingLiters(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveLiters(record.id, editingLiters.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingLiters(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer underline decoration-dotted hover:text-[#FDB913] text-slate-800"
                            title="Clique para editar"
                            onClick={() => setEditingLiters({ id: record.id, value: record.liters ?? '' })}
                          >
                            {record.liters != null ? record.liters.toFixed(3) : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-800 text-right">
                         {editingKm?.id === record.id ? (
                           <div className="flex items-center gap-1 justify-end">
                             <input
                               type="number"
                               className="w-24 bg-white text-slate-800 border border-[#FDB913] rounded px-2 py-0.5 text-right text-sm"
                              value={editingKm.value}
                              onChange={e => setEditingKm({ id: record.id, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveKm(record.id, editingKm.value);
                                if (e.key === 'Escape') setEditingKm(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveKm(record.id, editingKm.value)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingKm(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span
                            className={`cursor-pointer underline decoration-dotted hover:text-[#FDB913] ${hasIssue ? 'text-orange-600' : 'text-slate-800'}`}
                            title="Clique para editar"
                            onClick={() => setEditingKm({ id: record.id, value: record.km_driven || '' })}
                          >
                            {record.km_driven != null && record.km_driven > 0 ? record.km_driven.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-800 text-right">{(() => {
                        if (!record.korth_id) {
                          return record.cost != null && record.cost > 0 ? `R$ ${record.cost.toFixed(2)}` : '-';
                        }
                        const d = record.date ? parseISO(record.date) : null;
                        const precoReg = d ? precosCombustivel.find(p =>
                          String(p.ponto) === String(record.unit) &&
                          Number(p.mes) === d.getMonth() &&
                          Number(p.ano) === d.getFullYear()
                        ) : null;
                        if (!precoReg) return '-';
                        const val = (record.liters || 0) * precoReg.preco_litro;
                        return `R$ ${val.toFixed(2)}`;
                      })()}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasIssue && (
                            <button
                              onClick={() => ignoreInconsistency(record.id)}
                              className="text-orange-400 hover:text-slate-500 p-1 rounded hover:bg-slate-100 transition"
                              title="Ignorar inconsistência (não aparecerá mais como problema)"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteRecord(record)}
                            className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/30 transition"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      </TableRow>
                  );
                  })}
              </TableBody>
            </Table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </CardContent>
      </Card>
    </div>
  );
}