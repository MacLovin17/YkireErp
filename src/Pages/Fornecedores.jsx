import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader, { SearchInput } from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Truck, Plus, Pencil, Power, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  maskCNPJ,
  validateCNPJ,
  formatDate,
  formatDateTime,
  formatNumber,
  MOVEMENT_TYPES,
} from '@/lib/estoque';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { canEdit } from '@/lib/permissions';

export default function Fornecedores() {
  const { user } = useAuth();
  const userCanEdit = canEdit(user?.role);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmInactivate, setConfirmInactivate] = useState(null);
  const [historySupplier, setHistorySupplier] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Supplier.list('-created_date', 500),
      base44.entities.Movement.list('-date', 2000),
    ]).then(([s, m]) => {
      setSuppliers(s);
      setMovements(m);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.company_name?.toLowerCase().includes(q) ||
      s.trade_name?.toLowerCase().includes(q) ||
      s.cnpj?.includes(q)
    );
  });

  const handleInactivate = async (s) => {
    await base44.entities.Supplier.update(s.id, { status: 'inactive' });
    toast.success('Fornecedor inativado.');
    load();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Fornecedores"
        subtitle={`${filtered.length} fornecedor(es)`}
        icon={Truck}
        actions={
          userCanEdit ? (
            <button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </button>
          ) : null
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Razão social, fantasia, CNPJ..."
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Razão Social</th>
                <th className="text-left px-4 py-2.5">Nome Fantasia</th>
                <th className="text-left px-4 py-2.5">CNPJ</th>
                <th className="text-left px-4 py-2.5">Contato</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {s.company_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {s.trade_name || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {s.cnpj || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && (
                        <div className="text-xs text-slate-400">{s.email}</div>
                      )}
                      {!s.phone && !s.email && '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {s.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setHistorySupplier(s)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                          title="Histórico de entradas"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {userCanEdit && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(s);
                                setDialogOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {s.status === 'active' && (
                              <button
                                onClick={() => setConfirmInactivate(s)}
                                className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirmInactivate}
        onOpenChange={(o) => !o && setConfirmInactivate(null)}
        onConfirm={() => handleInactivate(confirmInactivate)}
        title="Inativar Fornecedor"
        message={`Inativar "${confirmInactivate?.company_name}"? O histórico de entradas é preservado.`}
        confirmLabel="Inativar"
        destructive
      />

      {historySupplier && (
        <SupplierHistoryDialog
          supplier={historySupplier}
          movements={movements}
          onOpenChange={(o) => !o && setHistorySupplier(null)}
        />
      )}
    </div>
  );
}

function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        supplier
          ? { ...supplier }
          : {
              company_name: '',
              trade_name: '',
              cnpj: '',
              phone: '',
              email: '',
              address: '',
              notes: '',
              status: 'active',
            },
      );
    }
  }, [open, supplier]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.company_name?.trim())
      return setError('Razão social é obrigatória.');
    if (!form.cnpj || !validateCNPJ(form.cnpj))
      return setError('CNPJ inválido. Use 14 dígitos.');
    setSaving(true);
    try {
      const existing = await base44.entities.Supplier.filter({
        cnpj: form.cnpj.replace(/\D/g, ''),
      });
      if (existing.some((s) => s.id !== form.id)) {
        setSaving(false);
        return setError('Já existe um fornecedor com este CNPJ.');
      }
      const payload = { ...form, cnpj: form.cnpj.replace(/\D/g, '') };
      if (form.id) await base44.entities.Supplier.update(form.id, payload);
      else
        await base44.entities.Supplier.create({ ...payload, status: 'active' });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Razão Social *
            </Label>
            <Input
              value={form.company_name || ''}
              onChange={(e) => set('company_name', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Nome Fantasia
            </Label>
            <Input
              value={form.trade_name || ''}
              onChange={(e) => set('trade_name', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              CNPJ *
            </Label>
            <Input
              value={form.cnpj || ''}
              onChange={(e) => set('cnpj', maskCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Telefone
            </Label>
            <Input
              value={form.phone || ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              E-mail
            </Label>
            <Input
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Endereço
            </Label>
            <Input
              value={form.address || ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Observações
            </Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
            />
          </div>
          {supplier && (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Status
              </Label>
              <select
                value={form.status || 'active'}
                onChange={(e) => set('status', e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierHistoryDialog({ supplier, movements, onOpenChange }) {
  const entries = movements.filter(
    (m) => m.supplier_id === supplier.id && m.type === 'entrada',
  );
  const totalQty = entries.reduce((s, m) => s + m.quantity, 0);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Histórico de Entradas — {supplier.company_name}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-slate-500 mb-3">
          {entries.length} entrada(s) • Total: {formatNumber(totalQty)} unidades
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Produto</th>
                <th className="text-right px-3 py-2">Qtd.</th>
                <th className="text-left px-3 py-2">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Nenhuma entrada registrada.
                  </td>
                </tr>
              ) : (
                entries.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-slate-500">
                      {formatDateTime(m.date)}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {m.product_name}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                      +{formatNumber(m.quantity)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {m.document || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
