// Helpers compartilhados do Módulo de Estoque

export const UNITS = [
  'unidade',
  'caixa',
  'pacote',
  'litro',
  'kg',
  'metro',
  'par',
  'kit',
];

export const ENTRY_TYPES = [
  { value: 'compra', label: 'Compra' },
  { value: 'devolucao', label: 'Devolução' },

  { value: 'outros', label: 'Outros' },
];

export const EXIT_REASONS = [
  { value: 'consumo_interno', label: 'Consumo Interno' },
  { value: 'requisicao', label: 'Requisição' },
  { value: 'epi', label: 'EPI — Entrega ao funcionário' },
  { value: 'ferramenta', label: 'Ferramenta — Responsabilidade' },

  { value: 'devolucao', label: 'Devolução' },
  { value: 'outros', label: 'Outros' },
];

export const MOVEMENT_TYPES = {
  venda: {
    label: 'Venda comercial',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    dot: 'bg-indigo-500',
  },
  venda_estorno: {
    label: 'Estorno de venda',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  devolucao_ferramenta: {
    label: 'Devolução de ferramenta',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    dot: 'bg-teal-500',
  },
  transferencia_entrada: {
    label: 'Transferência recebida',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  transferencia_saida: {
    label: 'Transferência enviada',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    dot: 'bg-orange-500',
  },
  entrada: {
    label: 'Entrada',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  saida: {
    label: 'Saída',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    dot: 'bg-rose-500',
  },
  ajuste_positivo: {
    label: 'Ajuste Positivo',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
  },
  ajuste_negativo: {
    label: 'Ajuste Negativo',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  inventario: {
    label: 'Inventário',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    dot: 'bg-purple-500',
  },
};

export const INVENTORY_STATUS = {
  em_aberto: {
    label: 'Em Aberto',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  em_contagem: {
    label: 'Em Contagem',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprovação',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  aprovado: {
    label: 'Aprovado',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  cancelado: { label: 'Cancelado', color: 'text-rose-600', bg: 'bg-rose-100' },
  finalizado: {
    label: 'Finalizado',
    color: 'text-slate-600',
    bg: 'bg-slate-200',
  },
};

// Retorna situação do estoque: normal, baixo, zerado, inativo
export function getStockStatus(product) {
  if (product.status === 'inactive') return 'inativo';
  if (product.current_balance <= 0) return 'zerado';
  if (product.min_stock > 0 && product.current_balance <= product.min_stock)
    return 'baixo';
  if (product.max_stock && product.current_balance > product.max_stock)
    return 'acima';
  return 'normal';
}

export const STOCK_STATUS_STYLES = {
  normal: {
    label: 'Normal',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  baixo: {
    label: 'Baixo',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  zerado: {
    label: 'Zerado',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  inativo: {
    label: 'Inativo',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
  acima: {
    label: 'Acima do Máx.',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR');
}

// Máscara de CNPJ: 00.000.000/0000-00
export function maskCNPJ(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function validateCNPJ(cnpj) {
  const digits = String(cnpj).replace(/\D/g, '');
  return digits.length === 14;
}

// Período relativo
export function getPeriodRange(period, customStart, customEnd) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (period) {
    case 'hoje':
      break;
    case '7dias':
      start.setDate(start.getDate() - 6);
      break;
    case '30dias':
      start.setDate(start.getDate() - 29);
      break;
    case 'mes':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'periodo':
      if (customStart) start = new Date(customStart + 'T00:00:00');
      if (customEnd) end.setTime(new Date(customEnd + 'T23:59:59').getTime());
      break;
    default:
      start = new Date(0);
  }
  return { start, end };
}

export function inPeriod(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

// Exporta array de objetos para CSV
export function exportToCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    // Neutraliza fórmulas perigosas ao abrir CSV no Excel/LibreOffice.
    const raw = String(v);
    const safe =
      /^[\s]*[=+@-]/.test(raw) && !/^-?\d+(?:[.,]\d+)?$/.test(raw.trim())
        ? "'" + raw
        : raw;
    const s = safe.replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
