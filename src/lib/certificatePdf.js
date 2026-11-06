import { jsPDF } from 'jspdf';

// Redações preservadas dos cinco certificados encaminhados pela empresa.
// Nunca substitua o texto original por uma declaração genérica do YKIRE ERP.
const MODELOS = {
  nr12: {
    curso: '“NR- 12 Segurança em Máquinas e Equipamentos”',
    empresa: 'PROSEG LOCAÇÕES TRANSPORTES E SERVIÇOS LTDA',
    cnpj: '24.673.236/0001-57',
  },
  nr06: {
    curso: '“NR-06 Utilização e Conservação de EPI”',
    empresa: 'PROSEG LOCAÇÕES TRANSPORTES E SERVIÇOS LTDA',
    // Atenção: o DOCX original de NR-06 contém um CNPJ diferente dos demais modelos.
    cnpj: '25.140.485/0001-40',
  },
  nr18: {
    curso: '“NR-18”',
    empresa: 'PROSEG LOCAÇÕES TRANSPORTES E SERVIÇOS LTDA',
    cnpj: '24.673.236/0001-57',
  },
  nr05: {
    curso:
      '“Membro Designado da Comissão Interna de Prevenção de Acidentes - CIPA”',
    empresa: 'QSI QUALIDADE E INSPEÇÃO', // Ministrante do modelo original, diferente da Proseg.
    cnpj: null,
  },
  direcao: {
    curso: '“DIREÇÃO DEFENSIVA”',
    empresa: 'PROSEG LOCAÇÕES TRANSPORTES E SERVIÇOS LTDA',
    cnpj: '24.673.236/0001-57',
  },
};
const formatCpf = (v) => {
  const n = String(v || '').replace(/\D/g, '');
  if (n.length !== 11)
    throw new Error('CPF do colaborador não está preenchido corretamente.');
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
};
const formatDate = (value) => {
  const input = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input))
    throw new Error('Data do treinamento inválida.');
  const date = new Date(`${input}T12:00:00`);
  if (Number.isNaN(date.getTime()))
    throw new Error('Data do treinamento inválida.');
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
const normalizarLocal = (value) => {
  const t = String(value || '')
    .trim()
    .replace(/[.,;\s]+$/, '');
  if (!t) throw new Error('Local do treinamento não informado.');
  return t;
};

// As partes marcadas como negrito são semelhantes à formatação original do Word.
function redacaoOriginal(registro, modelo) {
  const n = String(registro.full_name_snapshot || '')
    .trim()
    .toLocaleUpperCase('pt-BR');
  if (!n) throw new Error('Nome do colaborador não informado.');
  const cpf = formatCpf(registro.cpf_snapshot);
  const data = formatDate(registro.training_date);
  const inicio = [
    { texto: 'Certifico que o Sr. ' },
    { texto: n, negrito: true },
    { texto: `, CPF ${cpf}, ` },
  ];
  // Snapshot da empresa selecionada. Emissões antigas continuam utilizando o modelo original.
  const empresa = String(
    registro.training_company_name_snapshot || modelo.empresa || '',
  ).trim();
  if (!empresa)
    throw new Error('Empresa ministrante não registrada neste certificado.');
  const curso = { texto: modelo.curso, negrito: true };
  switch (registro.template_code) {
    case 'nr12':
      return [
        ...inicio,
        { texto: 'concluiu com aproveitamento satisfatório o curso de ' },
        curso,
        {
          texto: `, em conformidade com a Norma Regulamentadora NR–12, do Ministério do Trabalho e Emprego - MTE, realizado no dia ${data}, ministrado pela Empresa ${empresa}`,
        },
      ];
    case 'nr06':
      return [
        ...inicio,
        { texto: 'concluiu com aproveitamento satisfatório o curso de ' },
        curso,
        {
          texto: ` (Equipamento de Proteção Individual) em conformidade com a Norma Regulamentadora NR – 06, do Ministério do Trabalho e Emprego - MTE, Item 6.7, realizado no dia ${data}, ministrado pela Empresa ${empresa}.`,
        },
      ];
    case 'nr18':
      return [
        ...inicio,
        { texto: 'concluiu com aproveitamento satisfatório o curso ' },
        curso,
        {
          texto: `, em conformidade com as Normas Regulamentadoras do Trabalho e Emprego - MTE, NR-18, Anexo I Alínea 1.1, realizado no dia ${data}, ministrado pela Empresa ${empresa}.`,
        },
      ];
    case 'nr05':
      return [
        ...inicio,
        { texto: 'concluiu com aproveitamento satisfatório o curso de ' },
        curso,
        {
          texto: `, em conformidade com a Norma Regulamentadora NR–05, do Ministério do Trabalho e Emprego - MTE, Item 5.32.2, realizado no dia ${data}, ministrado pela Empresa ${empresa}.`,
        },
      ];
    case 'direcao':
      return [
        ...inicio,
        { texto: 'concluiu o curso de ' },
        curso,
        {
          texto: `, com a carga horária de ${String(registro.hours).padStart(2, '0')} horas/aula, realizado no dia ${data}, em cumprimento à Lei nº 9.503/97 e a Resolução nº 050/98 do Conselho Nacional de Trânsito.${registro.training_company_name_snapshot ? ` Treinamento ministrado pela Empresa ${empresa}.` : ''}`,
        },
      ];
    default:
      throw new Error('Modelo de certificado não reconhecido.');
  }
}

// Texto justificado palavra a palavra, preservando negritos do original.
function comporLinhas(pdf, partes, fonte, maximo) {
  const palavras = partes.flatMap((p) =>
    String(p.texto)
      .split(/\s+/u)
      .filter(Boolean)
      .map((texto) => ({ texto, negrito: Boolean(p.negrito) })),
  );
  const medir = (p) => {
    pdf.setFont('helvetica', p.negrito ? 'bold' : 'normal');
    return pdf.getTextWidth(p.texto);
  };
  pdf.setFont('helvetica', 'normal');
  const espaco = pdf.getTextWidth(' ');
  const linhas = [];
  let atual = [],
    largura = 0;
  for (const palavra of palavras) {
    const tamanho = medir(palavra);
    if (tamanho > maximo)
      throw new Error(
        'Existe um termo longo demais para o modelo do certificado.',
      );
    const adicional = tamanho + (atual.length ? espaco : 0);
    if (atual.length && largura + adicional > maximo) {
      linhas.push({ palavras: atual, largura });
      atual = [];
      largura = 0;
    }
    largura += tamanho + (atual.length ? espaco : 0);
    atual.push({ ...palavra, largura: tamanho });
  }
  if (atual.length) linhas.push({ palavras: atual, largura });
  return { linhas, espaco };
}
function imprimirParagrafo(pdf, partes) {
  const x = 30,
    largura = 237;
  let font = 18,
    preparado;
  for (; font >= 12; font -= 0.25) {
    pdf.setFontSize(font);
    preparado = comporLinhas(pdf, partes, font, largura);
    // Evita sobrepor a data abaixo do parágrafo ao usar razão social extensa.
    if (
      preparado.linhas.length <= 8 &&
      74.4 + (preparado.linhas.length - 1) * font * 0.466 <= 119
    )
      break;
  }
  if (
    preparado.linhas.length > 8 ||
    74.4 + (preparado.linhas.length - 1) * font * 0.466 > 119
  )
    throw new Error(
      'Nome/texto muito longo para caber no modelo do certificado.',
    );
  const inicioY = 74.4,
    distancia = font * 0.466;
  pdf.setTextColor(0, 0, 0);
  for (let idx = 0; idx < preparado.linhas.length; idx++) {
    const linha = preparado.linhas[idx];
    const ultima = idx === preparado.linhas.length - 1;
    const bonus =
      !ultima && linha.palavras.length > 1
        ? Math.max(0, (largura - linha.largura) / (linha.palavras.length - 1))
        : 0;
    let cursor = x;
    for (let j = 0; j < linha.palavras.length; j++) {
      const p = linha.palavras[j];
      pdf.setFont('helvetica', p.negrito ? 'bold' : 'normal');
      pdf.text(p.texto, cursor, inicioY + idx * distancia);
      cursor +=
        p.largura +
        (j < linha.palavras.length - 1 ? preparado.espaco + bonus : 0);
    }
  }
}
function centralizarAjustado(
  pdf,
  texto,
  centroX,
  y,
  maxWidth,
  fontSize = 10.8,
  bold = false,
) {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(fontSize);
  let size = fontSize;
  while (pdf.getTextWidth(texto) > maxWidth && size > 7) {
    size -= 0.25;
    pdf.setFontSize(size);
  }
  pdf.text(texto, centroX, y, { align: 'center' });
}

// Converte o JPEG do modelo em PNG por canvas para evitar imagens inválidas (0 x 0)
// identificadas no PDF anterior. Confere dimensões antes de gerar o arquivo.
async function fundoEmPng(url) {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok)
    throw new Error(`Não foi possível carregar o modelo: ${url}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = blobUrl;
    await img.decode();
    if (img.naturalWidth < 1000 || img.naturalHeight < 700) {
      throw new Error(
        'O fundo do certificado está corrompido ou não foi carregado.',
      );
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx)
      throw new Error(
        'Seu navegador não conseguiu preparar o modelo do certificado.',
      );
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
function adicionarFundo(pdf, data) {
  const tamanho = pdf.getImageProperties(data);
  if (!(tamanho.width > 1000 && tamanho.height > 700)) {
    throw new Error('Imagem do certificado inválida. PDF não foi emitido.');
  }
  pdf.addImage(data, 'PNG', 0, 0, 297, 210);
}

export async function downloadCertificate(record) {
  const code = record.template_code;
  const modelo = MODELOS[code];
  if (!modelo) throw new Error('Modelo de certificado desconhecido.');
  if (record.status !== 'issued')
    throw new Error('Certificado cancelado não pode ser emitido.');
  const partes = redacaoOriginal(record, modelo);
  const local = normalizarLocal(record.location);
  const data = formatDate(record.training_date);
  const base = `${import.meta.env.BASE_URL}certificate-templates/`;
  const [frente, verso] = await Promise.all([
    fundoEmPng(`${base}${code}_1.jpg`),
    fundoEmPng(`${base}${code}_2.jpg`),
  ]);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  adicionarFundo(pdf, frente);
  imprimirParagrafo(pdf, partes);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(17);
  pdf.text(
    `${local}, ${data}${code === 'nr12' || code === 'nr05' ? '' : '.'}`,
    267,
    129,
    { align: 'right' },
  );
  // Mesmas áreas de assinaturas da frente do certificado original.
  pdf.setLineWidth(0.35);
  pdf.line(37, 156.5, 137, 156.5);
  pdf.line(151, 156.5, 273, 156.5);
  centralizarAjustado(
    pdf,
    String(record.full_name_snapshot || '').trim(),
    87,
    164.5,
    98,
    15.5,
  );
  centralizarAjustado(
    pdf,
    'Proseg Locações Transportes e Serviços LTDA',
    212,
    164.5,
    122,
    15.0,
  );
  if (modelo.cnpj)
    centralizarAjustado(pdf, `CNPJ: ${modelo.cnpj}`, 212, 172, 113, 14.0);

  pdf.addPage('a4', 'landscape');
  adicionarFundo(pdf, verso);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const rodapeY = { nr05: 168, nr06: 160, nr12: 167, nr18: 159, direcao: 136 }[
    code
  ];
  pdf.text(
    `CARGA HORÁRIA: ${String(record.hours).padStart(2, '0')} Horas;`,
    30,
    rodapeY,
  );
  pdf.text(`DATA: ${data}.`, 30, rodapeY + 5.2);
  pdf.text(`LOCAL: ${local}`, 30, rodapeY + 10.4);
  // Instrutor identificado pelo próprio registro de treinamento.
  const instrutor = String(record.instructor_name || '').trim();
  if (!instrutor) throw new Error('Instrutor não informado no certificado.');
  pdf.setLineWidth(0.35);
  pdf.line(112, 182, 183, 182);
  centralizarAjustado(pdf, instrutor, 147.5, 187.5, 91, 10.4);
  if (record.instructor_title)
    centralizarAjustado(
      pdf,
      String(record.instructor_title),
      147.5,
      192.8,
      95,
      9.8,
    );
  if (record.instructor_registration)
    centralizarAjustado(
      pdf,
      String(record.instructor_registration),
      147.5,
      198,
      90,
      9.6,
    );

  // O identificador interno fica no histórico do YKIRE e não altera o modelo impresso.
  const matricula = String(record.registration_snapshot || '').replace(
    /[^A-Za-z0-9_-]/g,
    '_',
  );
  pdf.save(`CERTIFICADO_${code.toUpperCase()}_${matricula}_${record.id}.pdf`);
}
