// Printable blind-count sheet. Never include balances, prices, costs or variance amounts.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function printInventorySheet(inventory, companyName = '') {
  const popup = window.open('', '_blank', 'width=1050,height=800');
  if (!popup) return false;
  const items = Array.isArray(inventory?.items) ? inventory.items : [];
  const rows = items.map((item, idx) => `<tr>
    <td class="num">${idx + 1}</td>
    <td class="code">${esc(item.product_code || item.product_id)}</td>
    <td class="name">${esc(item.product_name)}</td>
    <td>${esc(item.unit || 'un')}</td>
    <td>${esc(item.location || '—')}</td>
    <td class="blank">&nbsp;</td>
    <td class="blank">&nbsp;</td>
  </tr>`).join('');
  const now = new Date().toLocaleString('pt-BR');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <title>Folha de contagem — ${esc(inventory?.code)}</title>
    <style>
      @page { size: A4 landscape; margin: 13mm 12mm; }
      * { box-sizing: border-box; }
      body { font: 11px Arial, Helvetica, sans-serif; color: #172033; margin: 0; }
      header { border-bottom: 2px solid #273c6d; padding-bottom: 9px; margin-bottom: 13px; }
      h1 { margin: 0 0 4px; font-size: 19px; color: #172f65; }
      .sub { font-size: 11px; color: #53637d; }
      .info { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
      .info > div { flex: 1; padding: 8px; border: 1px solid #d6dce5; border-radius: 4px; }
      .lbl { display: block; text-transform: uppercase; font-size: 9px; color: #66738a; margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { background: #edf2f9; border: 1px solid #9aaabd; text-align: left; padding: 7px 5px; }
      td { border: 1px solid #b6c1ce; padding: 7px 5px; min-height: 29px; height: 29px; overflow-wrap: anywhere; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; }
      .num { width: 30px; text-align: center; }.code { width: 80px; }.name { width: 34%; }
      .blank { width: 12%; }
      .signatures { display: flex; justify-content: space-between; gap: 24px; padding-top: 48px; page-break-inside: avoid; }
      .signatures > div { flex: 1; border-top: 1px solid #505b68; text-align: center; padding-top: 7px; }
      .tip { margin: 12px 0 0; font-size: 10px; color: #53637d; }
      .actions { display: flex; justify-content: flex-end; margin-bottom: 13px; }
      button { background: #253f83; border: 0; border-radius: 4px; color: white; padding: 9px 15px; cursor: pointer; }
      @media print { .actions { display: none; } }
    </style></head><body>
    <div class="actions"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
    <header><h1>FOLHA DE CONTAGEM FÍSICA — INVENTÁRIO</h1>
    <div class="sub">${esc(companyName || 'YKIRE ERP')} · Documento para contagem manual, sem saldos de referência nem valores financeiros</div></header>
    <div class="info">
      <div><span class="lbl">Código do inventário</span><strong>${esc(inventory?.code)}</strong></div>
      <div><span class="lbl">Data da impressão</span><strong>${esc(now)}</strong></div>
      <div><span class="lbl">Responsável pela contagem</span>________________________________</div>
      <div><span class="lbl">Unidade / almoxarifado</span>________________________________</div>
    </div>
    <table><thead><tr><th class="num">#</th><th class="code">Código</th><th class="name">Produto / equipamento</th><th>Unidade</th><th>Localização</th><th class="blank">Qtd. contada</th><th class="blank">Observações</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="tip">Registre a quantidade física encontrada. Entregue a folha à equipe responsável para lançamento no YKIRE ERP. Somente o Master/Administrador poderá validar e finalizar os ajustes.</p>
    <div class="signatures"><div>Assinatura do(a) contador(a)</div><div>Conferência do(a) responsável</div><div>Data / Hora</div></div>
    </body></html>`;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  return true;
}
