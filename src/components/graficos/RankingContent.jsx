import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Medal } from 'lucide-react';
import { useAnaliseData, monthNames } from '@/hooks/useAnaliseData';

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const selectClass = "bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer";

export default function RankingContent() {
  const [filters, setFilters] = useState({ month: '', year: '', unit: '', equipment: '', plate: '' });

  const { analiseByMotorista, pontosMap, months, years, plates, units, equipments } = useAnaliseData();

  const ranking = useMemo(() => {
    const filtered = analiseByMotorista.filter(d => {
      if (d.oculto) return false;
      if (filters.year && String(d.year) !== filters.year) return false;
      if (filters.month !== '' && monthNames[parseInt(filters.month)] !== d.month) return false;
      if (filters.unit && d.unitCode !== filters.unit) return false;
      if (filters.plate && String(d.plate).toUpperCase() !== String(filters.plate).toUpperCase()) return false;
      if (filters.equipment && d.equipment !== filters.equipment) return false;
      return true;
    });

    const byDriver = {};
    filtered.forEach(d => {
      if (!d.driver || d.driver === '-') return;
      const key = d.driver.toUpperCase();
      if (!byDriver[key]) {
        byDriver[key] = { driverName: d.driver, totalLiters: 0, totalKm: 0, totalCost: 0 };
      }
      byDriver[key].totalLiters += d.liters || 0;
      byDriver[key].totalKm += d.kmPercorrido || 0;
      byDriver[key].totalCost += d.cost || 0;
    });

    return Object.values(byDriver)
      .map(d => ({
        ...d,
        kmPerLiter: d.totalLiters > 0 && d.totalKm > 0 ? d.totalKm / d.totalLiters : 0,
        costPerKm: d.totalKm > 0 ? d.totalCost / d.totalKm : 0,
      }))
      .filter(d => d.kmPerLiter > 0)
      .sort((a, b) => b.kmPerLiter - a.kmPerLiter);
  }, [analiseByMotorista, filters]);

  const medalColor = (i) => {
    if (i === 0) return 'text-[#FDB913]';
    if (i === 1) return 'text-slate-400';
    if (i === 2) return 'text-amber-600';
    return 'text-slate-500';
  };

  const barColor = (i) => {
    if (i === 0) return 'bg-[#FDB913]';
    if (i === 1) return 'bg-slate-400';
    if (i === 2) return 'bg-amber-600';
    return 'bg-blue-500';
  };

  const maxKml = ranking.length > 0 ? ranking[0].kmPerLiter : 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} className={selectClass}>
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} className={selectClass}>
          <option value="">Mês</option>
          {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
        </select>
        <select value={filters.unit} onChange={e => setFilters({ ...filters, unit: e.target.value })} className={selectClass}>
          <option value="">Usina</option>
          {units.map(u => <option key={u} value={u}>{pontosMap[String(u)] || u}</option>)}
        </select>
        <select value={filters.equipment} onChange={e => setFilters({ ...filters, equipment: e.target.value })} className={selectClass}>
          <option value="">Equipamento</option>
          {equipments.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filters.plate} onChange={e => setFilters({ ...filters, plate: e.target.value })} className={selectClass}>
          <option value="">Placa</option>
          {plates.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-400">{ranking.length} motorista(s) encontrado(s)</p>

      {ranking.length === 0 ? (
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center text-slate-400">Nenhum dado encontrado para os filtros selecionados.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ranking.map((item, idx) => (
            <Card key={item.driverName} className={`border rounded-xl shadow-sm ${idx === 0 ? 'bg-amber-50/60 border-amber-200' : idx === 1 ? 'bg-slate-50/60 border-slate-200' : idx === 2 ? 'bg-orange-50/60 border-orange-200' : 'bg-white border-slate-200'}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-black w-10 text-center ${medalColor(idx)}`}>
                    {idx < 3 ? <Medal className="w-7 h-7 inline" /> : `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-slate-800 font-semibold truncate text-base">{getFirstAndLastName(item.driverName)}</span>
                      <span className={`text-lg font-black shrink-0 ${medalColor(idx)}`}>
                        {item.kmPerLiter.toFixed(2)} <span className="text-sm font-normal text-slate-500">km/L</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor(idx)}`}
                        style={{ width: `${(item.kmPerLiter / maxKml) * 100}%` }} />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                      <span>KM: {item.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</span>
                      <span>Litros: {item.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
                      <span>Custo: R$ {item.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                      <span>R$/km: {item.costPerKm.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}