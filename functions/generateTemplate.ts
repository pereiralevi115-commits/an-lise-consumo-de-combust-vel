import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Main sheet with all columns
    const dataSheet = workbook.addWorksheet('Dados de Combustível');
    dataSheet.columns = [
      { header: 'MÊS', key: 'month', width: 12 },
      { header: 'DATA', key: 'date', width: 12 },
      { header: 'HORA', key: 'time', width: 10 },
      { header: 'PLACA', key: 'plate', width: 12 },
      { header: 'TIPO', key: 'type', width: 18 },
      { header: 'USINA', key: 'plant', width: 15 },
      { header: 'FRENTISTA', key: 'attendant', width: 18 },
      { header: 'MOTORISTA', key: 'driver', width: 18 },
      { header: 'COMBUSTÍVEL', key: 'fuel', width: 14 },
      { header: 'LITROS', key: 'liters', width: 10 },
      { header: 'MENOR (KM)', key: 'km_start', width: 12 },
      { header: 'MAIOR (KM)', key: 'km_end', width: 12 },
      { header: 'KM RODADO', key: 'km_driven', width: 12 },
      { header: 'VALOR', key: 'value', width: 12 },
      { header: 'M³', key: 'm3', width: 10 }
    ];
    
    // Style header
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    dataSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add example rows
    dataSheet.addRow({
      month: 'Setembro',
      date: '01/09/2025',
      time: '08:30',
      plate: 'ABC-1234',
      type: 'Escavadeira',
      plant: 'Usina A',
      attendant: 'Carlos Silva',
      driver: 'João Santos',
      fuel: 'Diesel S10',
      liters: 120,
      km_start: 10000,
      km_end: 10150,
      km_driven: 150,
      value: 720,
      m3: 50
    });
    
    dataSheet.addRow({
      month: 'Setembro',
      date: '02/09/2025',
      time: '14:15',
      plate: 'XYZ-5678',
      type: 'Retroescavadeira',
      plant: 'Usina B',
      attendant: 'Maria Costa',
      driver: 'Pedro Oliveira',
      fuel: 'Diesel S10',
      liters: 95,
      km_start: 8500,
      km_end: 8620,
      km_driven: 120,
      value: 570,
      m3: 35
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_relatorio_diesel.xlsx"',
        'Content-Length': uint8Array.length.toString()
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});