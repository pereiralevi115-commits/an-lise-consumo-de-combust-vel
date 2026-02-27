import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as pdfParse from 'npm:pdf-parse@1.1.1';

const MONTH_MAP = {
  'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4,
  'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8,
  'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
};

const MONTHS = Object.keys(MONTH_MAP).sort((a, b) => b.length - a.length);

function norm(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

const USINAS_NORM = [
  'STO ANT. DA PATRULHA', 'CAPIVARI DE BAIXO', 'PASSO DE TORRES',
  'BRACO DO NORTE', 'FLORIANOPOLIS', 'BLUMENAU', 'JOINVILLE',
  'CRICIUMA', 'TUBARAO', 'ARARANGUA', 'CASEIROS', 'SOMBRIO',
  'ITAJAI', 'ICARA', 'ORLEANS', 'LAGES', 'VILA FLORES', 'MAQUINE'
].sort((a, b) => b.length - a.length).map(norm);

const EQUIPS_NORM = [
  'CAMINHAO BETONEIRA', 'CAMINHAO BASCULANTE', 'BOMBA ESTACIONARIA',
  'VEICULO DE APOIO', 'PA CARREGADEIRA', 'BOMBA LANCA',
  'MUCK/PLATAFORMA', 'OUTROS'
].sort((a, b) => b.length - a.length).map(norm);

const FUELS = ['GASOLINA', 'S500', 'S10'];

function findNorm(text, candidates) {
  const normText = norm(text);
  for (const c of candidates) {
    const idx = normText.indexOf(c);
    if (idx !== -1) return { idx, end: idx + c.length };
  }
  return null;
}

function parsePdfNum(str) {
  if (!str || str === 'Infinity' || str === '-') return 0;
  str = str.trim().replace(',', '.');
  if (/^\d{1,3}\.\d{3}$/.test(str)) return parseInt(str.replace('.', ''), 10);
  return parseFloat(str) || 0;
}

function extractPlate(str) {
  let m = str.match(/^([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/);
  if (m) return m[1];
  m = str.match(/^([A-Z]{3}\d{4})/);
  if (m) return m[1];
  m = str.match(/^(CRT\d{4})/);
  if (m) return m[1];
  m = str.match(/^([A-Z]{6,8})([A-Z])/);
  if (m) {
    const remainder = str.substring(m[1].length);
    if (findNorm(remainder.substring(0, 30), USINAS_NORM)) return m[1];
  }
  return null;
}

function parseSegment(mes, placa, segment) {
  const normSeg = norm(segment);

  let fuelIdx = -1, fuelLen = 0, fuelName = '';
  for (const f of FUELS) {
    const idx = normSeg.indexOf(f);
    if (idx !== -1 && (fuelIdx === -1 || idx < fuelIdx)) {
      fuelIdx = idx; fuelLen = f.length; fuelName = f;
    }
  }
  if (fuelIdx === -1) return null;

  const beforeFuel = segment.substring(0, fuelIdx).trim();
  const afterFuel = segment.substring(fuelIdx + fuelLen);

  const cleanAfter = afterFuel.replace(/R\$\s*/g, ' ').replace(/-(?!\d)/g, ' 0 ');

  const simpleNums = cleanAfter.match(/\d+\.\d+|\d+/g) || [];
  if (simpleNums.length < 4) return null;

  const litros = parsePdfNum(simpleNums[0]);
  const km     = parsePdfNum(simpleNums[1]);
  const m3     = parsePdfNum(simpleNums[2]);
  const valor_rs = parsePdfNum(simpleNums[3]);

  const usinaResult = findNorm(beforeFuel, USINAS_NORM);
  const equipResult = findNorm(beforeFuel, EQUIPS_NORM);

  let usina = '', equipamento = '', motorista = '';

  if (usinaResult && equipResult) {
    usina = beforeFuel.substring(usinaResult.idx, usinaResult.end).trim();
    equipamento = beforeFuel.substring(equipResult.idx, equipResult.end).trim();
    const afterEnd = Math.max(usinaResult.end, equipResult.end);
    motorista = beforeFuel.substring(afterEnd).trim();
  } else if (usinaResult) {
    usina = beforeFuel.substring(usinaResult.idx, usinaResult.end).trim();
    motorista = beforeFuel.substring(usinaResult.end).trim();
  } else if (equipResult) {
    equipamento = beforeFuel.substring(equipResult.idx, equipResult.end).trim();
    motorista = beforeFuel.substring(equipResult.end).trim();
  } else {
    usina = beforeFuel.trim();
  }

  return { mes, placa, usina, equipamento, motorista, combustivel: fuelName, litros, km, m3, valor_rs };
}

function parseRecords(rawText) {
  const flat = rawText.replace(/\r?\n/g, ' ').replace(/  +/g, ' ').trim();

  const positions = [];
  let idx = 0;
  while (idx < flat.length) {
    let advanced = false;
    for (const m of MONTHS) {
      if (flat.substring(idx, idx + m.length) === m) {
        const afterMonth = flat.substring(idx + m.length).replace(/^ /, '');
        const plate = extractPlate(afterMonth);
        if (plate) {
          positions.push({ pos: idx, mes: m });
          idx += m.length;
          advanced = true;
          break;
        }
      }
    }
    if (!advanced) idx++;
  }

  if (positions.length === 0) return [];

  const records = [];
  for (let j = 0; j < positions.length; j++) {
    const { pos, mes } = positions[j];
    const segEnd = j + 1 < positions.length ? positions[j + 1].pos : flat.length;
    const afterMonth = flat.substring(pos + mes.length, segEnd).replace(/^ /, '');

    const plate = extractPlate(afterMonth);
    if (!plate) continue;

    const segment = afterMonth.substring(plate.length);
    const record = parseSegment(mes, plate, segment);
    if (record) records.push(record);
  }

  return records;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const pdfRes = await fetch(file_url);
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfData = await pdfParse.default(new Uint8Array(pdfBuffer));
    const text = pdfData.text;

    const records = parseRecords(text);

    return Response.json({ records, total: records.length });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack?.substring(0, 500) }, { status: 500 });
  }
});