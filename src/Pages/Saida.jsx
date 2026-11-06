import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import ProductPicker from '@/components/ProductPicker';
import { ArrowUpFromLine, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EXIT_REASONS, formatNumber } from '@/lib/estoque';
import { registrarSaida } from '@/lib/estoqueOperations';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { api, selectedWarehouse } from '@/api/http';
import EmployeeLookup from '@/components/EmployeeLookup';

export default function Saida() {
  const [product, setProduct] = useState(null);
  const [centers, setCenters] = useState([]);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    quantity: '',
    date: new Date().toISOString().slice(0, 16),
    exit_reason: 'consumo_interno',
    employee_registration: '',
    cost_center_id: '',
    destination_type: 'centro_custo',
    company_name: '',
    document: '',
    notes: '',
    ca_number: '',
    replacement_reason: '',
  });
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api('org/centers', { warehouse: false }),
      api('org/units', { warehouse: false }),
    ])
      .then(([a, b]) => {
        setCenters(a);
        setUnits(b);
      })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tracked = ['epi', 'ferramenta'].includes(form.exit_reason);

  const handleSubmit = async () => {
    setError('');
    if (!product) return setError('Selecione um produto.');
    if (!form.quantity || Number(form.quantity) <= 0)
      return setError('Quantidade deve ser maior que zero.');
    if (Number(form.quantity) > (product.current_balance || 0))
      return setError(
        `Saldo insuficiente. Disponível: ${product.current_balance} ${product.unit}.`,
      );
    if (tracked && !employee)
      return setError(
        'Localize um funcionário ativo pela matrícula para registrar EPI ou ferramenta.',
      );
    if (form.employee_registration && !employee)
      return setError(
        'Clique em Buscar e confirme a matrícula antes de registrar.',
      );

    setSaving(true);
    try {
      const result = await registrarSaida({
        product_id: product.id,
        quantity: Number(form.quantity),
        date: new Date(form.date).toISOString(),
        exit_reason: form.exit_reason,
        employee_registration: employee?.registration || '',
        ca_number: form.exit_reason === 'epi' ? form.ca_number : '',
        replacement_reason:
          form.exit_reason === 'epi' ? form.replacement_reason : '',
        cost_center_id:
          form.destination_type === 'centro_custo' ? form.cost_center_id : null,
        destination_type: form.destination_type,
        company_name:
          form.destination_type === 'empresa' ? form.company_name : '',
        document: form.document,
        notes: form.notes,
        user,
      });
      toast.success(
        `Saída registrada! Novo saldo: ${formatNumber(result.new_balance)} ${product.unit}`,
      );
      setProduct(null);
      setEmployee(null);
      setForm({
        quantity: '',
        date: new Date().toISOString().slice(0, 16),
        exit_reason: 'consumo_interno',
        employee_registration: '',
        cost_center_id: '',
        destination_type: 'centro_custo',
        company_name: '',
        document: '',
        notes: '',
        ca_number: '',
        replacement_reason: '',
      });
    } catch (e) {
      setError(e.message || 'Erro ao registrar saída.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Saída de Estoque"
        subtitle="Registre a saída de produtos do almoxarifado"
        icon={ArrowUpFromLine}
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
            <ProductPicker value={product} onChange={setProduct} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Data *
              </Label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Motivo da Saída
              </Label>
              <select
                value={form.exit_reason}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    exit_reason: e.target.value,
                    destination_type: ['epi', 'ferramenta'].includes(
                      e.target.value,
                    )
                      ? 'centro_custo'
                      : f.destination_type,
                  }))
                }
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                {EXIT_REASONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <EmployeeLookup
                registration={form.employee_registration}
                onRegistrationChange={(v) => set('employee_registration', v)}
                employee={employee}
                onEmployeeChange={(e) => {
                  setEmployee(e);
                  if (e)
                    setForm((f) => ({
                      ...f,
                      cost_center_id: centers.some(
                        (c) => c.id === e.cost_center_id,
                      )
                        ? e.cost_center_id
                        : f.cost_center_id,
                    }));
                }}
                required={tracked}
              />
              <p className="text-xs text-slate-500 mt-1">
                Nome, função e setor são preenchidos automaticamente pelo
                cadastro do funcionário.
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Destino / Centro de custo
              </Label>
              <select
                value={form.destination_type}
                disabled={tracked}
                onChange={(e) => set('destination_type', e.target.value)}
                className="w-full h-9 border border-slate-200 rounded-lg px-2 mb-2 text-sm"
              >
                <option value="centro_custo">Centro de custo</option>
                {!tracked && <option value="empresa">Empresa atendida</option>}
              </select>
              {form.destination_type === 'empresa' ? (
                <Input
                  placeholder="Nome da empresa atendida"
                  value={form.company_name || ''}
                  onChange={(e) => set('company_name', e.target.value)}
                />
              ) : (
                <select
                  value={form.cost_center_id || ''}
                  onChange={(e) => set('cost_center_id', e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                >
                  <option value="">Selecione o centro de custo</option>
                  {centers
                    .filter(
                      (c) =>
                        units.some(
                          (u) =>
                            u.warehouse_id === selectedWarehouse() &&
                            u.id === c.unit_id,
                        ) && c.status === 'active',
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Documento
              </Label>
              <Input
                value={form.document}
                onChange={(e) => set('document', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            {form.exit_reason === 'epi' && (
              <>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    CA do EPI (quando aplicável)
                  </Label>
                  <Input
                    value={form.ca_number}
                    onChange={(e) => set('ca_number', e.target.value)}
                    placeholder="Certificado de Aprovação"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Motivo da substituição (opcional)
                  </Label>
                  <Input
                    value={form.replacement_reason}
                    onChange={(e) => set('replacement_reason', e.target.value)}
                    placeholder="Primeira entrega, desgaste..."
                  />
                </div>
              </>
            )}
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

          {product && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <span className="text-slate-500">Saldo atual: </span>
              <span className="font-semibold text-slate-800">
                {formatNumber(product.current_balance)} {product.unit}
              </span>
              {form.quantity && Number(form.quantity) > 0 && (
                <>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-slate-500">Novo saldo: </span>
                  <span
                    className={`font-semibold ${Number(form.quantity) > (product.current_balance || 0) ? 'text-rose-600' : 'text-slate-800'}`}
                  >
                    {formatNumber(
                      (product.current_balance || 0) - Number(form.quantity),
                    )}{' '}
                    {product.unit}
                  </span>
                  {Number(form.quantity) > (product.current_balance || 0) && (
                    <span className="ml-2 text-rose-600 text-xs font-medium">
                      ⚠ Saldo insuficiente
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setProduct(null);
                setEmployee(null);
                setForm((f) => ({
                  ...f,
                  quantity: '',
                  employee_registration: '',
                  notes: '',
                }));
                setError('');
              }}
            >
              Limpar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Save className="w-4 h-4 mr-1.5" />{' '}
              {saving ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
