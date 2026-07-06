import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { parseISO } from 'date-fns';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export { monthNames };

export function useAnaliseData() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuelRecords'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: cubicMetros = [] } = useQuery({
    queryKey: ['cubicMetros'],
    queryFn: () => base44.entities.CubicMetros.list('-mes', 10000)
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ['Ponto'],
    queryFn: () => base44.entities.Ponto.list()
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ['Motorista'],
    queryFn: () => base44.entities.Motorista.list()
  });

  const { data: frentistas = [] } = useQuery({
    queryKey: ['Frentista'],
    queryFn: () => base44.entities.Frentista.list()
  });

  const { data: combustiveis = [] } = useQuery({
    queryKey: ['Combustivel'],
    queryFn: () => base44.entities.Combustivel.list()
  });

  const { data: placaEquipamentos = [] } = useQuery({
    queryKey: ['PlacaEquipamento'],
    queryFn: () => base44.entities.PlacaEquipamento.list('placa', 10000)
  });

  const { data: precosCombustivel = [] } = useQuery({
    queryKey: ['PrecoCombustivel'],
    queryFn: () => base44.entities.PrecoCombustivel.list()
  });

  const { data: exclusoes = [] } = useQuery({
    queryKey: ['ExclusaoMedia'],
    queryFn: () => base44.entities.ExclusaoMedia.list()
  });

  const { data: korthExcluidos = [] } = useQuery({
    queryKey: ['KorthExcluido'],
    queryFn: () => base44.entities.KorthExcluido.list('created_date', 10000)
  });

  const pontosMap = useMemo(() => Object.fromEntries(pontos.map(p => [String(p.codigo), p.nome])), [pontos]);
  const motoristasMap = useMemo(() => Object.fromEntries(motoristas.map(m => [String(m.codigo), m.nome])), [motoristas]);
  const frentistasMap = useMemo(() => Object.fromEntries(frentistas.map(f => [String(f.codigo), f.nome])), [frentistas]);
  const combustiveisMap = useMemo(() => Object.fromEntries(combustiveis.map(c => [String(c.codigo), c.nome])), [combustiveis]);
  const placaEquipamentosMap = useMemo(() => Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo])), [placaEquipamentos]);
  const exclusoesSet = useMemo(() => new Set(exclusoes.map(e => `${String(e.placa).toUpperCase()}-${e.mes}`)), [exclusoes]);
  const korthExcluidosSet = useMemo(() => new Set(korthExcluidos.map(e => String(e.korth_id))), [korthExcluidos]);

  // Records filtrados (sem os excluídos via KorthExcluido)
  const activeRecords = useMemo(() =>
    records.filter(r => !r.korth_id || !korthExcluidosSet.has(String(r.korth_id))),
    [records, korthExcluidosSet]
  );

  // ===== ANÁLISE POR PLACA =====
  const analiseByPlaca = useMemo(() => {
    const groupedData = {};

    activeRecords.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const month = parseISO(r.date).getMonth();
      const year = parseISO(r.date).getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const plateKey = r.vehicle_plate.toUpperCase();
      const groupKey = `${monthKey}-${plateKey}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          month: monthNames[month],
          year,
          monthKey,
          plate: r.vehicle_plate,
          unit: r.unit,
          equipment: placaEquipamentosMap[plateKey] || r.vehicle_type || '',
          vehicle_type: r.vehicle_type,
          fuelType: r.fuel_type,
          totalLiters: 0,
          kmRecords: [],
          driverCounts: {},
          _korthLiters: 0,
          _externalCost: 0,
          _unit: r.unit,
          _month: month,
          _year: year,
        };
      }

      groupedData[groupKey].totalLiters += r.liters || 0;
      if (r.driver) groupedData[groupKey].driverCounts[r.driver] = (groupedData[groupKey].driverCounts[r.driver] || 0) + 1;
      groupedData[groupKey]._unit = r.unit;
      groupedData[groupKey]._month = month;
      groupedData[groupKey]._year = year;
      if (r.korth_id) groupedData[groupKey]._korthLiters += r.liters || 0;
      else groupedData[groupKey]._externalCost += r.cost || 0;
      if (Number(r.km_driven) > 0) groupedData[groupKey].kmRecords.push(Number(r.km_driven));
    });

    const fuelAnalysis = Object.values(groupedData).map(item => {
      const mainDriverCode = Object.entries(item.driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const precoReg = precosCombustivel.find(p =>
        String(p.ponto) === String(item._unit) &&
        Number(p.mes) === Number(item._month) &&
        Number(p.ano) === Number(item._year)
      );
      const korthCost = precoReg ? item._korthLiters * precoReg.preco_litro : 0;
      const cost = korthCost + item._externalCost;
      const kmDelta = item.kmRecords.length > 0 ? Math.max(...item.kmRecords) - Math.min(...item.kmRecords) : 0;
      const m3Data = cubicMetros.find(cm =>
        String(cm.placa).toUpperCase() === String(item.plate).toUpperCase() &&
        cm.mes === item.monthKey
      );
      const m3 = m3Data ? Number(m3Data.metros_cubicos) : 0;

      return {
        month: item.month,
        monthKey: item.monthKey,
        year: item.year,
        plate: item.plate,
        unit: pontosMap[String(item.unit)] || item.unit || '-',
        unitCode: item.unit,
        equipment: placaEquipamentosMap[String(item.plate).toUpperCase()] || '-',
        vehicle_type: item.vehicle_type || '-',
        driver: motoristasMap[String(mainDriverCode)] || frentistasMap[String(mainDriverCode)] || mainDriverCode || '-',
        driverCode: mainDriverCode,
        fuelType: combustiveisMap[String(item.fuelType)] || item.fuelType || '-',
        totalLiters: item.totalLiters,
        kmDelta,
        m3,
        cost,
        efficiency: item.totalLiters > 0 ? parseFloat((kmDelta / item.totalLiters).toFixed(2)) : 0,
        efficiencyCost: cost > 0 && kmDelta > 0 ? parseFloat((cost / kmDelta).toFixed(2)) : 0,
      };
    });

    // Add M3-only rows
    const fuelKeys = new Set(fuelAnalysis.map(d => `${d.monthKey}-${String(d.plate).toUpperCase()}`));
    const m3OnlyRows = cubicMetros
      .filter(cm => {
        if (!cm.mes || !cm.placa) return false;
        return !fuelKeys.has(`${cm.mes}-${String(cm.placa).toUpperCase()}`);
      })
      .map(cm => {
        const [year, month] = cm.mes.split('-').map(Number);
        const plateKey = String(cm.placa).toUpperCase();
        return {
          month: monthNames[month - 1],
          monthKey: cm.mes,
          year,
          plate: cm.placa,
          unit: cm.unidade || '-',
          unitCode: '',
          equipment: placaEquipamentosMap[plateKey] || cm.equipamento || '-',
          vehicle_type: '-',
          driver: '-',
          driverCode: '',
          fuelType: '-',
          totalLiters: 0,
          kmDelta: 0,
          m3: Number(cm.metros_cubicos),
          cost: 0,
          efficiency: 0,
          efficiencyCost: 0,
        };
      });

    return [...fuelAnalysis, ...m3OnlyRows];
  }, [activeRecords, cubicMetros, placaEquipamentosMap, motoristasMap, frentistasMap, combustiveisMap, pontosMap, precosCombustivel]);

  // ===== ANÁLISE POR MOTORISTA (registro unitário — um por abastecimento) =====
  const analiseByMotorista = useMemo(() => {
    // Calcula km percorrido por registro (delta entre abastecimentos consecutivos da mesma placa)
    const byPlate = {};
    activeRecords.forEach(r => {
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
    const kmPercorridoMap = {};
    Object.values(byPlate).forEach(arr => {
      let lastKm = null;
      arr.forEach(r => {
        const km = Number(r.km_driven);
        if (km > 0) {
          if (lastKm !== null && km > lastKm) kmPercorridoMap[r.id] = km - lastKm;
          lastKm = km;
        }
      });
    });

    // Um registro por abastecimento (exclui ocultos do cálculo, mas os mantém na lista para exibição)
    return activeRecords
      .filter(r => r.date && r.vehicle_plate)
      .map(r => {
        const month = parseISO(r.date).getMonth();
        const year = parseISO(r.date).getFullYear();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const plateKey = String(r.vehicle_plate).toUpperCase();
        const driverCode = String(r.driver || '');
        const liters = r.liters || 0;
        const kmPercorrido = kmPercorridoMap[r.id] || 0;

        const precoReg = precosCombustivel.find(p =>
          String(p.ponto) === String(r.unit) &&
          Number(p.mes) === month &&
          Number(p.ano) === year
        );
        const cost = r.korth_id
          ? (precoReg ? liters * precoReg.preco_litro : 0)
          : (r.cost || 0);

        return {
          id: r.id,
          date: r.date,
          time: r.time || '',
          month: monthNames[month],
          monthKey,
          year,
          plate: r.vehicle_plate,
          driver: motoristasMap[driverCode] || frentistasMap[driverCode] || driverCode || '-',
          driverCode,
          unit: pontosMap[String(r.unit)] || r.unit || '-',
          unitCode: r.unit,
          equipment: placaEquipamentosMap[plateKey] || r.vehicle_type || '-',
          fuelType: combustiveisMap[String(r.fuel_type)] || r.fuel_type || '-',
          liters,
          kmPercorrido,
          cost,
          oculto: r.oculto === true,
          efficiency: !r.oculto && liters > 0 && kmPercorrido > 0 ? parseFloat((kmPercorrido / liters).toFixed(2)) : 0,
          efficiencyCost: !r.oculto && cost > 0 && kmPercorrido > 0 ? parseFloat((cost / kmPercorrido).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => {
        const nameCmp = a.driver.localeCompare(b.driver, 'pt-BR');
        if (nameCmp !== 0) return nameCmp;
        return (a.date + a.time).localeCompare(b.date + b.time);
      });
  }, [activeRecords, placaEquipamentosMap, motoristasMap, frentistasMap, combustiveisMap, pontosMap, precosCombustivel]);

  // Filter options
  const months = useMemo(() => [...new Set(activeRecords.map(r => r.date ? parseISO(r.date).getMonth() : null))].filter(m => m !== null).sort((a, b) => a - b), [activeRecords]);
  const monthYears = useMemo(() => {
    const set = new Set();
    activeRecords.forEach(r => {
      if (!r.date) return;
      const d = parseISO(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    return [...set].sort().map(key => {
      const [year, month] = key.split('-');
      return { value: key, label: `${monthNames[parseInt(month) - 1]}/${year}` };
    });
  }, [activeRecords]);
  const years = useMemo(() => [...new Set(activeRecords.map(r => r.date ? parseISO(r.date).getFullYear() : null))].filter(Boolean).sort((a, b) => b - a), [activeRecords]);
  const plates = useMemo(() => [...new Set(activeRecords.map(r => r.vehicle_plate))].filter(Boolean).sort(), [activeRecords]);
  const units = useMemo(() => [...new Set(activeRecords.map(r => r.unit))].filter(Boolean).sort(), [activeRecords]);
  const equipments = useMemo(() => [...new Set(placaEquipamentos.map(p => p.tipo))].filter(Boolean).sort(), [placaEquipamentos]);
  const drivers = useMemo(() => {
    const seen = new Set();
    return [...new Set(activeRecords.map(r => r.driver))].filter(Boolean)
      .filter(code => {
        const name = (motoristasMap[String(code)] || frentistasMap[String(code)] || code).toUpperCase();
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort((a, b) => {
        const nameA = motoristasMap[String(a)] || frentistasMap[String(a)] || a;
        const nameB = motoristasMap[String(b)] || frentistasMap[String(b)] || b;
        return nameA.localeCompare(nameB, 'pt-BR');
      });
  }, [activeRecords, motoristasMap, frentistasMap]);

  return {
    analiseByPlaca,
    analiseByMotorista,
    cubicMetros,
    isLoading,
    placaEquipamentos,
    exclusoesSet,
    pontosMap,
    motoristasMap,
    frentistasMap,
    combustiveisMap,
    placaEquipamentosMap,
    months,
    monthYears,
    years,
    plates,
    units,
    equipments,
    drivers,
  };
}