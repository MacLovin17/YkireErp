export const ROLE_LABELS = {
  master: 'Master',
  admin: 'Administrador',
  comum: 'Comum',
};

const ROLE_NAV_KEYS = {
  master: [
    'dashboard',
    'produtos',
    'entrada',
    'saida',
    'ajustes',
    'inventario',
    'historico',
    'categorias',
    'fornecedores',
    'alertas',
    'relatorios',
    'usuarios',
    'unidades',
    'transferencias',
    'auditoria',
    'funcionarios',
    'ferramentas',
    'epi',
    'vendas',
  ],
  admin: [
    'dashboard',
    'produtos',
    'entrada',
    'saida',
    'ajustes',
    'inventario',
    'historico',
    'categorias',
    'fornecedores',
    'alertas',
    'relatorios',
    'transferencias',
    'auditoria',
    'funcionarios',
    'ferramentas',
    'epi',
    'vendas',
  ],
  comum: [
    'dashboard',
    'produtos',
    'entrada',
    'saida',
    'inventario',
    'fornecedores',
  ],
};

export function getNavKeys(role) {
  return ROLE_NAV_KEYS[role] || [];
}

export function canAccess(role, key) {
  return getNavKeys(role).includes(key);
}

export function canEdit(role) {
  return role === 'master' || role === 'admin';
}

export function canManageUsers(role) {
  return role === 'master';
}
/** Master and Administrador are the only roles allowed to see financial inventory amounts. */
export function canViewFinancial(role) {
  return role === 'master' || role === 'admin';
}
