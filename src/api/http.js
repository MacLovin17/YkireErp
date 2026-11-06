// Same-origin API. Browser never receives DB credentials.
let csrfToken = '';
export function setCsrfToken(token) {
  csrfToken = token || '';
}
export function selectedWarehouse() {
  return localStorage.getItem('ykire_warehouse_id') || '';
}
export function setSelectedWarehouse(id) {
  localStorage.setItem('ykire_warehouse_id', id);
}
export async function api(route, options = {}) {
  const params = new URLSearchParams({ route });
  const data = options.data;
  const bodyMethod = options.method || (data === undefined ? 'GET' : 'POST');
  if (options.warehouse !== false) {
    const wid = selectedWarehouse();
    if (wid) params.set('warehouse_id', wid);
  }
  for (const [k, v] of Object.entries(options.params || {}))
    if (v != null) params.set(k, String(v));
  let response;
  try {
    response = await fetch(
      `${import.meta.env.BASE_URL}api/index.php?${params}`,
      {
        method: bodyMethod,
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      },
    );
  } catch {
    throw new Error('Servidor indisponível. Verifique a API PHP e a conexão.');
  }
  const json = await response
    .json()
    .catch(() => ({ error: 'Resposta inválida do servidor PHP.' }));
  // Algumas hospedagens devolvem HTTP 200 mesmo quando o PHP responde {error: ...}.
  // O resultado nunca pode ser interpretado como autenticação bem-sucedida.
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    typeof json.error === 'string' &&
    json.error.trim()
  ) {
    throw new Error(json.error);
  }
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return json;
}

// Upload autenticado, sem expor diretamente o PDF em diretório público.
export async function apiUpload(route, formData) {
  const params = new URLSearchParams({ route });
  const response = await fetch(
    `${import.meta.env.BASE_URL}api/index.php?${params}`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: formData,
    },
  );
  const result = await response
    .json()
    .catch(() => ({ error: 'Resposta inválida ao enviar o PDF.' }));
  if (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    typeof result.error === 'string' &&
    result.error.trim()
  ) {
    throw new Error(result.error);
  }
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return result;
}
