import React, { useState } from 'react';
import { useAnaliseData } from '@/hooks/useAnaliseData';
import TabPlaca from '@/components/analise/TabPlaca';
import TabMotorista from '@/components/analise/TabMotorista';

export default function AnalisePorPlaca() {
  const [activeTab, setActiveTab] = useState('motorista');

  const {
    analiseByPlaca,
    analiseByMotorista,
    cubicMetros,
    placaEquipamentos,
    exclusoesSet,
    pontosMap,
    motoristasMap,
    frentistasMap,
    months,
    years,
    plates,
    units,
    equipments,
    drivers,
  } = useAnaliseData();

  const sharedProps = { exclusoesSet, pontosMap, motoristasMap, frentistasMap, months, years, plates, units, equipments, drivers };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-1">Análise</h1>
        <p className="text-slate-500">Eficiência e consumo de combustível</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('motorista')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'motorista'
              ? 'bg-white border border-b-white border-slate-200 text-slate-900 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Por Motorista
        </button>
        <button
          onClick={() => setActiveTab('placa')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'placa'
              ? 'bg-white border border-b-white border-slate-200 text-slate-900 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Por Placa
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'motorista' ? (
        <TabMotorista
          data={analiseByMotorista}
          {...sharedProps}
        />
      ) : (
        <TabPlaca
          data={analiseByPlaca}
          cubicMetros={cubicMetros}
          placaEquipamentos={placaEquipamentos}
          {...sharedProps}
        />
      )}
    </div>
  );
}