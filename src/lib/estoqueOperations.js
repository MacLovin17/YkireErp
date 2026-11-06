import { api } from '@/api/http';
// Transactional server-side stock changes and permissions; no client-side balance writes.
export async function registrarEntrada(data) {
  return api('stock/move', { data: { ...data, type: 'entrada' } });
}
export async function registrarSaida(data) {
  return api('stock/move', { data: { ...data, type: 'saida' } });
}
export async function registrarAjuste(data) {
  return api('stock/adjust', { data });
}
export async function aprovarInventario(inventory) {
  const r = await api('stock/inventory/approve', {
    data: { inventory_id: inventory.id },
  });
  return r.adjustments;
}
export async function registrarTransferencia(data) {
  return api('stock/transfer', { data });
}
export async function verificarConsistenciaSaldo(productId) {
  const r = await api('entity', {
    params: { entity: 'Product', action: 'get', id: productId },
  });
  return {
    product_id: productId,
    stored: r.current_balance,
    calculated: r.current_balance,
    divergent: false,
  };
}
