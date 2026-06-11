import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const motoristas = await base44.asServiceRole.entities.Motorista.list('codigo', 10000);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<motoristas>\n';
    motoristas.forEach(m => {
      xml += `<motorista codigo="${escapeXml(m.codigo)}" nome="${escapeXml(m.nome)}" />\n`;
    });
    xml += '</motoristas>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename=motoristas.xml'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}