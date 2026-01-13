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

    // Sheet 1: Dados Mensais
    const monthlySheet = workbook.addWorksheet('Dados Mensais');
    monthlySheet.columns = [
      { header: 'MÊS', key: 'month', width: 15 },
      { header: 'LITROS', key: 'liters', width: 15 },
      { header: 'QUILÔMETROS', key: 'kilometers', width: 15 },
      { header: 'CUSTO', key: 'cost', width: 15 }
    ];
    monthlySheet.headerRow = 1;
    monthlySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    monthlySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    monthlySheet.addRow({ month: 'Setembro', liters: 5000, kilometers: 12000, cost: 15000 });
    monthlySheet.addRow({ month: 'Outubro', liters: 5200, kilometers: 13000, cost: 16000 });

    // Sheet 2: Usinas
    const plantsSheet = workbook.addWorksheet('Usinas');
    plantsSheet.columns = [
      { header: 'USINA', key: 'plant', width: 20 },
      { header: 'CUSTO TOTAL', key: 'total_cost', width: 15 }
    ];
    plantsSheet.headerRow = 1;
    plantsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    plantsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    plantsSheet.addRow({ plant: 'Usina A', total_cost: 25000 });
    plantsSheet.addRow({ plant: 'Usina B', total_cost: 20000 });

    // Sheet 3: Veículos
    const vehiclesSheet = workbook.addWorksheet('Veículos');
    vehiclesSheet.columns = [
      { header: 'PLACA', key: 'plate', width: 15 },
      { header: 'QUILÔMETROS', key: 'kilometers', width: 15 }
    ];
    vehiclesSheet.headerRow = 1;
    vehiclesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    vehiclesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC55A11' } };
    vehiclesSheet.addRow({ plate: 'ABC-1234', kilometers: 15000 });
    vehiclesSheet.addRow({ plate: 'XYZ-5678', kilometers: 12000 });

    // Sheet 4: Motoristas
    const driversSheet = workbook.addWorksheet('Motoristas');
    driversSheet.columns = [
      { header: 'MOTORISTA', key: 'driver', width: 20 },
      { header: 'QUILÔMETROS', key: 'kilometers', width: 15 }
    ];
    driversSheet.headerRow = 1;
    driversSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    driversSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44546A' } };
    driversSheet.addRow({ driver: 'João Silva', kilometers: 15000 });
    driversSheet.addRow({ driver: 'Maria Santos', kilometers: 12000 });

    // Sheet 5: Equipamentos
    const equipmentSheet = workbook.addWorksheet('Equipamentos');
    equipmentSheet.columns = [
      { header: 'TIPO EQUIPAMENTO', key: 'equipment_type', width: 20 },
      { header: 'PRODUÇÃO (M³)', key: 'production_m3', width: 15 }
    ];
    equipmentSheet.headerRow = 1;
    equipmentSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    equipmentSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA5A5A5' } };
    equipmentSheet.addRow({ equipment_type: 'Escavadeira', production_m3: 500 });
    equipmentSheet.addRow({ equipment_type: 'Retroescavadeira', production_m3: 450 });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=template_relatorio_diesel.xlsx'
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});