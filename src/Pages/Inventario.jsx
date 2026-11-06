import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ClipboardList, Plus, Check, X, Pencil, Printer, Eye, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { INVENTORY_STATUS, formatNumber, formatCurrency, formatDateTime } from '@/lib/estoque';
import { aprovarInventario } from '@/lib/estoqueOperations';
import { printInventorySheet } from '@/lib/inventoryPrint';
import { useAuth } from '@/lib/AuthContext';
import { canViewFinancial } from '@/lib/permissions';
import { toast } from 'sonner';

const openStatuses = ['em_aberto', 'em_contagem'];
const counted = (item) => item.counted !== null && item.counted !== undefined && item.counted !== '';
const countDiff = (items) => items.filter((item) => counted(item) && Math.abs(Number(item.difference) || 0) > 0.0001).length;

export default function Inventario() {
  const { user } = useAuth();
  const isAdmin = ['master', 'admin'].includes(user?.role);
  const showMoney = canViewFinancial(user?.role);
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, allProducts, allCategories] = await Promise.all([
        base44.entities.Inventory.list('-created_date', 500),
        isAdmin ? base44.entities.Product.list(null, 2000) : Promise.resolve([]),
        isAdmin ? base44.entities.Category.list(null, 500) : Promise.resolve([]),
      ]);
      setInventories(list);
      setProducts(allProducts);
      setCategories(allCategories);
    } catch (err) {
      toast.error(err.message || 'Falha ao consultar inventários.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (inv) => {
    try {
      const adjustments = await aprovarInventario(inv);
      toast.success(`Inventário finalizado! ${adjustments.length} ajuste(s) aplicado(s) ao estoque.`);
      setApproveConfirm(null);
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Não foi possível finalizar o inventário.');
    }
  };
  const handlePrint = (inv) => {
    if (!printInventorySheet(inv, user?.company_name)) toast.error('O navegador bloqueou a janela de impressão. Permita pop-ups neste site.');
  };
  const handleCancel = async (inv) => {
    if (!window.confirm(`Cancelar o inventário ${inv.code}? Nenhum saldo será ajustado.`)) return;
    try {
      await base44.entities.Inventory.update(inv.id, { status: 'cancelado' });
      toast.success('Inventário cancelado.');
      await load();
    } catch (err) {
      toast.error(err.message || 'Erro ao cancelar inventário.');
    }
  };

  if (loading) return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return <div className="p-6 max-w-7xl mx-auto">
    <PageHeader title="Inventário Físico" icon={ClipboardList}
      subtitle={isAdmin ? 'Abra inventários, acompanhe contagens, valide e finalize os ajustes.' : 'Conte os produtos dos inventários abertos pela Administração.'}
      actions={<div className="flex flex-wrap gap-2">
        <button type="button" onClick={load} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"><RefreshCw className="w-4 h-4"/> Atualizar</button>
        {isAdmin && <button type="button" onClick={() => setDialogOpen(true)} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Novo Inventário</button>}
      </div>} />

    <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
      {isAdmin
        ? 'Fluxo: abrir inventário → realizar contagens → conferir divergências → enviar para validação → finalizar e ajustar o estoque. A folha impressa não informa saldos nem custos.'
        : 'Acesso de contagem: registre somente as quantidades físicas. Você não pode abrir, cancelar, aprovar ou finalizar inventários, nem modificar o estoque.'}
    </div>

    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr>
        <th className="text-left px-4 py-2.5">Código</th><th className="text-left px-4 py-2.5">Status</th>
        <th className="text-right px-4 py-2.5">Itens</th><th className="text-right px-4 py-2.5">Contados</th>
        {isAdmin && <th className="text-right px-4 py-2.5">Divergências</th>}
        {showMoney && <th className="text-right px-4 py-2.5">Valor Divergência</th>}
        <th className="text-left px-4 py-2.5">Aberto por</th><th className="text-left px-4 py-2.5">Data</th>
        <th className="text-right px-4 py-2.5">Ações</th>
      </tr></thead><tbody className="divide-y divide-slate-100">
        {inventories.length === 0 ? <tr><td colSpan={isAdmin ? (showMoney ? 9 : 8) : 7} className="px-4 py-10 text-center text-slate-500">{isAdmin ? 'Nenhum inventário nesta unidade.' : 'Não há inventários disponíveis para contagem nesta unidade.'}</td></tr>
        : inventories.map((inv) => {
          const items = inv.items || [];
          const divCount = countDiff(items);
          const divValue = items.reduce((sum, it) => sum + Math.abs(Number(it.divergence_value) || 0), 0);
          const count = items.filter(counted).length;
          const st = INVENTORY_STATUS[inv.status] || {};
          return <tr key={inv.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-mono text-xs">{inv.code}</td>
            <td className="px-4 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.bg || ''} ${st.color || ''}`}>{st.label || inv.status}</span></td>
            <td className="px-4 py-2.5 text-right">{items.length}</td>
            <td className="px-4 py-2.5 text-right font-medium">{count}/{items.length}</td>
            {isAdmin && <td className="px-4 py-2.5 text-right">{divCount}</td>}
            {showMoney && <td className="px-4 py-2.5 text-right">{formatCurrency(divValue)}</td>}
            <td className="px-4 py-2.5 text-slate-600">{inv.created_by_name || '—'}</td>
            <td className="px-4 py-2.5 text-slate-500">{formatDateTime(inv.created_date)}</td>
            <td className="px-4 py-2.5 text-right"><div className="flex items-center justify-end gap-1">
              <button type="button" onClick={() => handlePrint(inv)} className="p-1.5 rounded hover:bg-slate-100 text-indigo-600" title="Imprimir folha de contagem" aria-label={`Imprimir ${inv.code}`}><Printer className="w-4 h-4"/></button>
              <button type="button" onClick={() => setDetail(inv)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title={isAdmin ? 'Conferir inventário' : 'Registrar contagem'} aria-label={`Abrir contagem ${inv.code}`}>{openStatuses.includes(inv.status) ? <Pencil className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
              {isAdmin && inv.status === 'aguardando_aprovacao' && <button type="button" onClick={() => setApproveConfirm(inv)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Validar e finalizar (ajustar estoque)"><Check className="w-4 h-4"/></button>}
              {isAdmin && ['em_aberto','em_contagem','aguardando_aprovacao'].includes(inv.status) && <button type="button" onClick={() => handleCancel(inv)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Cancelar inventário"><X className="w-4 h-4"/></button>}
            </div></td>
          </tr>;
        })}
      </tbody></table>
    </div></div>

    {isAdmin && <InventoryCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} products={products} categories={categories} onSaved={load} />}
    {detail && <InventoryDetailDialog inventory={detail} user={user} onOpenChange={(open) => !open && setDetail(null)} onSaved={load} onPrint={() => handlePrint(detail)} />}
    <ConfirmDialog open={!!approveConfirm} onOpenChange={(open) => !open && setApproveConfirm(null)}
      onConfirm={() => handleApprove(approveConfirm)} title="Validar e finalizar inventário"
      message={`Confirmar a finalização do inventário ${approveConfirm?.code}? As divergências serão lançadas IMEDIATAMENTE como ajustes de estoque. Esta operação não poderá ser revertida pelo contador.`}
      confirmLabel="Finalizar e ajustar estoque" />
  </div>;
}

function InventoryCreateDialog({ open, onOpenChange, products, categories, onSaved }) {
  const [code, setCode] = useState('');
  const [scope, setScope] = useState('all');
  const [selCategory, setSelCategory] = useState('');
  const [selProducts, setSelProducts] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCode(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`);
    setScope('all');setSelCategory('');setSelProducts([]);setNotes('');setError('');
  }, [open]);

  const handleCreate = async () => {
    setError('');
    let items;
    if (scope === 'all') items = products.filter((p) => p.status === 'active');
    else if (scope === 'category') {
      if (!selCategory) return setError('Selecione uma categoria.');
      items = products.filter((p) => p.status === 'active' && String(p.category_id) === selCategory);
    } else {
      if (!selProducts.length) return setError('Selecione pelo menos um produto.');
      items = products.filter((p) => selProducts.includes(String(p.id)));
    }
    if (!items.length) return setError('Nenhum produto selecionado.');
    try {
      await base44.entities.Inventory.create({ code, items: items.map((p) => ({ product_id: p.id })), notes });
      toast.success('Inventário aberto, aguardando contagem física.');
      onOpenChange(false);await onSaved();
    } catch (err) { setError(err.message || 'Erro ao abrir inventário.'); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
    <DialogHeader><DialogTitle>Abrir inventário físico</DialogTitle></DialogHeader>
    {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}
    <div className="space-y-4 py-2">
      <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Código</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
      <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Escopo</Label>
        <div className="grid grid-cols-3 gap-2">{[{v:'all',l:'Todos'},{v:'category',l:'Por categoria'},{v:'manual',l:'Manual'}].map((o) => <button key={o.v} type="button" onClick={() => setScope(o.v)} className={`h-9 rounded-lg border-2 text-sm font-medium ${scope === o.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>{o.l}</button>)}</div>
      </div>
      {scope === 'category' && <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Categoria</Label><select value={selCategory} onChange={(e) => setSelCategory(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Selecione...</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
      {scope === 'manual' && <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Produtos e equipamentos (Ctrl/Cmd para seleção múltipla)</Label><select multiple value={selProducts} onChange={(e) => setSelProducts(Array.from(e.target.selectedOptions).map((option) => option.value))} className="w-full h-32 rounded-lg border border-slate-200 px-3 text-sm">{products.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></div>}
      <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Observações de abertura</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      <p className="text-xs text-slate-500">As contagens serão abertas em branco. A folha impressa não exibe o saldo cadastrado, evitando influenciar a contagem física.</p>
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleCreate}>Abrir Inventário</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function InventoryDetailDialog({ inventory, user, onOpenChange, onSaved, onPrint }) {
  const isAdmin = ['master', 'admin'].includes(user?.role);
  const showMoney = canViewFinancial(user?.role);
  const [items, setItems] = useState([]);
  const [changedProductIds, setChangedProductIds] = useState([]);
  const [justification, setJustification] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems((inventory.items || []).map((item) => ({ ...item })));
    setChangedProductIds([]);
    setJustification(inventory.justification || '');
    setNotes(inventory.notes || '');
  }, [inventory]);

  const editable = openStatuses.includes(inventory.status);
  const completed = items.filter(counted).length;
  const complete = items.length > 0 && completed === items.length;
  const divCount = countDiff(items);
  const totalDiv = items.reduce((s, item) => s + Math.abs(Number(item.divergence_value) || 0), 0);

  const updateCounted = (index, value) => {
    const productId = String(items[index]?.product_id);
    setChangedProductIds((prev) => prev.includes(productId) ? prev : [...prev, productId]);
    setItems((previous) => previous.map((item, idx) => {
      if (idx !== index) return item;
      if (value === '') return { ...item, counted: null, difference: null, divergence_value: null };
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return item;
      const diff = numeric - Number(item.expected || 0);
      return { ...item, counted: value, difference: diff, divergence_value: diff * Number(item.unit_cost || 0) };
    }));
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    try {
      // Send only changed rows: another counter may be working on other products.
      const payload = { items: items.filter((item) => changedProductIds.includes(String(item.product_id)))
        .map((item) => ({ product_id: item.product_id, counted: item.counted })) };
      if (isAdmin) {
        payload.justification = justification;
        payload.notes = notes;
        if (newStatus) payload.status = newStatus;
      }
      await base44.entities.Inventory.update(inventory.id, payload);
      toast.success(newStatus === 'aguardando_aprovacao' ? 'Contagem enviada para validação.' : newStatus === 'em_contagem' ? 'Inventário reaberto para contagem.' : 'Contagem registrada com sucesso.');
      await onSaved();onOpenChange(false);
    } catch (err) { toast.error(err.message || 'Erro ao salvar contagem.'); }
    finally { setSaving(false); }
  };

  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Inventário {inventory.code}</DialogTitle></DialogHeader>
    <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVENTORY_STATUS[inventory.status]?.bg || ''} ${INVENTORY_STATUS[inventory.status]?.color || ''}`}>{INVENTORY_STATUS[inventory.status]?.label || inventory.status}</span>
      <span className="text-slate-500">{items.length} produtos • {completed} contados{isAdmin ? ` • ${divCount} divergências` : ''}{showMoney ? ` • ${formatCurrency(totalDiv)}` : ''}</span>
    </div>
    {!isAdmin && <div className="text-sm mb-3 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-800">Informe somente a quantidade física encontrada. Os saldos do sistema e as divergências serão conferidos pela Administração.</div>}
    <div className="overflow-x-auto border border-slate-200 rounded-lg"><table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr>
        <th className="text-left px-3 py-2">Código</th><th className="text-left px-3 py-2">Produto / equipamento</th>
        <th className="text-left px-3 py-2">Un.</th><th className="text-left px-3 py-2">Localização</th>
        {isAdmin && <th className="text-right px-3 py-2">Saldo sistema</th>}
        <th className="text-right px-3 py-2">Quantidade contada</th>
        {isAdmin && <th className="text-right px-3 py-2">Diferença</th>}
        {showMoney && <th className="text-right px-3 py-2">Valor div.</th>}
      </tr></thead><tbody className="divide-y divide-slate-100">{items.map((item, index) => (
        <tr key={item.product_id} className={isAdmin && counted(item) && Math.abs(Number(item.difference) || 0) > 0.0001 ? 'bg-amber-50/50' : ''}>
          <td className="px-3 py-2 font-mono text-xs">{item.product_code}</td>
          <td className="px-3 py-2 font-medium text-slate-800">{item.product_name}</td>
          <td className="px-3 py-2 text-slate-600">{item.unit || 'un'}</td>
          <td className="px-3 py-2 text-slate-600">{item.location || '—'}</td>
          {isAdmin && <td className="px-3 py-2 text-right">{formatNumber(item.expected)}</td>}
          <td className="px-3 py-2 text-right">{editable ? <Input type="number" min="0" step="0.001" value={item.counted ?? ''} onChange={(e) => updateCounted(index, e.target.value)} placeholder="Contar" aria-label={`Quantidade de ${item.product_name}`} className="h-8 w-24 text-right ml-auto"/> : counted(item) ? formatNumber(item.counted) : '—'}</td>
          {isAdmin && <td className="px-3 py-2 text-right font-medium">{counted(item) ? `${Number(item.difference) > 0 ? '+' : ''}${formatNumber(item.difference)}` : '—'}</td>}
          {showMoney && <td className="px-3 py-2 text-right">{counted(item) ? formatCurrency(item.divergence_value) : '—'}</td>}
        </tr>
      ))}</tbody>
    </table></div>
    {editable && isAdmin && <div className="mt-4 space-y-3"><div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Justificativa das divergências</Label><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} placeholder="Informe a justificativa antes de validar divergências."/></div>
      <div><Label className="text-xs font-medium text-slate-600 mb-1.5 block">Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}/></div></div>}
    <DialogFooter className="mt-4 flex-wrap gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
      <Button variant="outline" onClick={onPrint}><Printer className="h-4 w-4 mr-2"/> Imprimir folha</Button>
      {editable && <Button variant="outline" onClick={() => handleSave()} disabled={saving}>Salvar Contagem ({completed}/{items.length})</Button>}
      {editable && isAdmin && <Button onClick={() => handleSave('aguardando_aprovacao')} disabled={saving || !complete || (divCount > 0 && !justification.trim())}>Enviar para Validação</Button>}
      {isAdmin && inventory.status === 'aguardando_aprovacao' && <Button variant="outline" onClick={() => handleSave('em_contagem')} disabled={saving}><RotateCcw className="h-4 w-4 mr-2"/> Reabrir contagem</Button>}
    </DialogFooter>
  </DialogContent></Dialog>;
}
