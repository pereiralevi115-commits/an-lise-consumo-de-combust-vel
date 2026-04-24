import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const filterMonth = body.month || '03'; // Março
    const filterYear = body.year || '2026';

    // Fetch all data
    const records = await base44.asServiceRole.entities.FuelRecord.list('-date', 10000);
    const cubicMetros = await base44.asServiceRole.entities.CubicMetros.list('-mes', 10000);
    const placaEquipamentos = await base44.asServiceRole.entities.PlacaEquipamento.list('placa', 10000);

    const placaEquipamentosMap = Object.fromEntries(placaEquipamentos.map(p => [String(p.placa).toUpperCase(), p.tipo]));

    // Replicate Graficos logic: group records by plate+month
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const groupedData = {};

    records.forEach(r => {
      if (!r.date || !r.vehicle_plate) return;
      const month = parseISO(r.date).getMonth();
      const year = parseISO(r.date).getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const plateKey = r.vehicle_plate.toUpperCase();
      const groupKey = `${monthKey}-${plateKey}`;

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          month: monthNames[month],
          monthKey: monthKey,
          year: year,
          plate: r.vehicle_plate,
          equipment: placaEquipamentosMap[plateKey] || r.vehicle_type || '',
          fuelRecordM3: 0
        };
      }
      groupedData[groupKey].fuelRecordM3 += r.cubic_meters || 0;
    });

    // Apply M³ from CubicMetros entity (with new aggregation logic)
    const analysisData = Object.values(groupedData).map(item => {
      const m3DataList = cubicMetros.filter(cm =>
        String(cm.placa).toUpperCase() === String(item.plate).toUpperCase() &&
        cm.mes === item.monthKey
      );
      
      const m3 = m3DataList.length > 0 
        ? m3DataList.reduce((sum, cm) => sum + Number(cm.metros_cubicos), 0)
        : item.fuelRecordM3;

      return {
        ...item,
        m3,
        m3RecordCount: m3DataList.length,
        m3Values: m3DataList.map(cm => ({ placa: cm.placa, metros_cubicos: cm.metros_cubicos }))
      };
    });

    // Filter by selected month/year
    const filteredByMonthYear = analysisData.filter(d => {
      const selectedMonth = monthNames[parseInt(filterMonth)];
      return d.year === parseInt(filterYear) && d.month === selectedMonth;
    });

    // Aggregate by equipment (exactly like Graficos does)
    const byEquipmentData = {};
    filteredByMonthYear.forEach(d => {
      const eqType = d.equipment && d.equipment !== '-' ? d.equipment : null;
      if (!eqType) return;
      if (!byEquipmentData[eqType]) {
        byEquipmentData[eqType] = { liters: 0, m3: 0, records: [] };
      }
      byEquipmentData[eqType].m3 += d.m3 || 0;
      byEquipmentData[eqType].records.push(d);
    });

    // Calculate totals
    const totalM3Betoneira = filteredByMonthYear
      .filter(d => (d.equipment || '').toUpperCase().includes('BETONEIRA'))
      .reduce((sum, d) => sum + (d.m3 || 0), 0);

    const totalM3BombaLanca = filteredByMonthYear
      .filter(d => (d.equipment || '').toUpperCase().includes('LANÇA') || (d.equipment || '').toUpperCase().includes('BOMBAL LANÇA'))
      .reduce((sum, d) => sum + (d.m3 || 0), 0);

    const totalM3BombaEstacionaria = filteredByMonthYear
      .filter(d => (d.equipment || '').toUpperCase().includes('ESTACIONÁRIA') || (d.equipment || '').toUpperCase().includes('ESTACIONARIA'))
      .reduce((sum, d) => sum + (d.m3 || 0), 0);

    const totalM3 = totalM3Betoneira + totalM3BombaLanca + totalM3BombaEstacionaria;

    return Response.json({
      selectedPeriod: { month: monthNames[parseInt(filterMonth)], year: parseInt(filterYear) },
      recordsAnalyzed: records.length,
      cubicMetrosAvailable: cubicMetros.length,
      recordsInSelectedPeriod: filteredByMonthYear.length,
      totalM3Betoneira,
      totalM3BombaLanca,
      totalM3BombaEstacionaria,
      totalM3,
      equipmentBreakdown: Object.entries(byEquipmentData).map(([eq, data]) => ({
        equipamento: eq,
        m3: data.m3,
        recordCount: data.records.length,
        details: data.records.map(r => ({
          placa: r.plate,
          monthKey: r.monthKey,
          m3: r.m3,
          m3RecordCount: r.m3RecordCount
        }))
      })),
      allRecordsInPeriod: filteredByMonthYear.map(r => ({
        placa: r.plate,
        monthKey: r.monthKey,
        equipamento: r.equipment,
        m3: r.m3,
        m3RecordCount: r.m3RecordCount,
        m3Values: r.m3Values
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});