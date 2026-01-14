import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dados Combustível');

    // Define columns
    worksheet.columns = [
      { header: 'date', key: 'date', width: 12 },
      { header: 'time', key: 'time', width: 10 },
      { header: 'vehicle_plate', key: 'vehicle_plate', width: 15 },
      { header: 'vehicle_type', key: 'vehicle_type', width: 15 },
      { header: 'unit', key: 'unit', width: 15 },
      { header: 'attendant', key: 'attendant', width: 20 },
      { header: 'driver', key: 'driver', width: 20 },
      { header: 'fuel_type', key: 'fuel_type', width: 15 },
      { header: 'liters', key: 'liters', width: 10 },
      { header: 'km_driven', key: 'km_driven', width: 12 },
      { header: 'cost', key: 'cost', width: 12 },
      { header: 'cubic_meters', key: 'cubic_meters', width: 12 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }
    };

    // Add example rows
    worksheet.addRow({
      date: '2026-01-14',
      time: '08:30',
      vehicle_plate: 'ABC-1234',
      vehicle_type: 'Betoneira',
      unit: 'Usina 1',
      attendant: 'João Silva',
      driver: 'Carlos Santos',
      fuel_type: 'Diesel',
      liters: 150.5,
      km_driven: 85,
      cost: 850.00,
      cubic_meters: 8.5
    });

    worksheet.addRow({
      date: '2026-01-14',
      time: '09:15',
      vehicle_plate: 'DEF-5678',
      vehicle_type: 'Caminhão',
      unit: 'Usina 2',
      attendant: 'Maria Oliveira',
      driver: 'Pedro Costa',
      fuel_type: 'Diesel S10',
      liters: 200.0,
      km_driven: 120,
      cost: 1120.00,
      cubic_meters: 12.0
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=template_combustivel.xlsx'
      }
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});