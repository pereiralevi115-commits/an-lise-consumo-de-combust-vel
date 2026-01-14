import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('Iniciando importação completa dos dados do PDF...');

    // Função para converter serial Excel para data
    const excelSerialToDate = (serial) => {
      const excelEpoch = new Date(1899, 11, 30);
      const days = parseInt(serial);
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Dados completos extraídos do PDF (formato: data, hora, placa, tipo, usina, frentista, motorista, combustível, litros, km, valor, m³)
    const rawRecords = [
      [46010, "08:42:27", "APS9D92", "BOMBA LANÇA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "Rodrigo Porto", "S10", 218.828, 330, 1148.847, null],
      [46011, "05:46:56", "APS9D92", "BOMBA LANÇA", "CONCRETAR SANTO ANTÔNIO DA PAT", "Uelinton da Silva", "MATEUS COSTA DOS SANTOS", "S500", 89.576, 249, 481.291848, null],
      [45994, "18:03:27", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "CLAUDIOMIRO FRIBEL BORGES", "S10", 192.101, 355, 1008.53025, 403],
      [45999, "16:04:44", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "CLAUDIOMIRO FRIBEL BORGES", "S10", 205.695, 348, 1079.89875, null],
      [46006, "15:25:10", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "CLAUDIOMIRO FRIBEL BORGES", "S10", 164.182, 263, 861.9555, null],
      [46010, "06:57:34", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "CLAUDIOMIRO FRIBEL BORGES", "S10", 238.984, 485, 1254.666, null],
      [46014, "16:04:49", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "CLAUDIOMIRO FRIBEL BORGES", "S10", 287.065, 576, 1507.09125, null],
      [46021, "14:40:28", "AYC4D06", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "CLAUDIOMIRO FRIBEL BORGES", "S10", 202.556, 356, 1063.419, null],
      [45993, "15:47:55", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "ERASMO DA SILVA CANELLA", "S10", 143.193, 187, 751.76325, 370.5],
      [45996, "15:01:07", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "ERASMO DA SILVA CANELLA", "S10", 224.257, 266, 1177.34925, null],
      [46001, "15:56:29", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "ERASMO DA SILVA CANELLA", "S10", 166.027, 207, 871.64175, null],
      [46006, "07:38:37", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "ERASMO DA SILVA CANELLA", "S10", 133.477, 139, 700.75425, null],
      [46008, "11:07:18", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "ERASMO DA SILVA CANELLA", "S10", 215.74, 296, 1132.635, null],
      [46010, "10:55:29", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "ERASMO DA SILVA CANELLA", "S10", 251.688, 403.4, 1321.362, null],
      [46013, "18:08:14", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDUARDO COSTA", "ERASMO DA SILVA CANELLA", "S10", 130.195, 146.6, 683.52375, null],
      [46014, "16:26:37", "AZJ1C51", "CAMINHÃO BETONEIRA", "CONCRETAR ARARANGUÁ", "EDIO GOMES", "ERASMO DA SILVA CANELLA", "S10", 191.046, 293.3, 1002.9915, null]
    ];

    // Converter para objetos e salvar
    const records = rawRecords.map(row => ({
      date: excelSerialToDate(row[0]),
      time: row[1],
      vehicle_plate: row[2],
      vehicle_type: row[3],
      unit: row[4],
      attendant: row[5],
      driver: row[6],
      fuel_type: row[7],
      liters: row[8],
      km_driven: row[9],
      cost: row[10],
      cubic_meters: row[11]
    }));
    
    console.log(`Convertendo ${records.length} registros...`);