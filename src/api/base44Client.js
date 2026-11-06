// Legacy compatibility facade for Base44-exported React pages.
// All data is served by our own PHP/MySQL API.
import { api } from './http';
const entity = (name) => ({
  list: (order, limit) =>
    api('entity', {
      params: { entity: name, action: 'list', limit: limit || 500 },
    }),
  get: (id) => api('entity', { params: { entity: name, action: 'get', id } }),
  filter: (filter) =>
    api('entity', {
      params: {
        entity: name,
        action: 'filter',
        filter: JSON.stringify(filter),
      },
    }),
  create: (data) =>
    api('entity', {
      method: 'POST',
      params: { entity: name, action: 'create' },
      data,
    }),
  update: (id, data) =>
    api('entity', {
      method: 'PUT',
      params: { entity: name, action: 'update', id },
      data,
    }),
  delete: () => {
    throw new Error('Exclusão direta desativada para preservar a auditoria.');
  },
});
export const base44 = {
  entities: Object.fromEntries(
    ['Product', 'Supplier', 'Category', 'Movement', 'Inventory', 'AppUser'].map(
      (n) => [n, entity(n)],
    ),
  ),
};
