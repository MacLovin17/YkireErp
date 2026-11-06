export const brl = (value) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(Number(value || 0));
export const qtyLabel = (value) => new Intl.NumberFormat('pt-BR', {maximumFractionDigits:3}).format(Number(value || 0));
export const dateLabel = (value) => value ? new Date(String(value).replace(' ', 'T')).toLocaleString('pt-BR') : '—';
export const saleCode = (id) => `VEN-${String(id).padStart(6, '0')}`;

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
// Comprovante simples, sem valor fiscal e sem processamento de pagamentos.
export function printSale(sale) {
  if (!sale?.items?.length) return;
  const win = window.open('', '_blank', 'width=760,height=760');
  if (!win) throw new Error('Permita pop-ups para imprimir o comprovante.');
  const items = sale.items.map(item => `<tr><td>${html(item.product_name)}<small>${html(item.unit)}</small></td><td>${html(qtyLabel(item.quantity))}</td><td>${html(brl(item.unit_price))}</td><td>${html(brl(item.line_total))}</td></tr>`).join('');
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${html(sale.code)}</title><style>body{font:13px Arial,sans-serif;color:#151515;max-width:690px;margin:32px auto}h1{font-size:22px}small{display:block;color:#666}table{width:100%;border-collapse:collapse}td,th{padding:11px 6px;border-bottom:1px solid #ddd;text-align:left}td:nth-child(n+2),th:nth-child(n+2){text-align:right}footer{border-top:1px dashed #aaa;margin-top:35px;padding-top:12px;color:#555}.total{font-size:20px;font-weight:700;text-align:right;margin-top:20px}@media print{body{margin:10mm auto}}</style></head><body><h1>Comprovante de venda</h1><p><strong>${html(sale.code)}</strong> • ${html(dateLabel(sale.created_at))}<br/>Cliente: ${html(sale.customer_name || 'Consumidor não identificado')}<br/>Atendente: ${html(sale.seller_name || '—')}<br/>Situação: ${html(sale.status)}</p><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><div class="total">Total: ${html(brl(sale.total))}</div><p>${html(sale.notes || '')}</p><footer>Comprovante interno de venda — NÃO É DOCUMENTO FISCAL.<br/>Nenhum pagamento é processado por este sistema nesta versão.</footer><script>window.onload=()=>{window.print();};<\/script></body></html>`);
  win.document.close();
}
