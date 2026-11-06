/* YKIRE ERP — PGR 014. Modelo inspirado na capa e nos quadros do PGR Proseg fornecido.
   Exportação local, sem enviar dados profissionais a serviços externos.
   O documento é uma MINUTA até revisão/assinatura técnica. */
import { jsPDF } from 'jspdf';

export const newPgrContent = () => ({
  client: '',
  contractor: '',
  subcontractor: '',
  work_location: '',
  review_kind: 'Elaboração',
  technician_name: '',
  technician_title: '',
  technician_registration: '',
  methodology: '',
  evaluation_criteria: '',
  activities_summary: '',
  emergency_plan: '',
  goals: '',
  preventive_policy: '',
  effectiveness: '',
  dissemination: '',
  legal_basis: '',
  technical_conclusion: '',
  notes: '',
  roles: [],
  groups: [],
  risks: [],
  actions: [],
  areas: [],
  sectors: [],
  control_measures: [],
  epis: [],
  epcs: [],
  measurements: [],
  equipment: [],
  appendices: [],
  technical_notes: '',
});
export const pgrTables = {
  roles: {
    label: 'Funções e atividades',
    columns: [
      ['role', 'Função'],
      ['cbo', 'CBO'],
      ['ghe', 'GHE'],
      ['sector', 'Setor'],
      ['activity', 'Descrição da atividade'],
      ['employees', 'Efetivo'],
    ],
  },
  areas: {
    label: 'Ambientes',
    columns: [
      ['name', 'Ambiente'],
      ['floor', 'Piso'],
      ['ceiling', 'Cobertura'],
      ['conditions', 'Condições e descrição'],
    ],
  },
  sectors: {
    label: 'Setores',
    columns: [
      ['name', 'Setor'],
      ['description', 'Descrição das atividades'],
    ],
  },
  groups: {
    label: 'GHE / GES',
    columns: [
      ['code', 'Código'],
      ['name', 'Grupo homogêneo'],
      ['functions', 'Funções abrangidas'],
      ['description', 'Exposição / atividade'],
    ],
  },
  risks: {
    label: 'Inventário de riscos',
    columns: [
      ['ghe', 'GHE'],
      ['category', 'Grupo de risco'],
      ['hazard', 'Perigo / risco'],
      ['source', 'Fonte ou circunstância'],
      ['affected', 'Trabalhadores expostos'],
      ['damage', 'Possíveis consequências'],
      ['exposure', 'Tipo de exposição'],
      ['probability', 'Probabilidade (1–5)'],
      ['severity', 'Severidade (1–5)'],
      ['assessment', 'Avaliação / evidências'],
      ['level', 'Classificação técnica'],
      ['controls', 'Medidas existentes'],
      ['recommendation', 'Medidas propostas'],
    ],
  },
  control_measures: {
    label: 'Medidas administrativas',
    columns: [
      ['measure', 'Medida'],
      ['existing', 'Existente'],
      ['proposed', 'A executar'],
      ['evidence', 'Evidência'],
    ],
  },
  epis: {
    label: 'EPIs recomendados',
    columns: [
      ['ghe', 'GHE'],
      ['name', 'EPI'],
      ['ca', 'CA'],
      ['effectiveness', 'Eficácia avaliada'],
      ['frequency', 'Periodicidade'],
      ['evidence', 'Documento'],
    ],
  },
  epcs: {
    label: 'Proteção coletiva',
    columns: [
      ['name', 'EPC'],
      ['existing', 'Existente'],
      ['proposed', 'A executar'],
      ['evidence', 'Evidência'],
    ],
  },
  measurements: {
    label: 'Avaliações ambientais',
    columns: [
      ['sector', 'Setor'],
      ['location', 'Local'],
      ['agent', 'Agente'],
      ['result', 'Resultado'],
      ['unit', 'Unidade'],
      ['method', 'Método'],
      ['instrument', 'Instrumento'],
      ['date', 'Data'],
      ['notes', 'Observações'],
    ],
  },
  equipment: {
    label: 'Equipamentos utilizados',
    columns: [
      ['name', 'Equipamento'],
      ['manufacturer', 'Fabricante'],
      ['model', 'Modelo'],
      ['certificate', 'Calibração / certificado'],
    ],
  },
  appendices: {
    label: 'Anexos de referência',
    columns: [
      ['title', 'Descrição do anexo'],
      ['reference', 'Código ou referência'],
      ['notes', 'Observação'],
    ],
  },
  actions: {
    label: 'Plano de ação e cronograma',
    columns: [
      ['action', 'Ação preventiva'],
      ['related_risk', 'Perigo vinculado'],
      ['responsible', 'Responsável'],
      ['deadline', 'Prazo'],
      ['status', 'Situação'],
      ['evidence', 'Evidência de acompanhamento'],
    ],
  },
};
const emptyMarker = '[PENDENTE DE PREENCHIMENTO / ANÁLISE TÉCNICA]';
export const pgrSections = [
  {
    number: '1',
    title: 'IDENTIFICAÇÃO DA EMPRESA',
    key: 'identity',
    kind: 'identity',
  },
  {
    number: '1.1',
    title: 'DADOS DA CONTRATANTE E CONTRATO',
    key: 'contract',
    kind: 'contract',
  },
  {
    number: '1.1.1',
    title: 'CARACTERIZAÇÃO DOS AMBIENTES DE TRABALHO',
    key: 'areas',
    kind: 'table',
  },
  {
    number: '1.1.2',
    title: 'SETORES E ATIVIDADES',
    key: 'sectors',
    kind: 'table',
  },
  {
    number: '1.2',
    title: 'DESCRIÇÃO DAS ATIVIDADES POR FUNÇÃO',
    key: 'roles',
    kind: 'table',
  },
  {
    number: '1.3',
    title: 'GRUPOS HOMOGÊNEOS DE EXPOSIÇÃO (GHE/GES)',
    key: 'groups',
    kind: 'table',
  },
  {
    number: '2',
    title: 'RESPONSABILIDADE PELA IMPLANTAÇÃO',
    key: 'technical',
    kind: 'technical',
  },
  {
    number: '3',
    title: 'RESPONSABILIDADE TÉCNICA',
    key: 'technical_responsibility',
    kind: 'technical',
  },
  {
    number: '4',
    title: 'INTRODUÇÃO E CARACTERIZAÇÃO DAS ATIVIDADES',
    key: 'activities_summary',
    kind: 'text',
  },
  {
    number: '5',
    title: 'OBJETIVOS E CAMPO DE APLICAÇÃO',
    key: 'goals',
    kind: 'text',
  },
  {
    number: '6',
    title: 'CONCEITOS E CRITÉRIOS DE AVALIAÇÃO',
    key: 'methodology',
    kind: 'text',
  },
  {
    number: '7',
    title: 'AVALIAÇÃO DOS RISCOS OCUPACIONAIS',
    key: 'evaluation_criteria',
    kind: 'text',
  },
  { number: '8', title: 'PLANO DE AÇÃO', key: 'actions', kind: 'table' },
  {
    number: '9',
    title: 'MEDIDAS DE PREVENÇÃO DO PLANO DE AÇÃO',
    key: 'preventive_policy',
    kind: 'text',
  },
  {
    number: '9.1',
    title: 'MEDIDAS DE CONTROLE EXISTENTES',
    key: 'control_measures',
    kind: 'table',
  },
  {
    number: '9.2',
    title: 'EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL',
    key: 'epis',
    kind: 'table',
  },
  {
    number: '9.3',
    title: 'MEDIDAS DE PROTEÇÃO COLETIVA',
    key: 'epcs',
    kind: 'table',
  },
  {
    number: '10',
    title: 'PREPARAÇÃO PARA EMERGÊNCIAS',
    key: 'emergency_plan',
    kind: 'text',
  },
  {
    number: '11',
    title: 'INVENTÁRIO DE RISCOS OCUPACIONAIS',
    key: 'risks',
    kind: 'table',
  },
  {
    number: '14',
    title: 'EFICÁCIA DAS MEDIDAS',
    key: 'effectiveness',
    kind: 'text',
  },
  {
    number: '15',
    title: 'REGISTRO, MANUTENÇÃO E DIVULGAÇÃO DO PGR',
    key: 'dissemination',
    kind: 'text',
  },
  {
    number: '15.1',
    title: 'LEVANTAMENTOS DE NÍVEIS E AVALIAÇÕES AMBIENTAIS',
    key: 'measurements',
    kind: 'table',
  },
  {
    number: '15.2',
    title: 'EQUIPAMENTOS UTILIZADOS',
    key: 'equipment',
    kind: 'table',
  },
  {
    number: '15.3',
    title: 'OBSERVAÇÕES TÉCNICAS SOBRE MEDIÇÕES',
    key: 'technical_notes',
    kind: 'text',
  },
  {
    number: '16',
    title: 'LEVANTAMENTO DE RISCOS POR FUNÇÃO',
    key: 'risk_summary',
    kind: 'risk_summary',
  },
  {
    number: '17',
    title: 'METAS, PRIORIDADES E CRONOGRAMA',
    key: 'action_summary',
    kind: 'action_summary',
  },
  {
    number: '18',
    title: 'FUNDAMENTOS LEGAIS',
    key: 'legal_basis',
    kind: 'text',
  },
  {
    number: '19.1',
    title: 'DOCUMENTOS E ANEXOS',
    key: 'appendices',
    kind: 'table',
  },
  {
    number: '19',
    title: 'RECOMENDAÇÕES GERAIS E CONCLUSÃO TÉCNICA',
    key: 'technical_conclusion',
    kind: 'text',
  },
];
const value = (v) => String(v ?? '').trim() || emptyMarker;
const lineText = (v) => String(v ?? '').replace(/\r\n?/g, '\n');
const ptDate = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s || '')
    ? s.split('-').reverse().join('/')
    : 'Não informada';
const safeFile = (s) =>
  String(s || 'PGR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 80);
const escapeXml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const pairedRows = (rows, key) => {
  const cols = pgrTables[key].columns;
  return [
    cols.map((x) => x[1]),
    ...(rows || []).map((r) => cols.map((x) => String(r[x[0]] ?? '') || '—')),
  ];
};
const summarize = (r) =>
  `${r.hazard || 'Perigo não identificado'} — ${r.category || 'Grupo não definido'} — ${r.ghe || 'GHE a definir'}`;
export function pgrSectionRows(doc, section) {
  const c = doc.content || {};
  let rows = [];
  if (section.kind === 'identity')
    rows = [
      ['Empresa empregadora / subcontratada', doc.company_name],
      ['CNPJ', doc.company_cnpj],
      ['Unidade / estabelecimento', doc.unit_name],
      ['Local da execução', c.work_location],
      ['Tipo de documento', c.review_kind],
      ['Início', ptDate(doc.start_on)],
      ['Fim', ptDate(doc.end_on)],
    ];
  if (section.kind === 'contract')
    rows = [
      ['Contratante', c.client],
      ['Contratada', c.contractor],
      ['Subcontratada', c.subcontractor || doc.company_name],
      ['Nº contrato', doc.contract_number],
      ['Descrição das atividades', c.activities_summary],
    ];
  if (section.kind === 'technical')
    rows = [
      ['Responsável pela implantação', doc.company_name],
      ['Responsável técnico', c.technician_name],
      ['Qualificação', c.technician_title],
      ['Registro profissional', c.technician_registration],
    ];
  if (section.kind === 'table')
    return pairedRows(c[section.key] || [], section.key);
  if (section.kind === 'risk_summary')
    rows = (c.risks || []).map((r) => [
      r.ghe || '—',
      summarize(r),
      r.recommendation || '—',
    ]);
  if (section.kind === 'action_summary')
    rows = (c.actions || []).map((a) => [
      a.action || '—',
      a.responsible || '—',
      a.deadline || '—',
      a.status || 'Pendente',
    ]);
  return rows;
}
function xmlParagraph(text, style = 'Normal', opts = {}) {
  const lines = lineText(text).split('\n');
  return lines
    .map(
      (ln, i) =>
        `<w:p><w:pPr><w:pStyle w:val="${style}"/>${opts.center ? '<w:jc w:val="center"/>' : ''}${opts.breakBefore && i === 0 ? '<w:pageBreakBefore/>' : ''}</w:pPr><w:r><w:t xml:space="preserve">${escapeXml(ln || ' ')}</w:t></w:r></w:p>`,
    )
    .join('');
}
function xmlTable(rows) {
  if (!rows?.length) return xmlParagraph(emptyMarker);
  const n = Math.max(...rows.map((row) => row.length));
  const gridW = Math.floor(9300 / n);
  return `<w:tbl><w:tblPr><w:tblW w:w="9300" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((k) => `<w:${k} w:val="single" w:sz="5" w:color="B6C8B5"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${Array(n).fill(`<w:gridCol w:w="${gridW}"/>`).join('')}</w:tblGrid>${rows.map((cells, ri) => `<w:tr>${cells.map((v) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${ri === 0 ? '<w:shd w:fill="DDE7DB"/>' : ''}</w:tcPr>${xmlParagraph(v === undefined ? '—' : v)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}
// ZIP sem compressão (STORE) — DOCX padrão OOXML, sem serviços externos ou bibliotecas novas.
function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) {
    c ^= u8[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function zipStored(files) {
  const te = new TextEncoder(),
    local = [],
    central = [];
  let offset = 0;
  const p16 = (n) => [n & 255, (n >>> 8) & 255],
    p32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const f of files) {
    const name = te.encode(f.name),
      data = typeof f.data === 'string' ? te.encode(f.data) : f.data;
    const crc = crc32(data);
    const head = new Uint8Array([
      80,
      75,
      3,
      4,
      ...p16(20),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p32(crc),
      ...p32(data.length),
      ...p32(data.length),
      ...p16(name.length),
      ...p16(0),
    ]);
    local.push(head, name, data);
    const ct = new Uint8Array([
      80,
      75,
      1,
      2,
      ...p16(20),
      ...p16(20),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p32(crc),
      ...p32(data.length),
      ...p32(data.length),
      ...p16(name.length),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p16(0),
      ...p32(0),
      ...p32(offset),
    ]);
    central.push(ct, name);
    offset += head.length + name.length + data.length;
  }
  const centSize = central.reduce((a, b) => a + b.length, 0),
    count = files.length;
  const end = new Uint8Array([
    80,
    75,
    5,
    6,
    ...p16(0),
    ...p16(0),
    ...p16(count),
    ...p16(count),
    ...p32(centSize),
    ...p32(offset),
    ...p16(0),
  ]);
  return new Blob([...local, ...central, end], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
const imageDrawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="2700000" cy="1080000"/><wp:docPr id="1" name="Marca Proseg"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="proseg-logo.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="2700000" cy="1080000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
async function logoBinary() {
  const r = await fetch(
    `${import.meta.env.BASE_URL}pgr-assets/proseg-logo.jpg`,
  );
  if (!r.ok)
    throw new Error(
      'Logo da Proseg não encontrado. Envie a pasta pgr-assets da atualização.',
    );
  return new Uint8Array(await r.arrayBuffer());
}
export async function exportPgrDocx(doc) {
  const c = doc.content || {};
  const data = await logoBinary();
  let body = `<w:tbl><w:tblPr><w:tblW w:type="pct" w:w="5000"/></w:tblPr><w:tblGrid><w:gridCol w:w="800"/><w:gridCol w:w="8500"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="13300" w:hRule="atLeast"/></w:trPr><w:tc><w:tcPr><w:shd w:fill="166B21"/><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${xmlParagraph(' ')}</w:tc><w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr>${xmlParagraph('P.G.R', 'Title', { center: true })}${xmlParagraph('Programa de Gerenciamento de Riscos', 'Subtitle', { center: true })}${xmlParagraph('CONTRATANTE: ' + value(c.client), 'Normal', { center: true })}${xmlParagraph('CONTRATADA: ' + value(c.contractor), 'Normal', { center: true })}${xmlParagraph('SUBCONTRATADA: ' + value(c.subcontractor || doc.company_name), 'Normal', { center: true })}${imageDrawing}${xmlParagraph('CONTRATO: ' + value(doc.contract_number), 'Normal', { center: true })}${xmlParagraph('DOCUMENTO: ' + value(c.review_kind), 'Normal', { center: true })}${xmlParagraph('VIGÊNCIA: ' + ptDate(doc.start_on) + ' a ' + ptDate(doc.end_on), 'Normal', { center: true })}${xmlParagraph('RESPONSÁVEL TÉCNICO: ' + value(c.technician_name), 'Normal', { center: true })}${xmlParagraph('RASCUNHO / SUJEITO A VALIDAÇÃO E ASSINATURA TÉCNICA', 'Warning', { center: true })}</w:tc></w:tr></w:tbl>`;
  body += xmlParagraph('SUMÁRIO', 'Heading1', { breakBefore: true });
  body += pgrSections
    .map((s) => xmlParagraph(`${s.number} — ${s.title}`))
    .join('');
  for (const s of pgrSections) {
    body += xmlParagraph(`${s.number} — ${s.title}`, 'Heading1');
    if (['identity', 'contract', 'technical'].includes(s.kind))
      body += xmlTable([['Campo', 'Informação'], ...pgrSectionRows(doc, s)]);
    else if (s.kind === 'table') {
      if (s.key === 'risks') {
        for (const [index, r] of (c.risks || []).entries()) {
          body += xmlParagraph(
            'Risco ' + (index + 1) + ' — ' + (r.hazard || 'não informado'),
            'Heading1',
          );
          body += xmlTable([
            ['Campo', 'Informação'],
            ...pgrTables.risks.columns.map(([key, label]) => [
              label,
              r[key] || '—',
            ]),
          ]);
        }
        if (!(c.risks || []).length) body += xmlParagraph(emptyMarker);
      } else if ((pgrTables[s.key]?.columns || []).length > 5) {
        const items = c[s.key] || [];
        if (!items.length) body += xmlParagraph(emptyMarker);
        for (const [index, r] of items.entries()) {
          body += xmlParagraph(`Registro ${index + 1}`, 'Heading1');
          body += xmlTable([
            ['Campo', 'Informação'],
            ...pgrTables[s.key].columns.map(([key, label]) => [
              label,
              r[key] || '—',
            ]),
          ]);
        }
      } else body += xmlTable(pgrSectionRows(doc, s));
    } else if (s.kind === 'risk_summary' || s.kind === 'action_summary')
      body += xmlTable([
        s.kind === 'risk_summary'
          ? ['GHE', 'Perigo', 'Medidas propostas']
          : ['Ação', 'Responsável', 'Prazo', 'Situação'],
        ...pgrSectionRows(doc, s),
      ]);
    else body += xmlParagraph(value(c[s.key]));
  }
  body +=
    xmlParagraph('RESPONSABILIDADE E ASSINATURA', 'Heading1') +
    xmlParagraph(
      `Elaborado/revisado por: ${value(c.technician_name)} · ${value(c.technician_title)} · ${value(c.technician_registration)}`,
    ) +
    xmlParagraph(
      'Assinatura e validação profissional: __________________________________________',
    ) +
    xmlParagraph(
      'Este arquivo não comprova, por si, revisão, assinatura ou responsabilidade técnica.',
      'Warning',
    );
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1000" w:bottom="1134" w:left="1250" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="19"/></w:rPr><w:pPr><w:spacing w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="48"/></w:rPr><w:pPr><w:spacing w:before="520" w:after="260"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:after="500"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:color w:val="165B2C"/><w:sz w:val="25"/></w:rPr><w:pPr><w:spacing w:before="280" w:after="120"/><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Warning"><w:name w:val="Warning"/><w:rPr><w:b/><w:color w:val="A82D27"/><w:sz w:val="17"/></w:rPr></w:style></w:styles>`;
  const files = [
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
    {
      name: 'word/_rels/document.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/proseg-logo.jpg"/></Relationships>',
    },
    { name: 'word/media/proseg-logo.jpg', data },
  ];
  triggerDownload(
    zipStored(files),
    `PGR_${safeFile(doc.company_name)}_${safeFile(doc.contract_number || doc.id)}.docx`,
  );
}
function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
function imageToData(buffer) {
  let bin = '';
  const u = new Uint8Array(buffer);
  for (let i = 0; i < u.length; i += 8192)
    bin += String.fromCharCode(...u.subarray(i, i + 8192));
  return 'data:image/jpeg;base64,' + btoa(bin);
}
export async function exportPgrPdf(doc) {
  const c = doc.content || {},
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
  const width = 210,
    height = 297,
    left = 20,
    right = 190;
  const logo = imageToData((await logoBinary()).buffer);
  let y = 35;
  const heading = (txt) => {
    const lines = pdf.splitTextToSize(txt, 165);
    if (y + lines.length * 7 > 268) newPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(29, 91, 42);
    pdf.text(lines, left, y);
    y += lines.length * 7 + 4;
    pdf.setTextColor(0, 0, 0);
  };
  const para = (txt) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.4);
    pdf.setTextColor(35, 44, 40);
    for (const line of lineText(txt || emptyMarker).split('\n')) {
      const lines = pdf.splitTextToSize(line || ' ', 169);
      for (const t of lines) {
        if (y > 272) newPage();
        pdf.text(t, left, y);
        y += 5.2;
      }
      y += 2;
    }
    y += 3;
  };
  const table = (rows) => {
    if (!rows?.length) {
      para(emptyMarker);
      return;
    }
    const limit = rows[0].length;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].map((x) =>
        pdf.splitTextToSize(String(x ?? '—'), 168 / limit - 4),
      );
      const lines = Math.max(...cells.map((x) => x.length));
      const rh = Math.max(9, lines * 4.5 + 4);
      if (y + rh > 268) newPage();
      if (i === 0) pdf.setFillColor(226, 235, 226);
      else if (i % 2 === 0) pdf.setFillColor(249, 251, 249);
      else pdf.setFillColor(255, 255, 255);
      pdf.rect(left - 1, y - 4, 172, rh, 'F');
      pdf.setDrawColor(211, 222, 210);
      pdf.rect(left - 1, y - 4, 172, rh);
      pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      pdf.setTextColor(34, 46, 36);
      pdf.setFontSize(limit >= 8 ? 5.6 : limit >= 5 ? 6.2 : 8);
      for (let k = 0; k < cells.length; k++) {
        const xpos = left + (k * 168) / limit;
        pdf.text(cells[k], xpos, y, { maxWidth: 168 / limit - 2 });
      }
      y += rh;
    }
    y += 7;
  };
  const pageHeader = () => {
    pdf.setFillColor(25, 105, 39);
    pdf.rect(0, 0, 6, 297, 'F');
    pdf.setDrawColor(193, 206, 192);
    pdf.line(20, 25, 191, 25);
    pdf.addImage(logo, 'JPEG', 20, 8, 38, 15);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(32, 77, 46);
    pdf.text('PROGRAMA DE GERENCIAMENTO DE RISCOS', 190, 13, {
      align: 'right',
    });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(90, 95, 90);
    pdf.text((doc.company_name || 'YKIRE ERP').slice(0, 65), 190, 19, {
      align: 'right',
    });
  };
  const newPage = () => {
    pdf.addPage();
    y = 38;
    pageHeader();
  };
  // Capa com cores e estrutura inspiradas no original.
  pdf.setFillColor(24, 116, 39);
  pdf.rect(0, 0, 23, height, 'F');
  pdf.setFillColor(2, 89, 9);
  pdf.rect(0, 92, 27, 205, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(10, 20, 12);
  pdf.setFontSize(31);
  pdf.text('P.G.R', 115, 65, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(23);
  pdf.text('Programa de', 115, 82, { align: 'center' });
  pdf.text('Gerenciamento de Riscos', 115, 94, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  let coverY = 117;
  for (const [label, v] of [
    ['CONTRATANTE', c.client],
    ['CONTRATADA', c.contractor],
    ['SUBCONTRATADA', c.subcontractor || doc.company_name],
  ]) {
    const ls = pdf.splitTextToSize(label + ': ' + value(v), 145);
    pdf.text(ls, 116, coverY, { align: 'center' });
    coverY += ls.length * 5 + 3;
  }
  pdf.addImage(logo, 'JPEG', 78, 145, 77, 31);
  pdf.setFontSize(10);
  pdf.text('CONTRATO: ' + value(doc.contract_number), 115, 198, {
    align: 'center',
  });
  pdf.text('DOCUMENTO: ' + value(c.review_kind), 115, 208, { align: 'center' });
  pdf.text(
    'VIGÊNCIA: ' + ptDate(doc.start_on) + ' A ' + ptDate(doc.end_on),
    115,
    230,
    { align: 'center' },
  );
  pdf.setTextColor(149, 36, 32);
  pdf.setFontSize(9);
  pdf.text(
    'MINUTA PARA REVISÃO / ASSINATURA DO RESPONSÁVEL TÉCNICO',
    115,
    263,
    { align: 'center' },
  );
  newPage();
  heading('SUMÁRIO');
  pgrSections.forEach((s) => para(`${s.number} — ${s.title}`));
  for (const s of pgrSections) {
    heading(`${s.number} — ${s.title}`);
    if (['identity', 'contract', 'technical'].includes(s.kind))
      table([['CAMPO', 'INFORMAÇÃO'], ...pgrSectionRows(doc, s)]);
    else if (s.kind === 'table') {
      const rows = pgrSectionRows(doc, s);
      if (s.key === 'risks') {
        if (rows.length <= 1) {
          para(emptyMarker);
        } else {
          for (const [index, r] of (c.risks || []).entries()) {
            heading(
              'Risco ' + (index + 1) + ' — ' + (r.hazard || 'não informado'),
            );
            table([
              ['Campo', 'Informação'],
              ...pgrTables.risks.columns.map((col) => [
                col[1],
                r[col[0]] || '—',
              ]),
            ]);
          }
        }
      } else if ((pgrTables[s.key]?.columns || []).length > 5) {
        const items = c[s.key] || [];
        if (!items.length) para(emptyMarker);
        for (const [index, r] of items.entries()) {
          heading(`Registro ${index + 1}`);
          table([
            ['Campo', 'Informação'],
            ...pgrTables[s.key].columns.map(([key, label]) => [
              label,
              r[key] || '—',
            ]),
          ]);
        }
      } else table(rows);
    } else if (['risk_summary', 'action_summary'].includes(s.kind)) {
      let rr = pgrSectionRows(doc, s);
      if (rr.length === 0) para(emptyMarker);
      else
        table([
          s.kind === 'risk_summary'
            ? ['GHE', 'Perigo', 'Medidas propostas']
            : ['Ação', 'Responsável', 'Prazo', 'Situação'],
          ...rr,
        ]);
    } else para(value(c[s.key]));
  }
  heading('RESPONSABILIDADE TÉCNICA E ASSINATURA');
  para(
    `${value(c.technician_name)} — ${value(c.technician_title)} — ${value(c.technician_registration)}`,
  );
  para(
    'Assinatura e validação profissional: __________________________________________',
  );
  para(
    'Documento gerado a partir dos dados cadastrados. A emissão administrativa não equivale à assinatura ou aprovação técnica.',
  );
  const pageCount = pdf.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(105, 108, 106);
    pdf.line(20, 281, 190, 281);
    pdf.text(
      `PGR • ${doc.company_name || 'Empresa'} • Contrato ${doc.contract_number || '—'}`,
      20,
      287,
    );
    pdf.text(`${i - 1}/${pageCount - 1}`, 190, 287, { align: 'right' });
  }
  pdf.save(
    `PGR_${safeFile(doc.company_name)}_${safeFile(doc.contract_number || doc.id)}.pdf`,
  );
}
