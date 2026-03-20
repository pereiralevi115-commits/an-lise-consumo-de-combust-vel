import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { parseISO } from 'date-fns';
import { Trophy, Medal } from 'lucide-react';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function RankingMotoristas() {
  const [filters, setFilters] = useState({ month: '', year: '', plate: '', unit: '', equipment: '', driver: '' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });

  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  // Unique filter options
  const months = [...new Set(records.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b);
  const years = [...new Set(records.map(r => r.date ? parseISO(r.date).getFullYear() : null))].filter(Boolean).sort((a, b) => b - a);
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const equipments = [...new Set(placaEquipamentos.map(p => p.tipo))].filter(Boolean).sort();
  const drivers = [...new Set(records.map(r => r.driver))].filter(Boolean).sort();

  const ranking = useMemo(() => {
    // Apply filters
    const filtered = records.filter(r => {
      if (!r.date || !r.driver) return false;
      const d = parseISO(r.date);
      if (filters.month !== '' && d.getMonth() !== parseInt(filters.month)) return false;
      if (filters.year !== '' && d.getFullYear() !== parseInt(filters.year)) return false;
      if (filters.plate && r.vehicle_plate !== filters.plate) return false;
      if (filters.unit && r.unit !== filters.unit) return false;
      if (filters.equipment && placaEquipamentosMap[String(r.vehicle_plate).toUpperCase()] !== filters.equipment) return false;
      if (filters.driver && r.driver !== filters.driver) return false;
      return true;
    });

    // Group by driver + month
    const driverMonthGroups = {};
    filtered.forEach(r => {
      const d = parseISO(r.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const driverKey = r.driver;
      const key = `${driverKey}__${monthKey}`;

      if (!driverMonthGroups[key]) {
        driverMonthGroups[key] = {
          driver: driverKey,
          driverName: motoristasMap[String(driverKey)] || driverKey,
          monthKey,
          monthLabel: `${monthNames[d.getMonth()]}/${d.getFullYear()}`,
          totalLiters: 0,
          kmRecords: [],
        };
      }
      driverMonthGroups[key].totalLiters += r.liters || 0;
      if (Number(r.km_driven) > 0) {
        driverMonthGroups[key].kmRecords.push(Number(r.km_driven));
      }
    });

    // Calculate KM delta (max - min) per group and derive km/l
    const rows = Object.values(driverMonthGroups).map(g => {
      const kmDelta = g.kmRecords.length >= 2
        ? Math.max(...g.kmRecords) - Math.min(...g.kmRecords)
        : 0;
      const kml = g.totalLiters > 0 && kmDelta > 0 ? kmDelta / g.totalLiters : null;
      return { ...g, kmDelta, kml };
    }).filter(g => g.kml !== null);

    // Aggregate by driver (average km/l across months, weighted by liters)
    const byDriver = {};
    rows.forEach(g => {
      if (!byDriver[g.driver]) {
        byDriver[g.driver] = { driver: g.driver, driverName: g.driverName, totalKm: 0, totalLiters: 0, months: [] };
      }
      byDriver[g.driver].totalKm += g.kmDelta;
      byDriver[g.driver].totalLiters += g.totalLiters;
      byDriver[g.driver].months.push({ monthLabel: g.monthLabel, kml: g.kml, kmDelta: g.kmDelta, totalLiters: g.totalLiters });
    });

    return Object.values(byDriver)
      .map(d => ({ ...d, avgKml: d.totalLiters > 0 ? d.totalKm / d.totalLiters : 0 }))
      .sort((a, b) => b.avgKml - a.avgKml);
  }, [records, filters, motoristasMap, placaEquipamentosMap]);

  const medalColor = (i) => {
    if (i === 0) return 'text-yellow-400';
    if (i === 1) return 'text-slate-300';
    if (i === 2) return 'text-amber-600';
    return 'text-slate-500';
  };

  const barColor = (i) => {
    if (i === 0) return 'bg-yellow-400';
    if (i === 1) return 'bg-slate-300';
    if (i === 2) return 'bg-amber-600';
    return 'bg-blue-500';
  };

  const maxKml = ranking.length > 0 ? ranking[0].avgKml : 1;

  if (isLoading) return <div className="text-white text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h1 className="text-3xl font-bold text-white">Ranking de Motoristas</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Mês</option>
          {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
        </select>

        <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filters.plate} onChange={e => setFilters({ ...filters, plate: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Placa</option>
          {plates.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filters.unit} onChange={e => setFilters({ ...filters, unit: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Usina</option>
          {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
        </select>

        <select value={filters.equipment} onChange={e => setFilters({ ...filters, equipment: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Equipamento</option>
          {equipments.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select value={filters.driver} onChange={e => setFilters({ ...filters, driver: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Motorista</option>
          {drivers.map(d => <option key={d} value={d}>{motoristasMap[String(d)] || d}</option>)}
        </select>
      </div>

      <p className="text-slate-400 text-sm">{ranking.length} motorista(s) encontrado(s)</p>

      {ranking.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center text-slate-400">Nenhum dado encontrado para os filtros selecionados.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ranking.map((item, idx) => (
            <Card key={item.driver} className={`border ${idx === 0 ? 'bg-yellow-900/20 border-yellow-600/50' : idx === 1 ? 'bg-slate-700/30 border-slate-500/50' : idx === 2 ? 'bg-amber-900/20 border-amber-700/50' : 'bg-slate-800 border-slate-700'}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  {/* Position */}
                  <div className={`text-2xl font-black w-10 text-center ${medalColor(idx)}`}>
                    {idx < 3 ? <Medal className="w-7 h-7 inline" /> : `#${idx + 1}`}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-white font-semibold truncate text-base">{item.driverName}</span>
                      <span className={`text-lg font-black shrink-0 ${medalColor(idx)}`}>
                        {item.avgKml.toFixed(2)} <span className="text-sm font-normal text-slate-400">km/L</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(idx)}`}
                        style={{ width: `${(item.avgKml / maxKml) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                      <span>KM total: {item.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</span>
                      <span>Litros: {item.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
                      <span>Meses: {item.months.length}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly breakdown */}
                {item.months.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {item.months.sort((a, b) => a.monthLabel.localeCompare(b.monthLabel)).map((m, mi) => (
                      <div key={mi} className="bg-slate-900/50 rounded px-2 py-1 text-xs">
                        <div className="text-slate-400">{m.monthLabel}</div>
                        <div className="text-white font-bold">{m.kml.toFixed(2)} km/L</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}