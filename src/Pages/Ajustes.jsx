import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import ProductPicker from '@/components/ProductPicker';
import { SlidersHorizontal, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/estoque';
import { registrarAjuste } from '@/lib/estoqueOperations';
import { canEdit } from '@/lib/permissions';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function Ajustes() {
  const [product, setProduct] = useState(null);
  const [direction, setDirection] = useState('positivo'); // positivo | negativo | correcao
  const [form, setForm] = useState({
    quantity: '',
    new_balance: '',
    reason: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {}, []);

  const isAdmin = canEdit(user?.role);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!product) return setError('Selecione um produto.');
    if (!form.reason?.trim())
      return setError('Justificativa é obrigatória para ajustes.');

    setSaving(true);
    try {
      const result = await registrarAjuste({
        product_id: product.id,
        direction,
        quantity: form.quantity ? Number(form.quantity) : null,
        new_balance: direction === 'correcao' ? Number(form.new_balance) : null,
        reason: form.reason,
        notes: form.notes,
        user,
      });
      toast.success(
        `Ajuste registrado! Novo saldo: ${formatNumber(result.new_balance)} ${product.unit}`,
      );
      setProduct(null);
      setForm({ quantity: '', new_balance: '', reason: '', notes: '' });
    } catch (e) {
      setError(e.message || 'Erro ao registrar ajuste.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Ajustes de Estoque" icon={SlidersHorizontal} />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-700 font-medium">Acesso restrito</p>
          <p className="text-amber-600 text-sm mt-1">
            Apenas administradores podem realizar ajustes de estoque.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Ajustes de Estoque"
        subtitle="Ajustes positivos, negativos e correções pós-inventário"
        icon={SlidersHorizontal}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Produto *
            </Label>
            <ProductPicker
              value={product}
              onChange={setProduct}
              onlyActive={false}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Tipo de Ajuste *
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <DirButton
                active={direction === 'positivo'}
                onClick={() => setDirection('positivo')}
                label="Positivo"
                color="emerald"
              />
              <DirButton
                active={direction === 'negativo'}
                onClick={() => setDirection('negativo')}
                label="Negativo"
                color="rose"
              />
              <DirButton
                active={direction === 'correcao'}
                onClick={() => setDirection('correcao')}
                label="Correção"
                color="blue"
              />
            </div>
          </div>

          {direction === 'correcao' ? (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Novo Saldo (absoluto) *
              </Label>
              <Input
                type="number"
                min="0"
                value={form.new_balance}
                onChange={(e) => set('new_balance', e.target.value)}
                placeholder="0"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Quantidade *
              </Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Justificativa / Motivo * (obrigatório)
            </Label>
            <Textarea
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              rows={2}
              placeholder="Explique o motivo do ajuste..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Observação
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
            />
          </div>

          {product &&
            (() => {
              const prev = product.current_balance || 0;
              let novo = prev;
              if (direction === 'positivo')
                novo = prev + (Number(form.quantity) || 0);
              else if (direction === 'negativo')
                novo = prev - (Number(form.quantity) || 0);
              else novo = Number(form.new_balance) || 0;
              return (
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <span className="text-slate-500">Saldo anterior: </span>
                  <span className="font-semibold text-slate-800">
                    {formatNumber(prev)} {product.unit}
                  </span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-slate-500">Novo saldo: </span>
                  <span
                    className={`font-semibold ${novo < 0 ? 'text-rose-600' : 'text-slate-800'}`}
                  >
                    {formatNumber(novo)} {product.unit}
                  </span>
                  {novo < 0 && (
                    <span className="ml-2 text-rose-600 text-xs font-medium">
                      ⚠ Saldo negativo não permitido
                    </span>
                  )}
                </div>
              );
            })()}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setProduct(null);
                setError('');
              }}
            >
              Limpar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />{' '}
              {saving ? 'Registrando...' : 'Registrar Ajuste'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirButton({ active, onClick, label, color }) {
  const colors = {
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-500 bg-rose-50 text-rose-700',
    blue: 'border-blue-500 bg-blue-50 text-blue-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
        active
          ? colors[color]
          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
