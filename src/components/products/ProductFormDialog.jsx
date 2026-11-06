import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
import { UNITS } from '@/lib/estoque';

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  suppliers,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        product
          ? { ...product }
          : {
              name: '',
              description: '',
              category_id: '',
              unit: 'unidade',
              supplier_id: '',
              location: '',
              shelf: '',
              min_stock: 0,
              max_stock: '',
              unit_cost: 0,
              status: 'active',
              notes: '',
            },
      );
    }
  }, [open, product]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name?.trim()) return setError('Nome é obrigatório.');
    if ((form.min_stock ?? 0) < 0)
      return setError('Estoque mínimo não pode ser negativo.');
    if (
      form.max_stock != null &&
      form.max_stock !== '' &&
      Number(form.max_stock) < 0
    )
      return setError('Estoque máximo não pode ser negativo.');
    if ((form.unit_cost ?? 0) < 0)
      return setError('Custo unitário não pode ser negativo.');

    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === form.category_id);
      const sup = suppliers.find((s) => s.id === form.supplier_id);
      const payload = {
        name: form.name.trim(),
        description: form.description || '',
        category_id: form.category_id || '',
        category_name: cat?.name || '',
        unit: form.unit,
        supplier_id: form.supplier_id || '',
        supplier_name: sup?.company_name || '',
        location: form.location || '',
        shelf: form.shelf || '',
        min_stock: Number(form.min_stock) || 0,
        max_stock:
          form.max_stock === '' || form.max_stock == null
            ? null
            : Number(form.max_stock),
        unit_cost: form.id ? undefined : Number(form.unit_cost) || 0,
        status: form.status,
        notes: form.notes || '',
      };

      if (form.id) {
        await base44.entities.Product.update(form.id, payload);
      } else {
        payload.current_balance = 0;
        await base44.entities.Product.create(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Field label="Código Interno (automático)">
            <Input
              disabled
              value={product?.code || 'Gerado após salvar: 1, 2, 3...'}
            />
          </Field>
          <Field label="Nome *" className="sm:col-span-2">
            <Input
              value={form.name || ''}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.category_id || ''}
              onChange={(e) => set('category_id', e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unidade de Medida">
            <select
              value={form.unit || 'unidade'}
              onChange={(e) => set('unit', e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fornecedor">
            <select
              value={form.supplier_id || ''}
              onChange={(e) => set('supplier_id', e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Localização">
            <Input
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Ex: Almoxarifado A"
            />
          </Field>
          <Field label="Prateleira">
            <Input
              value={form.shelf || ''}
              onChange={(e) => set('shelf', e.target.value)}
              placeholder="Ex: B-12"
            />
          </Field>
          <Field label="Estoque Mínimo">
            <Input
              type="number"
              min="0"
              value={form.min_stock ?? 0}
              onChange={(e) => set('min_stock', e.target.value)}
            />
          </Field>
          <Field label="Estoque Máximo">
            <Input
              type="number"
              min="0"
              value={form.max_stock ?? ''}
              onChange={(e) => set('max_stock', e.target.value)}
              placeholder="Opcional"
            />
          </Field>
          <Field
            label={
              form.id
                ? 'Custo médio do estoque (R$)'
                : 'Custo inicial de referência (R$)'
            }
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              disabled={!!form.id}
              value={
                form.id
                  ? Number(form.unit_cost ?? 0).toFixed(2)
                  : (form.unit_cost ?? 0)
              }
              onChange={(e) => set('unit_cost', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              {form.id
                ? 'Calculado automaticamente pelas entradas e saldos do almoxarifado selecionado.'
                : 'Preço padrão utilizado quando a entrada não informa um valor.'}
            </p>
          </Field>
          <Field label="Status">
            <select
              value={form.status || 'active'}
              onChange={(e) => set('status', e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
            />
          </Field>
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

function Field({ label, children, className }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-slate-600 mb-1 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
