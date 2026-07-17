import React, { useState, useMemo } from 'react';
import { useAnaliseData, monthNames as MONTH_NAMES } from '@/hooks/useAnaliseData';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';
import { Fuel, Gauge, DollarSign, Truck, TrendingUp, Layers } from 'lucide-react';
import ChartCard from '@/components/graficos/ChartCard';
import SectionHeader from '@/components/graficos/SectionHeader';
import KpiCard from '@/components/graficos/KpiCard';
import { COLORS, formatAbbrev, formatBR, CustomTooltip, TopLabel, OutsideLabel } from '@/components/graficos/chartHelpers';
import RankingContent from '@/components/graficos/RankingContent';
import RankingPlacasContent from '@/components/graficos/RankingPlacasContent';

const monthNames = MONTH_NAMES;

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const selectClass = "bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer";

export default function Graficos() {
  const [activeTab, setActiveTab] = useState('graficos');
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    unit: '',
    equipment: '',
    plate: '',
    driver: ''
  });

  const {
    analiseByPlaca: analysisData,
    analiseByMotorista,
    cubicMetros,
    exclusoesSet,
    pontosMap,
    motoristasMap,
    placaEquipamentosMap,
    months,
    monthYears,
    years,
    plates,
    equipments,
    isLoading,
  } = useAnaliseData();

  const units = useMemo(() => {
    const map = {};
    analysisData.forEach(d => {
      if (d.unitCode && !map[d.unitCode]) map[d.unitCode] = d.unit || d.unitCode;
    });
    return Object.entries(map).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [analysisData]);
  const drivers = useMemo(() => [...new Set(analysisData.map(d => d.driver))].filter(d => d && d !== '-').sort((a, b) => a.localeCompare(b, 'pt-BR')).reduce((acc, name) => {
    if (!acc.seen.has(name.toUpperCase())) { acc.seen.add(name.toUpperCase()); acc.list.push(name); }
    return acc;
  }, { seen: new Set(), list: [] }).list, [analysisData]);

  const filtered = useMemo(() => analysisData.filter(d => {
    if (filters.year && String(d.year) !== filters.year) return false;
    if (filters.month && d.monthKey !== filters.month) return false;
    if (filters.unit && d.unitCode !== filters.unit) return false;
    if (filters.equipment && d.equipment !== filters.equipment) return false;
    if (filters.plate && d.plate !== filters.plate) return false;
    if (filters.driver && d.driver !== filters.driver) return false;
    return true;
  }), [analysisData, filters, monthNames]);

  const totalLiters = filtered.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
  const totalCost = filtered.reduce((sum, d) => sum + (d.cost || 0), 0);

  const cubicMetrosFiltrados = cubicMetros.filter(cm => {
    if (!cm.mes) return false;
    if (filters.year && !cm.mes.startsWith(filters.year)) return false;
    if (filters.month && cm.mes !== filters.month) return false;
    if (filters.plate && String(cm.placa).toUpperCase() !== String(filters.plate).toUpperCase()) return false;
    return true;
  });

  const getTipoEquipamento = (cm) => {
    const raw = cm.equipamento || placaEquipamentosMap[String(cm.placa).toUpperCase()] || '';
    return raw.toUpperCase()
      .replace(/ESTACIONARIA/g, 'ESTACIONÁRIA')
      .replace(/CAMINHAO/g, 'CAMINHÃO');
  };

  const totalM3Betoneira = cubicMetrosFiltrados
    .filter(cm => { const t = getTipoEquipamento(cm); return t.includes('BETONEIRA'); })
    .reduce((sum, cm) => sum + Number(cm.metros_cubicos || 0), 0);

  const totalM3BombaLanca = cubicMetrosFiltrados
    .filter(cm => { const t = getTipoEquipamento(cm); return t.includes('BOMBA LANÇA') || t.includes('BOMBAL LANCA') || t.includes('BOMBA LANCA'); })
    .reduce((sum, cm) => sum + Number(cm.metros_cubicos || 0), 0);

  const totalM3BombaEstacionaria = cubicMetrosFiltrados
    .filter(cm => { const t = getTipoEquipamento(cm); return t.includes('BOMBA ESTACIONÁRIA') || t.includes('BOMBA ESTACIONARIA'); })
    .reduce((sum, cm) => sum + Number(cm.metros_cubicos || 0), 0);

  const monthlyData = {};
  filtered.forEach(d => {
    if (!monthlyData[d.month]) {
      monthlyData[d.month] = { name: d.month, liters: 0, km: 0, cost: 0 };
    }
    monthlyData[d.month].liters += d.totalLiters || 0;
    monthlyData[d.month].km += d.kmDelta || 0;
    monthlyData[d.month].cost += d.cost || 0;
  });
  const chartData = Object.values(monthlyData)
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

  const byUnitData = units.map(unit => {
    const unitData = filtered.filter(d => d.unit === unit.name);
    const liters = unitData.reduce((sum, d) => sum + (d.totalLiters || 0), 0);
    const km = unitData.reduce((sum, d) => sum + (d.kmDelta || 0), 0);
    const cost = unitData.reduce((sum, d) => sum + (d.cost || 0), 0);
    return { name: unit.name.replace('CONCRETAR ', ''), liters, km, cost, kmPerLiter: liters > 0 ? (km / liters) : 0 };
  })
    .filter(d => d.liters > 0 || d.km > 0 || d.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  const normalizeEquipment = (eq) => {
    if (!eq) return eq;
    return eq.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  };
  const equipmentDisplayName = (eq) => {
    if (!eq) return eq;
    const norm = normalizeEquipment(eq);
    if (norm === 'BOMBA ESTACIONARIA') return 'BOMBA ESTACIONÁRIA';
    if (norm === 'BOMBA LANCA' || norm === 'BOMBAL LANCA') return 'BOMBA LANÇA';
    if (norm.includes('BETONEIRA')) return 'CAMINHÃO BETONEIRA';
    return eq;
  };

  const byEquipmentData = {};
  filtered.forEach(d => {
    const rawEq = d.equipment && d.equipment !== '-' ? d.equipment : null;
    if (!rawEq) return;
    const eqType = equipmentDisplayName(rawEq);
    if (!byEquipmentData[eqType]) {
      byEquipmentData[eqType] = { liters: 0, cost: 0, m3: 0, km: 0 };
    }
    byEquipmentData[eqType].liters += d.totalLiters || 0;
    byEquipmentData[eqType].cost += d.cost || 0;
    byEquipmentData[eqType].m3 += d.m3 || 0;
    byEquipmentData[eqType].km += d.kmDelta || 0;
  });

  const equipmentArray = Object.entries(byEquipmentData)
    .map(([type, data]) => ({
      name: type,
      m3: data.m3,
      litersPerM3: data.m3 > 0 ? parseFloat((data.liters / data.m3).toFixed(2)) : 0,
      costPerM3: data.m3 > 0 ? parseFloat((data.cost / data.m3).toFixed(2)) : 0
    }))
    .filter(d => d.m3 > 0)
    .sort((a, b) => b.m3 - a.m3);

  // Ocultar registro só afeta a média de eficiência (efficiency=0 para ocultos) —
  // km, litros e custo continuam contando no total e nos gráficos
  const filteredMotorista = useMemo(() => analiseByMotorista.filter(d => {
    if (filters.year && String(d.year) !== filters.year) return false;
    if (filters.month && d.monthKey !== filters.month) return false;
    if (filters.unit && d.unitCode !== filters.unit) return false;
    if (filters.equipment && d.equipment !== filters.equipment) return false;
    if (filters.plate && d.plate.toUpperCase() !== filters.plate.toUpperCase()) return false;
    if (filters.driver && d.driver !== filters.driver) return false;
    return true;
  }), [analiseByMotorista, filters, monthNames]);

  const totalKm = filteredMotorista.reduce((sum, d) => sum + (d.kmPercorridoTotal || 0), 0);

  const unitEquipmentArray = useMemo(() => {
    const map = {};
    filteredMotorista.forEach(d => {
      const rawEq = d.equipment && d.equipment !== '-' ? d.equipment : null;
      if (!rawEq) return;
      const eqType = equipmentDisplayName(rawEq);
      if (!map[eqType]) map[eqType] = { effSum: 0, effCount: 0 };
      if (d.efficiency > 0) { map[eqType].effSum += d.efficiency; map[eqType].effCount++; }
    });
    return Object.entries(map)
      .map(([type, data]) => ({ name: type, kmPerLiter: data.effCount > 0 ? parseFloat((data.effSum / data.effCount).toFixed(2)) : 0 }))
      .filter(d => d.kmPerLiter > 0)
      .sort((a, b) => a.kmPerLiter - b.kmPerLiter);
  }, [filteredMotorista]);

  const byVehicleData = useMemo(() => {
    const map = {};
    filteredMotorista.forEach(d => {
      const key = String(d.plate).toUpperCase();
      if (!map[key]) map[key] = { plate: d.plate, liters: 0, km: 0, cost: 0, effSum: 0, effCount: 0, effCostSum: 0, effCostCount: 0 };
      map[key].liters += d.liters || 0;
      map[key].km += d.kmPercorrido || 0;
      map[key].cost += d.cost || 0;
      if (d.efficiency > 0) { map[key].effSum += d.efficiency; map[key].effCount++; }
      if (d.efficiencyCost > 0) { map[key].effCostSum += d.efficiencyCost; map[key].effCostCount++; }
    });
    return map;
  }, [filteredMotorista]);

  const vehicleKmArray = useMemo(() => Object.values(byVehicleData)
    .map(d => ({ placa: d.plate, km: d.km }))
    .filter(d => d.km > 0).sort((a, b) => b.km - a.km).slice(0, 15), [byVehicleData]);

  const vehicleKmLiterArray = useMemo(() => Object.values(byVehicleData)
    .map(d => ({ placa: d.plate, kmPerLiter: d.effCount > 0 ? parseFloat((d.effSum / d.effCount).toFixed(2)) : 0 }))
    .filter(d => d.kmPerLiter > 0).sort((a, b) => b.kmPerLiter - a.kmPerLiter).slice(0, 15), [byVehicleData]);

  const vehicleCostArray = useMemo(() => Object.values(byVehicleData)
    .map(d => ({ placa: d.plate, km: d.km, costPerKm: d.effCostCount > 0 ? parseFloat((d.effCostSum / d.effCostCount).toFixed(2)) : 0 }))
    .filter(d => d.km > 0 && d.costPerKm > 0 && isFinite(d.costPerKm)).sort((a, b) => b.costPerKm - a.costPerKm).slice(0, 15), [byVehicleData]);

  const byDriverData = useMemo(() => {
    const map = {};
    filteredMotorista.forEach(d => {
      const key = (d.driver || '-').toUpperCase();
      if (!map[key]) map[key] = { name: d.driver, liters: 0, km: 0, cost: 0, effSum: 0, effCount: 0, effCostSum: 0, effCostCount: 0 };
      map[key].liters += d.liters || 0;
      map[key].km += d.kmPercorrido || 0;
      map[key].cost += d.cost || 0;
      if (d.efficiency > 0) { map[key].effSum += d.efficiency; map[key].effCount++; }
      if (d.efficiencyCost > 0) { map[key].effCostSum += d.efficiencyCost; map[key].effCostCount++; }
    });
    return map;
  }, [filteredMotorista]);

  const driverKmArray = useMemo(() => Object.values(byDriverData)
    .map(d => ({ driver: getFirstAndLastName(d.name), km: d.km }))
    .filter(d => d.km > 0).sort((a, b) => b.km - a.km).slice(0, 15), [byDriverData]);

  const driverKmLiterArray = useMemo(() => Object.values(byDriverData)
    .map(d => ({ driver: getFirstAndLastName(d.name), kmPerLiter: d.effCount > 0 ? parseFloat((d.effSum / d.effCount).toFixed(2)) : 0 }))
    .filter(d => d.kmPerLiter > 0).sort((a, b) => b.kmPerLiter - a.kmPerLiter).slice(0, 15), [byDriverData]);

  const driverCostArray = useMemo(() => Object.values(byDriverData)
    .map(d => ({ driver: getFirstAndLastName(d.name), km: d.km, costPerKm: d.effCostCount > 0 ? parseFloat((d.effCostSum / d.effCostCount).toFixed(2)) : 0 }))
    .filter(d => d.km > 0 && d.costPerKm > 0 && isFinite(d.costPerKm)).sort((a, b) => b.costPerKm - a.costPerKm).slice(0, 15), [byDriverData]);

  if (isLoading) return <div className="text-slate-500 text-center py-12">Carregando dados...</div>;

  const axisProps = { stroke: '#94a3b8', fontSize: 11, tickLine: false };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Gráficos de Combustível</h1>
            <p className="text-sm text-slate-500 mt-1">Análise de consumo por período, usina, equipamento e motorista</p>
          </div>
          {activeTab === 'graficos' && (
            <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className={selectClass}>
              <option value="">Todos anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>

        {activeTab === 'graficos' && (
        <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
          <select value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} className={selectClass}>
            <option value="">Todos meses</option>
            {monthYears.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })} className={selectClass}>
            <option value="">Todas usinas</option>
            {units.map(u => <option key={u.code} value={u.code}>{u.name}</option>)}
          </select>
          <select value={filters.equipment} onChange={(e) => setFilters({ ...filters, equipment: e.target.value })} className={selectClass}>
            <option value="">Todos equipamentos</option>
            {equipments.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filters.plate} onChange={(e) => setFilters({ ...filters, plate: e.target.value })} className={selectClass}>
            <option value="">Todas placas</option>
            {plates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.driver} onChange={(e) => setFilters({ ...filters, driver: e.target.value })} className={selectClass}>
            <option value="">Todos motoristas</option>
            {drivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <p className="text-sm text-slate-400">Total de {filtered.length} registros</p>
        </>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 mt-5">
          <button onClick={() => setActiveTab('graficos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'graficos' ? 'border-slate-700 text-slate-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            Gráficos
          </button>
          <button onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ranking' ? 'border-slate-700 text-slate-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            Ranking de Motoristas
          </button>
          <button onClick={() => setActiveTab('rankingPlacas')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rankingPlacas' ? 'border-slate-700 text-slate-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            Ranking de Placas
          </button>
        </div>
      </div>

      {activeTab === 'graficos' && (
      <>
      {/* SEÇÃO: Visão Geral */}
      <div className="space-y-4">
        <SectionHeader title="Visão Geral" description="Indicadores principais e tendências mensais" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Total Litros" value={formatBR(totalLiters)} icon={Fuel} accentColor={COLORS.liters} />
          <KpiCard title="Total Km" value={formatBR(totalKm)} icon={Gauge} accentColor={COLORS.km} />
          <KpiCard title="Custo Total" value={'R$ ' + formatBR(totalCost)} icon={DollarSign} accentColor={COLORS.cost} />
          <KpiCard title="M³ Betoneira" value={formatBR(totalM3Betoneira)} icon={Truck} accentColor={COLORS.betoneira} />
          <KpiCard title="M³ Bomba Lança" value={formatBR(totalM3BombaLanca)} icon={TrendingUp} accentColor={COLORS.bombaLanca} />
          <KpiCard title="M³ Bomba Est." value={formatBR(totalM3BombaEstacionaria)} icon={Layers} accentColor={COLORS.bombaEst} />
        </div>

        <ChartCard title="Consumo Mensal" subtitle="Litros abastecidos, quilômetros percorridos e custos por mês">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" {...axisProps} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
              <Bar dataKey="liters" fill={COLORS.liters} name="Litros" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="liters" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
              <Bar dataKey="km" fill={COLORS.km} name="Km" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="km" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
              <Bar dataKey="cost" fill={COLORS.cost} name="Custo (R$)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cost" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consumo por Usina" subtitle="Litros, quilometragem e custos agrupados por unidade">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={byUnitData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" {...axisProps} angle={-30} textAnchor="end" height={70} interval={0} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
              <Bar dataKey="liters" fill={COLORS.liters} name="Litros" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="liters" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
              <Bar dataKey="km" fill={COLORS.km} name="Km" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="km" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
              <Bar dataKey="cost" fill={COLORS.cost} name="Custo (R$)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cost" position="top" formatter={(v) => formatBR(v)} fontSize={10} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* SEÇÃO: Análise por Equipamento */}
      <div className="space-y-4">
        <SectionHeader title="Análise por Equipamento" description="Eficiência e produção por tipo de equipamento" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Km/L por Equipamento" subtitle="Média de quilômetros por litro">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={unitEquipmentArray} margin={{ top: 30, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" {...axisProps} angle={-30} textAnchor="end" height={80} interval={0} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={COLORS.neutral} name="Km/L" radius={[4, 4, 0, 0]} label={<TopLabel suffix="Km/L" decimals={2} />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Produção (M³)" subtitle="Volume de produção por tipo de equipamento">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={equipmentArray} margin={{ top: 30, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" {...axisProps} angle={-30} textAnchor="end" height={80} interval={0} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="m3" fill={COLORS.neutral} name="M³" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="m3" position="top" formatter={(v) => formatBR(v) + ' M³'} fontSize={10} fill="#64748b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Médias Lt/M³ e R$/M³" subtitle="Eficiência de consumo e custo por metro cúbico" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={equipmentArray} margin={{ top: 30, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" {...axisProps} angle={-30} textAnchor="end" height={80} interval={0} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="litersPerM3" fill={COLORS.liters} name="Lt/M³" radius={[4, 4, 0, 0]} label={<TopLabel suffix="Lt/M³" decimals={2} />} />
                <Bar dataKey="costPerM3" fill={COLORS.cost} name="R$/M³" radius={[4, 4, 0, 0]} label={<TopLabel suffix="R$/M³" decimals={2} />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* SEÇÃO: Performance por Veículo */}
      <div className="space-y-4">
        <SectionHeader title="Performance por Veículo" description="Km percorrido, eficiência e custo por quilômetro" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Km por Veículo" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vehicleKmArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="placa" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="km" fill={COLORS.km} name="Km" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="Km" />}>
                  <LabelList dataKey="placa" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Km/L por Veículo" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vehicleKmLiterArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="placa" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={COLORS.liters} name="Km/L" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="Km/L" decimals={2} />}>
                  <LabelList dataKey="placa" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="R$/Km por Veículo" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vehicleCostArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="placa" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="costPerKm" fill={COLORS.cost} name="R$/Km" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="R$/Km" decimals={2} />}>
                  <LabelList dataKey="placa" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* SEÇÃO: Performance por Motorista */}
      <div className="space-y-4">
        <SectionHeader title="Performance por Motorista" description="Km percorrido, eficiência e custo por quilômetro" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Km por Motorista" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={driverKmArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="driver" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="km" fill={COLORS.km} name="Km" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="Km" />}>
                  <LabelList dataKey="driver" position="insideLeft" fill="#ffffff" fontSize={9} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Km/L por Motorista" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={driverKmLiterArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="driver" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kmPerLiter" fill={COLORS.liters} name="Km/L" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="Km/L" decimals={2} />}>
                  <LabelList dataKey="driver" position="insideLeft" fill="#ffffff" fontSize={9} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="R$/Km por Motorista" subtitle="Top 15">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={driverCostArray} layout="vertical" margin={{ top: 5, right: 65, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatAbbrev} />
                <YAxis type="category" dataKey="driver" hide={true} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="costPerKm" fill={COLORS.cost} name="R$/Km" radius={[0, 4, 4, 0]} label={<OutsideLabel suffix="R$/Km" decimals={2} />}>
                  <LabelList dataKey="driver" position="insideLeft" fill="#ffffff" fontSize={9} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
      </>
      )}
      {activeTab === 'ranking' && <RankingContent />}
      {activeTab === 'rankingPlacas' && <RankingPlacasContent />}
    </div>
  );
}