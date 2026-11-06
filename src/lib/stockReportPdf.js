/**
 * YKIRE ERP — PDF dos relatórios de Estoque.
 * Documento independente da tela (não utiliza window.print / captura HTML).
 * Reaproveita jsPDF, que já é dependência do projeto.
 */

const COLUMN_TITLES = {
  Codigo: 'Código',
  Produto: 'Produto',
  Categoria: 'Categoria',
  Unidade: 'Unid.',
  Saldo: 'Saldo',
  Minimo: 'Mínimo',
  Custo: 'Custo médio',
  ValorTotal: 'Valor total',
  Situacao: 'Situação',
  Diferenca: 'Diferença',
  Localizacao: 'Localização',
  Data: 'Data',
  Quantidade: 'Qtd.',
  Documento: 'Documento',
  Fornecedor: 'Fornecedor',
  Usuario: 'Usuário',
  Setor: 'Setor',
  Funcionario: 'Funcionário',
  Entradas: 'Entradas',
  Saidas: 'Saídas',
  Total: 'Total',
  Inventario: 'Inventário',
  Status: 'Situação',
  Itens: 'Itens',
  Divergencias: 'Divergências',
  CriadoPor: 'Criado por',
  Esperado: 'Esperado',
  Contado: 'Contado',
  Valor: 'Valor',
  UltimaMov: 'Última mov.',
};
const MONEY_COLUMNS = new Set(['Custo', 'Valor', 'ValorTotal']);
const NUMBER_COLUMNS = new Set([
  'Saldo',
  'Minimo',
  'Diferenca',
  'Quantidade',
  'Entradas',
  'Saidas',
  'Total',
  'Itens',
  'Divergencias',
  'Esperado',
  'Contado',
]);
const LONG_COLUMNS = new Set([
  'Produto',
  'Categoria',
  'Fornecedor',
  'Documento',
  'Usuario',
  'Funcionario',
  'Setor',
  'CriadoPor',
  'Localizacao',
]);

export const stockPdfColumns = (rows) =>
  rows?.length ? Object.keys(rows[0]) : [];
export const stockPdfColumnTitle = (key) => COLUMN_TITLES[key] || key;
export const stockPdfValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (MONEY_COLUMNS.has(key)) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(amount)
      : '-';
  }
  if (NUMBER_COLUMNS.has(key)) {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
          number,
        )
      : '-';
  }
  return String(value).replace(/\s+/g, ' ').trim() || '-';
};

const safePDF = (value) =>
  String(value ?? '-')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u00a0]/g, ' ')
    .replace(/[\u0000-\u001f]/g, ' ');
const padded = (doc, str, maxWidth) =>
  doc.splitTextToSize(safePDF(str), Math.max(maxWidth, 4));
const asBrDate = (d) => d.toLocaleDateString('pt-BR');

function widthsFor(columns, totalWidth) {
  const weights = columns.map((c) => {
    if (c === 'Produto') return 3.5;
    if (LONG_COLUMNS.has(c)) return 2.5;
    if (c === 'Data' || c === 'UltimaMov') return 2.0;
    if (c === 'Situacao' || c === 'Status') return 1.7;
    if (MONEY_COLUMNS.has(c)) return 2.0;
    if (c === 'Codigo') return 1.4;
    return 1.5;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (totalWidth * w) / sum);
}

/**
 * @param {object} options
 * rows: exatamente o conjunto filtrado exibido na tela (não apenas as primeiras 100 linhas).
 * title: nome do relatório atual.
 * unitLabel: nome autorizado da unidade selecionada.
 * periodLabel: datas aplicadas ou "Posição atual".
 * generatedBy: usuário autenticado.
 * summaryLabel / summaryValue: agregação já calculada na tela.
 */
export async function exportStockReportPdf({
  rows,
  title,
  unitLabel,
  periodLabel,
  generatedBy,
  summaryLabel,
  summaryValue,
  reportKey,
}) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error('Nenhum registro encontrado para gerar o PDF.');
  const { jsPDF } = await import('jspdf');
  const keys = stockPdfColumns(rows);
  const landscape = keys.length >= 6;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const PW = landscape ? 297 : 210,
    PH = landscape ? 210 : 297;
  const M = 13,
    W = PW - 2 * M,
    bottom = PH - 19;
  const widths = widthsFor(keys, W);
  const now = new Date();
  const issuedAt = now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const font = keys.length >= 8 ? 7.1 : keys.length >= 6 ? 7.7 : 8.8;
  const lineHeight = font < 8 ? 3.35 : 3.9;
  let y = 0;

  function header() {
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, PW, 23, 'F');
    doc.setFillColor(79, 70, 229);
    doc.rect(M, 6.5, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text('YK', M + 5, 13, { align: 'center' });
    doc.setFontSize(14);
    doc.text('YKIRE ERP', M + 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('GESTÃO INTEGRADA  /  ESTOQUE', M + 14, 18.5);
    doc.setTextColor(226, 232, 240);
    doc.text('RELATÓRIO OPERACIONAL', PW - M, 13, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const lines = padded(doc, title || 'Relatório de Estoque', W);
    doc.text(lines, M, 34);
    const titleBottom = 34 + (lines.length - 1) * 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(M, titleBottom + 3, PW - M, titleBottom + 3);

    const boxY = titleBottom + 7;
    const meta = [
      ['UNIDADE / ALMOXARIFADO', unitLabel || 'Não informada'],
      ['PERÍODO / REFERÊNCIA', periodLabel || 'Posição atual'],
      ['EMITIDO POR', generatedBy || 'Usuário autenticado'],
    ];
    const seg = W / 3;
    doc.setFillColor(247, 249, 252);
    doc.roundedRect(M, boxY, W, 18, 2, 2, 'F');
    meta.forEach(([label, value], i) => {
      const x = M + i * seg + 3;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6.8);
      doc.text(safePDF(label), x, boxY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.3);
      const clipped = padded(doc, value, seg - 8).slice(0, 2);
      doc.text(clipped, x, boxY + 10.8);
      if (i < 2) {
        doc.setDrawColor(226, 232, 240);
        doc.line(M + (i + 1) * seg, boxY + 3, M + (i + 1) * seg, boxY + 15);
      }
    });

    const summaryY = boxY + 22;
    const cards = [
      ['REGISTROS', new Intl.NumberFormat('pt-BR').format(rows.length)],
      [summaryLabel || 'RESUMO', summaryValue || '-'],
      ['EMISSÃO', issuedAt],
    ];
    const cardW = (W - 8) / 3;
    cards.forEach(([label, value], i) => {
      const x = M + i * (cardW + 4);
      doc.setDrawColor(224, 231, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, summaryY, cardW, 17, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.9);
      doc.setTextColor(100, 116, 139);
      doc.text(safePDF(label.toUpperCase()), x + 3, summaryY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(value.length > 22 ? 8.5 : 10);
      doc.setTextColor(15, 23, 42);
      doc.text(padded(doc, value, cardW - 6)[0] || '-', x + 3, summaryY + 12.2);
    });
    y = summaryY + 23;
    tableHead();
  }

  function tableHead() {
    doc.setFillColor(235, 240, 248);
    doc.rect(M, y, W, 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(M, y + 10, PW - M, y + 10);
    let x = M;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(Math.max(6.4, font - 0.5));
    keys.forEach((k, i) => {
      const parts = padded(doc, stockPdfColumnTitle(k), widths[i] - 4);
      const align =
        MONEY_COLUMNS.has(k) || NUMBER_COLUMNS.has(k) ? 'right' : 'left';
      const pos = align === 'right' ? x + widths[i] - 2 : x + 2;
      doc.text(parts.slice(0, 2), pos, y + (parts.length > 1 ? 3.5 : 6.2), {
        align,
      });
      x += widths[i];
    });
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(font);
    doc.setTextColor(30, 41, 59);
  }

  function pageBreak() {
    doc.addPage();
    header();
  }
  function rowToCells(record) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(font);
    return keys.map((key, i) =>
      padded(doc, stockPdfValue(key, record[key]), widths[i] - 4),
    );
  }
  function writeRow(cellLines, rowIndex) {
    let offset = 0;
    const maxLines = Math.max(...cellLines.map((lines) => lines.length));
    // Linhas longas podem continuar em outra página, sem cortar informações.
    while (offset < maxLines) {
      const available = bottom - y - 3.8;
      const capacity = Math.floor((available - 5.2) / lineHeight);
      if (capacity < 1) {
        pageBreak();
        continue;
      }
      const take = Math.min(maxLines - offset, capacity);
      const h = Math.max(7.5, take * lineHeight + 4.6);
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 251, 254);
        doc.rect(M, y, W, h, 'F');
      }
      let x = M;
      cellLines.forEach((lines, i) => {
        const slice = lines.slice(offset, offset + take);
        const right = MONEY_COLUMNS.has(keys[i]) || NUMBER_COLUMNS.has(keys[i]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(font);
        doc.setTextColor(30, 41, 59);
        doc.text(slice, x + (right ? widths[i] - 2 : 2), y + 4.4, {
          align: right ? 'right' : 'left',
        });
        x += widths[i];
      });
      doc.setDrawColor(232, 237, 243);
      doc.setLineWidth(0.18);
      doc.line(M, y + h, PW - M, y + h);
      y += h;
      offset += take;
      if (offset < maxLines) pageBreak();
    }
  }

  header();
  rows.forEach((record, index) => writeRow(rowToCells(record), index));
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(224, 231, 240);
    doc.setLineWidth(0.25);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.4);
    doc.text('YKIRE ERP  |  Documento gerado automaticamente', M, PH - 9);
    doc.text(`Página ${page} de ${total}`, PW - M, PH - 9, { align: 'right' });
  }
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const safeKey = String(reportKey || 'estoque').replace(/[^a-z0-9_-]/gi, '_');
  doc.save(`YKIRE_Estoque_${safeKey}_${dateStamp}.pdf`);
  return { pages: total, records: rows.length };
}
