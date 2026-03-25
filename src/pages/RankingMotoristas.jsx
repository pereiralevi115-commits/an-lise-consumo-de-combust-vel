import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { parseISO } from 'date-fns';
import { Trophy, Medal } from 'lucide-react';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export default function RankingMotoristas() {
  const [filters, setFilters] = useState({ month: '', year: '', unit: '', equipment: '', plate: '' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: motoristas = [] } = useQuery({ queryKey: ['Motorista'], queryFn: () => base44.entities.Motorista.list() });
  const { data: frentistas = [] } = useQuery({ queryKey: ['Frentista'], queryFn: () => base44.entities.Frentista.list() });
  const { data: pontos = [] } = useQuery({ queryKey: ['Ponto'], queryFn: () => base44.entities.Ponto.list() });
  const { data: placaEquipamentos = [] } = useQuery({ queryKey: ['PlacaEquipamento'], queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000) });
  const { data: precosCombustivel = [] } = useQuery({ queryKey: ['PrecoCombustivel'], queryFn: () => base44.entities.PrecoCombustivel.list() });

  const motoristasMap = Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome]));
  const frentistasMap = Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome]));
  const pontosMap = Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome]));
  const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

  // Calcular km percorrido por odômetro diff por placa (igual ao Graficos.jsx)
  const kmPercorridoMap = useMemo(() => {
    const byPlate = {};
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const plate = String(r.vehicle_plate).toUpperCase();
      if (!byPlate[plate]) byPlate[plate] = [];
      byPlate[plate].push(r);
    });
    Object.values(byPlate).forEach(arr => {
      arr.sort((a, b) => {
        const da = (a.date || '') + ' ' + (a.time || '');
        const db = (b.date || '') + ' ' + (b.time || '');
        return da < db ? -1 : da > db ? 1 : 0;
      });
    });
    const map = {};
    Object.values(byPlate).forEach(arr => {
      let lastKm = null;
      arr.forEach(r => {
        const km = Number(r.km_driven);
        if (km > 0) {
          if (lastKm !== null && km > lastKm) {
            map[r.id] = km - lastKm;
          }
          lastKm = km;
        }
      });
    });
    return map;
  }, [records]);

  // analysisData: agrupa por placa+mês igual ao Graficos.jsx
  const analysisData = useMemo(() => {
    const grouped = {};
    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const d = parseISO(r.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const plateKey = String(r.vehicle_plate).toUpperCase();
      const key = `${monthKey}-${plateKey}`;
      if (!grouped[key]) {
        grouped[key] = {
          monthKey, monthNum: d.getMonth(), year: d.getFullYear(),
          plate: r.vehicle_plate, unit: r.unit, driver: r.driver,
          totalLiters: 0, kmDelta: 0, _korthLiters: 0, _externalCost: 0
        };
      }
      grouped[key].totalLiters += r.liters || 0;
      grouped[key].kmDelta += kmPercorridoMap[r.id] || 0;
      if (r.korth_id) {
        grouped[key]._korthLiters += r.liters || 0;
      } else {
        grouped[key]._externalCost += r.cost || 0;
      }
    });
    return Object.values(grouped).map(item => {
      const precoReg = precosCombustivel.find(p =>
        String(p.ponto) === String(item.unit) &&
        Number(p.mes) === item.monthNum &&
        Number(p.ano) === item.year
      );
      const cost = (precoReg ? item._korthLiters * precoReg.preco_litro : 0) + item._externalCost;
      return { ...item, cost };
    });
  }, [records, kmPercorridoMap, precosCombustivel]);

  // Opções de filtro
  const years = [...new Set(analysisData.map(d => d.year))].sort((a, b) => b - a);
  const months = [...new Set(analysisData.map(d => d.monthNum))].sort((a, b) => a - b);
  const units = [...new Set(records.map(r => r.unit))].filter(Boolean).sort();
  const equipments = [...new Set(placaEquipamentos.map(p => p.tipo))].filter(Boolean).sort();
  const plates = [...new Set(records.map(r => r.vehicle_plate))].filter(Boolean).sort();

  // Ranking: agrupa por motorista usando analysisData com kmDelta (igual ao gráfico)
  const ranking = useMemo(() => {
    const filtered = analysisData.filter(d => {
      if (filters.year && d.year !== parseInt(filters.year)) return false;
      if (filters.month !== '' && d.monthNum !== parseInt(filters.month)) return false;
      if (filters.unit && d.unit !== filters.unit) return false;
      if (filters.plate && d.plate !== filters.plate) return false;
      if (filters.equipment && placaEquipamentosMap[String(d.plate).toUpperCase()] !== filters.equipment) return false;
      return true;
    });

    const byDriver = {};
    filtered.forEach(d => {
      if (!d.driver) return;
      const driverName = motoristasMap[String(d.driver)] || frentistasMap[String(d.driver)] || d.driver;
      if (!byDriver[driverName]) {
        byDriver[driverName] = { driver: d.driver, driverName, totalLiters: 0, totalKm: 0, totalCost: 0 };
      }
      byDriver[driverName].totalLiters += d.totalLiters;
      byDriver[driverName].totalKm += d.kmDelta;
      byDriver[driverName].totalCost += d.cost;
    });

    return Object.values(byDriver)
      .map(d => ({
        ...d,
        kmPerLiter: d.totalLiters > 0 && d.totalKm > 0 ? d.totalKm / d.totalLiters : 0,
        costPerKm: d.totalKm > 0 ? d.totalCost / d.totalKm : 0
      }))
      .filter(d => d.kmPerLiter > 0)
      .sort((a, b) => b.kmPerLiter - a.kmPerLiter);
  }, [analysisData, filters, motoristasMap, frentistasMap, placaEquipamentosMap]);

  const medalColor = (i) => {
    if (i === 0) return 'text-yellow-400';
    if (i === 1) return 'text-slate-300';
    if (i === 2) return 'text-amber-600';
    return 'text-slate-400';
  };

  const barColor = (i) => {
    if (i === 0) return 'bg-yellow-400';
    if (i === 1) return 'bg-slate-300';
    if (i === 2) return 'bg-amber-600';
    return 'bg-blue-500';
  };

  const maxKml = ranking.length > 0 ? ranking[0].kmPerLiter : 1;

  if (isLoading) return <div className="text-white text-center py-12">Carregando dados...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h1 className="text-3xl font-bold text-white">Ranking de Motoristas — KM/Litro</h1>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Mês</option>
          {months.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
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

        <select value={filters.plate} onChange={e => setFilters({ ...filters, plate: e.target.value })}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm">
          <option value="">Placa</option>
          {plates.map(p => <option key={p} value={p}>{p}</option>)}
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
                  <div className={`text-2xl font-black w-10 text-center ${medalColor(idx)}`}>
                    {idx < 3 ? <Medal className="w-7 h-7 inline" /> : `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-white font-semibold truncate text-base">{getFirstAndLastName(item.driverName)}</span>
                      <span className={`text-lg font-black shrink-0 ${medalColor(idx)}`}>
                        {item.kmPerLiter.toFixed(2)} <span className="text-sm font-normal text-slate-400">km/L</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor(idx)}`}
                        style={{ width: `${(item.kmPerLiter / maxKml) * 100}%` }} />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
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