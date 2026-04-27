import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function DebugDriverPanel({ driverCode, driverName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!driverCode) { setData(null); return; }
    setLoading(true);
    base44.functions.invoke('debugDriverKml', { driverCode })
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [driverCode]);

  if (!driverCode) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <button
        className="flex items-center gap-2 w-full text-left font-bold text-blue-800 text-sm"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Debug KM/L — {driverName}
      </button>

      {open && (
        loading ? (
          <div className="flex items-center gap-2 mt-3 text-blue-700 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando...
          </div>
        ) : data ? (
          <div className="mt-3 space-y-4">

            {/* Resumo global */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-xs text-slate-500 mb-1">Total KM (gráfico)</p>
                <p className="text-lg font-bold text-slate-800">{data.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-xs text-slate-500 mb-1">Total Litros (gráfico)</p>
                <p className="text-lg font-bold text-slate-800">{data.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-xs text-slate-500 mb-1">KM/L (gráfico)</p>
                <p className="text-lg font-bold text-amber-600">{parseFloat(data.kmPerLiter).toFixed(2)} km/L</p>
              </div>
            </div>

            {/* Placas incluídas no cálculo */}
            {data.includedGroups.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-2">✅ Placas onde {driverName} é motorista principal (incluídas no cálculo):</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="text-left px-2 py-1 text-slate-700">Mês</th>
                      <th className="text-left px-2 py-1 text-slate-700">Placa</th>
                      <th className="text-left px-2 py-1 text-slate-700">Equipamento</th>
                      <th className="text-right px-2 py-1 text-slate-700">KM Delta</th>
                      <th className="text-right px-2 py-1 text-slate-700">Litros</th>
                      <th className="text-right px-2 py-1 text-slate-700">KM/L</th>
                      <th className="text-right px-2 py-1 text-slate-700">Qtd Abast.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.includedGroups.map((g, i) => (
                      <tr key={i} className="border-t border-green-200 bg-white hover:bg-green-50">
                        <td className="px-2 py-1">{g.monthKey}</td>
                        <td className="px-2 py-1 font-mono font-bold">{g.plate}</td>
                        <td className="px-2 py-1">{g.equipment}</td>
                        <td className="px-2 py-1 text-right">{g.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-2 py-1 text-right">{g.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right font-bold text-amber-600">{parseFloat(g.kmPerLiter).toFixed(2)}</td>
                        <td className="px-2 py-1 text-right">{g.driverCounts[driverCode] || 0}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                ⚠️ Nenhuma placa onde {driverName} é o motorista mais frequente — por isso o KM/L no gráfico é 0.
              </p>
            )}

            {/* Placas onde aparece mas não é principal */}
            {data.excludedGroupsWhereDriverAppears.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ Placas onde {driverName} aparece mas NÃO é o motorista principal (excluídas do cálculo):</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-orange-100">
                      <th className="text-left px-2 py-1 text-slate-700">Mês</th>
                      <th className="text-left px-2 py-1 text-slate-700">Placa</th>
                      <th className="text-left px-2 py-1 text-slate-700">Equipamento</th>
                      <th className="text-right px-2 py-1 text-slate-700">KM Delta</th>
                      <th className="text-right px-2 py-1 text-slate-700">Litros</th>
                      <th className="text-left px-2 py-1 text-slate-700">Motorista Principal</th>
                      <th className="text-right px-2 py-1 text-slate-700">Abast. CLEITON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.excludedGroupsWhereDriverAppears.map((g, i) => (
                      <tr key={i} className="border-t border-orange-200 bg-white hover:bg-orange-50">
                        <td className="px-2 py-1">{g.monthKey}</td>
                        <td className="px-2 py-1 font-mono font-bold">{g.plate}</td>
                        <td className="px-2 py-1">{g.equipment}</td>
                        <td className="px-2 py-1 text-right">{g.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-2 py-1 text-right">{g.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1">{g.mainDriverName}</td>
                        <td className="px-2 py-1 text-right">{g.driverOccurrences}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        ) : null
      )}
    </div>
  );
}