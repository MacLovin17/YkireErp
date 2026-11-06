import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Tags, Plus, Pencil, Power } from 'lucide-react';
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
import { formatDate } from '@/lib/estoque';
import { toast } from 'sonner';

export default function Categorias() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmInactivate, setConfirmInactivate] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Category.list('-created_date', 500),
      base44.entities.Product.list(null, 2000),
    ]).then(([c, p]) => {
      setCategories(c);
      setProducts(p);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const productCount = (catId) =>
    products.filter((p) => p.category_id === catId).length;

  const handleInactivate = async (c) => {
    await base44.entities.Category.update(c.id, { status: 'inactive' });
    toast.success('Categoria inativada.');
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
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Categorias"
        subtitle={`${categories.length} categoria(s)`}
        icon={Tags}
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Nome</th>
              <th className="text-left px-4 py-2.5">Descrição</th>
              <th className="text-right px-4 py-2.5">Produtos</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Criada em</th>
              <th className="text-right px-4 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {c.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {c.description || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {productCount(c.id)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {c.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatDate(c.created_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {c.status === 'active' && (
                        <button
                          onClick={() => setConfirmInactivate(c)}
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirmInactivate}
        onOpenChange={(o) => !o && setConfirmInactivate(null)}
        onConfirm={() => handleInactivate(confirmInactivate)}
        title="Inativar Categoria"
        message={`Inativar "${confirmInactivate?.name}"? Não aparecerá em novos cadastros, mas permanece no histórico.`}
        confirmLabel="Inativar"
        destructive
      />
    </div>
  );
}

function CategoryFormDialog({ open, onOpenChange, category, onSaved }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        category
          ? { ...category }
          : { name: '', description: '', status: 'active' },
      );
    }
  }, [open, category]);

  const handleSubmit = async () => {
    setError('');
    if (!form.name?.trim()) return setError('Nome é obrigatório.');
    setSaving(true);
    try {
      const existing = await base44.entities.Category.filter({
        name: form.name.trim(),
      });
      if (existing.some((c) => c.id !== form.id)) {
        setSaving(false);
        return setError('Já existe uma categoria com este nome.');
      }
      if (form.id)
        await base44.entities.Category.update(form.id, {
          name: form.name.trim(),
          description: form.description,
          status: form.status,
        });
      else
        await base44.entities.Category.create({
          name: form.name.trim(),
          description: form.description,
          status: 'active',
        });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Nome *
            </Label>
            <Input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Descrição
            </Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </div>
          {category && (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Status
              </Label>
              <select
                value={form.status || 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
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
