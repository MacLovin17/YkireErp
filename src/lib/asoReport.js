// Relatórios do SSMA: não incluem CPF nem os PDFs dos certificados individuais.
// XLSX gerado com Open XML e ZIP simples (sem dependência adicional de npm).

const fmtDate = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
    : '—';
};
const columns = [
  'Matrícula',
  'Colaborador',
  'Empresa',
  'Unidade',
  'Exame',
  'Próxima avaliação',
  'Situação',
];
const clean = (v) =>
  String(v ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
const typeLabels = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno: 'Retorno ao trabalho',
  mudanca_riscos: 'Mudança de riscos',
  demissional: 'Demissional',
};
const alertLabels = {
  vencido: 'Prazo ultrapassado',
  amarelo: 'Até 15 dias',
  verde: '16 a 30 dias',
  normal: 'Mais de 30 dias',
  pendente: 'Sem próxima data',
};
const rowsForReport = (rows) =>
  rows.map((r) => [
    clean(r.registration),
    clean(r.full_name),
    clean(r.company_name || 'Não vinculada'),
    clean(r.unit_name),
    clean(typeLabels[r.exam_type] || 'Sem registro'),
    fmtDate(r.next_evaluation_on),
    clean(alertLabels[r.alert_status] || 'Não informado'),
  ]);
const safeFilename = () => 'controle_aso';
const escapeXml = (s) =>
  clean(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Requisitos mínimos OpenXML: uma planilha com cabeçalho, filtro, largura e primeira linha congelada.
function makeXlsx(rows) {
  const data = [columns, ...rowsForReport(rows)];
  const sheetRows = data
    .map(
      (cells, ri) =>
        `<row r="${ri + 1}">${cells
          .map((value, ci) => {
            const col = String.fromCharCode(65 + ci);
            return `<c r="${col}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  const lastRow = Math.max(1, data.length);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="17" customWidth="1"/><col min="2" max="2" width="39" customWidth="1"/><col min="3" max="3" width="46" customWidth="1"/><col min="4" max="4" width="17" customWidth="1"/><col min="5" max="5" width="29" customWidth="1"/><col min="6" max="6" width="19" customWidth="1"/><col min="7" max="7" width="33" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:G${lastRow}"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Controle ASO" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  return zipStored([
    [
      '[Content_Types].xml',
      `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      '_rels/.rels',
      `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    ['xl/workbook.xml', workbook],
    [
      'xl/_rels/workbook.xml.rels',
      `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/worksheets/sheet1.xml', sheet],
    ['xl/styles.xml', styles],
  ]);
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStored(entries) {
  const encoder = new TextEncoder();
  const out = [];
  const central = [];
  let offset = 0;
  const le16 = (dv, p, n) => dv.setUint16(p, n, true);
  const le32 = (dv, p, n) => dv.setUint32(p, n >>> 0, true);
  for (const [filename, text] of entries) {
    const name = encoder.encode(filename),
      data = encoder.encode(text),
      crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const d = new DataView(local.buffer);
    le32(d, 0, 0x04034b50);
    le16(d, 4, 20);
    le16(d, 6, 0x0800);
    le16(d, 8, 0);
    le32(d, 14, crc);
    le32(d, 18, data.length);
    le32(d, 22, data.length);
    le16(d, 26, name.length);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    out.push(local);
    const entry = new Uint8Array(46 + name.length);
    const c = new DataView(entry.buffer);
    le32(c, 0, 0x02014b50);
    le16(c, 4, 20);
    le16(c, 6, 20);
    le16(c, 8, 0x0800);
    le16(c, 10, 0);
    le32(c, 16, crc);
    le32(c, 20, data.length);
    le32(c, 24, data.length);
    le16(c, 28, name.length);
    le32(c, 42, offset);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length;
  }
  const centerLength = central.reduce((s, a) => s + a.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  le32(e, 0, 0x06054b50);
  le16(e, 8, entries.length);
  le16(e, 10, entries.length);
  le32(e, 12, centerLength);
  le32(e, 16, offset);
  return new Blob([...out, ...central, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function exportAsoXlsx(rows) {
  if (!rows?.length) throw new Error('Não há registros para exportar.');
  triggerDownload(makeXlsx(rows), `ykire_${safeFilename()}.xlsx`);
}
// Exportação PDF só de dados resumidos: sem cópia do certificado individual.
export async function exportAsoPdf(
  rows,
  { unitLabel, companyLabel, issuedBy },
) {
  if (!rows?.length) throw new Error('Não há registros para exportar.');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const x = 12,
    pageWidth = 297,
    widths = [24, 54, 76, 27, 38, 20, 33],
    lines = rowsForReport(rows),
    maxY = 194;
  const title = 'Controle administrativo de ASO';
  const head = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 23, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`YKIRE ERP  |  SSMA  |  ${title}`, x, 14);
    doc.setTextColor(58, 65, 79);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        `Unidade: ${unitLabel}   |   Empresa: ${companyLabel}   |   Emitido por: ${issuedBy}`,
        270,
      ),
      x,
      31,
    );
    doc.setFillColor(240, 244, 248);
    doc.rect(x, 41, 273, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    let cx = x;
    columns.forEach((h, i) => {
      doc.text(h, cx + 1, 47);
      cx += widths[i];
    });
    doc.setFont('helvetica', 'normal');
    return 52;
  };
  let y = head();
  for (let rIndex = 0; rIndex < lines.length; rIndex++) {
    const pieces = lines[rIndex].map((v, idx) =>
      doc.splitTextToSize(String(v), widths[idx] - 3),
    );
    const lineHeight = Math.max(...pieces.map((p) => p.length));
    const rowHeight = Math.max(9, lineHeight * 4.2 + 3);
    if (y + rowHeight > maxY) {
      doc.addPage();
      y = head();
    }
    if (rIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, y, 273, rowHeight, 'F');
    }
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    let cx = x;
    pieces.forEach((part, i) => {
      doc.text(part, cx + 1, y + 5);
      cx += widths[i];
    });
    y += rowHeight;
  }
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${lines.length} colaborador(es)  |  Acompanhamento administrativo (sem documentos médicos)`,
      x,
      204,
    );
    doc.text(`Página ${p} de ${totalPages}`, 285, 204, { align: 'right' });
  }
  doc.save(`ykire_${safeFilename()}.pdf`);
}

// Exported to support integrity tests without opening the browser UI.
export { makeXlsx as buildAsoReportXlsx };
