import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import {
  Users,
  Pencil,
  Plus,
  Search,
  Save,
  X,
  FileText,
  UserRound,
  MapPin,
  Shirt,
  ContactRound,
  HeartHandshake,
  Trash2,
  LoaderCircle,
} from 'lucide-react';
import { api, selectedWarehouse } from '@/api/http';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const blankDependent = () => ({
  full_name: '',
  relationship: '',
  date_of_birth: '',
});
const clean = {
  cpf: '',
  registration: '',
  full_name: '',
  job_title: '',
  department: '',
  job_role_id: '',
  department_id: '',
  hr_company_id: '',
  unit_id: '',
  cost_center_id: '',
  status: 'active',
  birth_date: '',
  pis: '',
  admission_date: '',
  ctps_number: '',
  ctps_series: '',
  birthplace: '',
  employee_category: '',
  cbo: '',
  rg: '',
  cnh_category: '',
  uniform_size: '',
  boot_size: '',
  address_postal_code: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  dependents: [],
};
const field =
  'w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm';
const sizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EXG'];
const cnhCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
const tabs = [
  ['functional', 'Dados funcionais', UserRound],
  ['documents', 'Documentos / CTPS', ContactRound],
  ['address', 'Endereço', MapPin],
  ['uniform', 'Uniformes', Shirt],
  ['dependents', 'Dependentes', HeartHandshake],
];
const normalizedDate = (v) => (v ? String(v).slice(0, 10) : '');
// Seleção padronizada: apenas opções cadastradas, sem digitação livre.
function CatalogField({
  title,
  placeholder,
  items,
  value,
  onChange,
  required = true,
}) {
  const options = items.filter(
    (x) => x.status === 'active' || String(x.id) === String(value),
  );
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-700 block">
        {title}
      </Label>
      <select
        className={field}
        value={value ?? ''}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.id} — {x.name}
            {x.status !== 'active' ? ' (inativo)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  title,
  value,
  onChange,
  required = false,
  children,
  className = '',
  ...rest
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-slate-700 mb-1 block">
        {title}
      </Label>
      {children || (
        <Input
          required={required}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </div>
  );
}
export default function Funcionarios() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]),
    [units, setUnits] = useState([]),
    [centers, setCenters] = useState([]);
  const [jobs, setJobs] = useState([]),
    [departments, setDepartments] = useState([]),
    [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(clean),
    [editing, setEditing] = useState(false),
    [open, setOpen] = useState(false),
    [tab, setTab] = useState('functional');
  const [term, setTerm] = useState(''),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [opening, setOpening] = useState(false);
  const canEdit = ['master', 'admin'].includes(user?.role);
  const setValue = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const load = async () => {
    setLoading(true);
    try {
      const [employees, u, c, j, d, comp] = await Promise.all([
        api('employees'),
        api('org/units', { warehouse: false }),
        api('org/centers', { warehouse: false }),
        api('hr/catalog', { warehouse: false, params: { type: 'jobs' } }),
        api('hr/catalog', {
          warehouse: false,
          params: { type: 'departments' },
        }),
        api('hr/catalog', { warehouse: false, params: { type: 'companies' } }),
      ]);
      setRows(employees);
      setUnits(u);
      setCenters(c);
      setJobs(j);
      setDepartments(d);
      setCompanies(comp);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        [
          r.registration,
          r.full_name,
          r.job_title,
          r.department,
          r.hr_company_name,
        ].some((v) =>
          String(v || '')
            .toLowerCase()
            .includes(term.toLowerCase()),
        ),
      ),
    [rows, term],
  );
  const start = async (row = null) => {
    setTab('functional');
    setEditing(Boolean(row));
    if (!row) {
      setForm({
        ...clean,
        unit_id:
          units.find((u) => u.warehouse_id === selectedWarehouse())?.id ||
          units[0]?.id ||
          '',
      });
      setOpen(true);
      return;
    }
    setOpening(true);
    try {
      // Identidade, endereço, documentos e dependentes não são retornados na listagem geral.
      const full = await api('employees/detail', {
        warehouse: false,
        params: { id: row.id },
      });
      setForm({
        ...clean,
        ...full,
        cpf: full.cpf || '',
        cost_center_id: full.cost_center_id || '',
        unit_id: full.unit_id || '',
        job_role_id: full.job_role_id || '',
        department_id: full.department_id || '',
        hr_company_id: full.hr_company_id || '',
        birth_date: normalizedDate(full.birth_date),
        admission_date: normalizedDate(full.admission_date),
        boot_size: full.boot_size ?? '',
        dependents: (full.dependents || []).map((d) => ({
          ...d,
          date_of_birth: normalizedDate(d.date_of_birth),
        })),
      });
      setOpen(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOpening(false);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cpf = String(form.cpf || '').replace(/\D/g, '');
      if (cpf && cpf.length !== 11)
        throw new Error('CPF deve conter 11 dígitos.');
      if (!form.job_role_id || !form.department_id || !form.hr_company_id)
        throw new Error(
          'Selecione uma função, um departamento e uma empresa empregadora.',
        );
      const pis = String(form.pis || '').replace(/\D/g, '');
      if (pis && pis.length !== 11)
        throw new Error('PIS/PASEP deve conter 11 dígitos.');
      const cbo = String(form.cbo || '').replace(/\D/g, '');
      if (cbo && cbo.length !== 6)
        throw new Error('CBO deve conter 6 dígitos.');
      const cep = String(form.address_postal_code || '').replace(/\D/g, '');
      if (cep && cep.length !== 8)
        throw new Error('CEP deve conter 8 dígitos.');
      if (
        (form.dependents || []).some(
          (d) => !d.full_name.trim() || !d.relationship.trim(),
        )
      )
        throw new Error('Preencha nome e vínculo de todos os dependentes.');
      const data = {
        ...form,
        cpf,
        pis,
        cbo,
        birth_date: form.birth_date || null,
        admission_date: form.admission_date || null,
        address_postal_code: cep,
        cost_center_id: form.cost_center_id || null,
        boot_size: form.boot_size || null,
        dependents: form.dependents.map((d) => ({
          full_name: d.full_name,
          relationship: d.relationship,
          date_of_birth: d.date_of_birth || null,
        })),
      };
      await api('employees', {
        method: editing ? 'PUT' : 'POST',
        warehouse: false,
        data,
      });
      toast.success(
        editing ? 'Funcionário atualizado.' : 'Funcionário cadastrado.',
      );
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const updateDependent = (i, key, value) =>
    setForm((prev) => ({
      ...prev,
      dependents: prev.dependents.map((d, j) =>
        j === i ? { ...d, [key]: value } : d,
      ),
    }));
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Funcionários"
        subtitle="Matrícula única · função, departamento e empresa padronizados · dados trabalhistas"
        icon={Users}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por matrícula, nome, função ou setor"
          />
        </div>
        {canEdit && (
          <Button onClick={() => start()} disabled={opening}>
            <Plus className="h-4 w-4 mr-1" />
            Novo funcionário
          </Button>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[910px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                'Matrícula',
                'Nome',
                'Função',
                'Departamento',
                'Empresa',
                'Unidade',
                'Situação',
                '',
              ].map((s) => (
                <th key={s} className="text-left px-4 py-3">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold">{r.registration}</td>
                <td className="px-4 py-3">{r.full_name}</td>
                <td className="px-4 py-3">{r.job_title}</td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3">
                  {r.hr_company_name || (
                    <span className="text-amber-600">Pendente</span>
                  )}
                </td>
                <td className="px-4 py-3">{r.unit_name}</td>
                <td className="px-4 py-3">
                  {r.status === 'active' ? 'Ativo' : 'Inativo'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/rh/funcionarios/${encodeURIComponent(r.registration)}/ficha`}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Ficha
                      </Link>
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => start(r)}
                        disabled={opening}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={8} className="text-center p-8 text-slate-500">
                  Nenhum funcionário encontrado na unidade selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {opening && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Carregando cadastro completo...
        </p>
      )}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-5">
          <form
            onSubmit={save}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[93vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">
                  {editing ? 'Editar funcionário' : 'Cadastrar funcionário'}
                </h2>
                <p className="text-xs text-slate-500">
                  Os dados sensíveis ficam restritos ao RH autorizado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex gap-1.5 px-4 pt-3 pb-2 border-b overflow-x-auto shrink-0"
              role="tablist"
              aria-label="Dados do funcionário"
            >
              {tabs.map(([key, title, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition ${tab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon className="h-4 w-4" />
                  {title}
                </button>
              ))}
            </div>
            <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0">
              {tab === 'functional' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    title="Matrícula *"
                    required
                    value={form.registration}
                    disabled={editing}
                    onChange={(v) => setValue('registration', v)}
                  />
                  <Field
                    title="Nome completo *"
                    required
                    className="sm:col-span-2"
                    value={form.full_name}
                    onChange={(v) => setValue('full_name', v)}
                  />
                  <CatalogField
                    title="Função *"
                    placeholder="Função"
                    items={jobs}
                    value={form.job_role_id}
                    onChange={(v) => setValue('job_role_id', v)}
                  />
                  <CatalogField
                    title="Departamento *"
                    placeholder="Departamento"
                    items={departments}
                    value={form.department_id}
                    onChange={(v) => setValue('department_id', v)}
                  />
                  <div className="sm:col-span-2">
                    <CatalogField
                      title="Empresa *"
                      placeholder="Empresa"
                      items={companies}
                      value={form.hr_company_id}
                      onChange={(v) => setValue('hr_company_id', v)}
                    />
                  </div>
                  <Field title="Unidade / Obra *">
                    <select
                      required
                      className={field}
                      value={form.unit_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unit_id: e.target.value,
                          cost_center_id: '',
                        })
                      }
                    >
                      <option value="">Selecione</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field title="Centro de custo">
                    <select
                      className={field}
                      value={form.cost_center_id}
                      onChange={(e) =>
                        setValue('cost_center_id', e.target.value)
                      }
                    >
                      <option value="">Sem centro atribuído</option>
                      {centers
                        .filter(
                          (c) =>
                            String(c.unit_id) === String(form.unit_id) &&
                            c.status === 'active',
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field title="Situação">
                    <select
                      value={form.status}
                      className={field}
                      onChange={(e) => setValue('status', e.target.value)}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </Field>
                  <Field
                    title="Data de admissão"
                    type="date"
                    value={normalizedDate(form.admission_date)}
                    onChange={(v) => setValue('admission_date', v)}
                  />
                  <Field
                    title="Categoria do vínculo (RH)"
                    maxLength={60}
                    placeholder="Ex.: empregado, aprendiz..."
                    value={form.employee_category}
                    onChange={(v) => setValue('employee_category', v)}
                  />
                  <Field
                    title="CBO (6 dígitos)"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="000000"
                    value={form.cbo}
                    onChange={(v) => setValue('cbo', v.replace(/\D/g, ''))}
                  />
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    O vínculo com empresa é diferente da obra/unidade. A
                    matrícula continua global. As funções e os departamentos
                    devem ser criados nas abas de cadastros do RH antes de
                    selecionar.
                  </p>
                </div>
              )}
              {tab === 'documents' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    title="CPF"
                    value={form.cpf}
                    maxLength={14}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    autoComplete="off"
                    onChange={(v) => setValue('cpf', v.replace(/[^\d.-]/g, ''))}
                  />
                  <Field
                    title="Data de nascimento"
                    type="date"
                    value={normalizedDate(form.birth_date)}
                    onChange={(v) => setValue('birth_date', v)}
                  />
                  <Field
                    title="Naturalidade (cidade/UF)"
                    maxLength={120}
                    placeholder="Paracatu/MG"
                    value={form.birthplace}
                    onChange={(v) => setValue('birthplace', v)}
                  />
                  <Field
                    title="PIS/PASEP"
                    inputMode="numeric"
                    maxLength={14}
                    value={form.pis}
                    onChange={(v) => setValue('pis', v.replace(/\D/g, ''))}
                  />
                  <Field
                    title="RG / Documento de identidade"
                    value={form.rg}
                    maxLength={32}
                    onChange={(v) => setValue('rg', v)}
                  />
                  <Field
                    title="CTPS — Número"
                    maxLength={25}
                    value={form.ctps_number}
                    onChange={(v) => setValue('ctps_number', v)}
                  />
                  <Field
                    title="CTPS — Série"
                    maxLength={20}
                    value={form.ctps_series}
                    onChange={(v) => setValue('ctps_series', v)}
                  />
                  <Field title="Categoria da CNH">
                    <select
                      className={field}
                      value={form.cnh_category || ''}
                      onChange={(e) => setValue('cnh_category', e.target.value)}
                    >
                      <option value="">Não informado / Não possui</option>
                      {cnhCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    Categorias oficiais: A até E e combinações. Não existe
                    categoria F na CNH brasileira. O CPF será usado na emissão
                    de certificados somente por perfis autorizados.
                  </p>
                </div>
              )}
              {tab === 'address' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    title="CEP"
                    value={form.address_postal_code}
                    maxLength={9}
                    inputMode="numeric"
                    placeholder="00000-000"
                    onChange={(v) =>
                      setValue('address_postal_code', v.replace(/[^\d-]/g, ''))
                    }
                  />
                  <Field
                    title="Logradouro"
                    value={form.address_street}
                    onChange={(v) => setValue('address_street', v)}
                    className="sm:col-span-2"
                  />
                  <Field
                    title="Número"
                    value={form.address_number}
                    onChange={(v) => setValue('address_number', v)}
                  />
                  <Field
                    title="Complemento"
                    value={form.address_complement}
                    onChange={(v) => setValue('address_complement', v)}
                  />
                  <Field
                    title="Bairro"
                    value={form.address_neighborhood}
                    onChange={(v) => setValue('address_neighborhood', v)}
                  />
                  <Field
                    title="Cidade"
                    value={form.address_city}
                    onChange={(v) => setValue('address_city', v)}
                  />
                  <Field
                    title="UF"
                    value={form.address_state}
                    maxLength={2}
                    placeholder="MG"
                    onChange={(v) => setValue('address_state', v.toUpperCase())}
                  />
                </div>
              )}
              {tab === 'uniform' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field title="Tamanho do uniforme">
                    <select
                      className={field}
                      value={form.uniform_size || ''}
                      onChange={(e) => setValue('uniform_size', e.target.value)}
                    >
                      <option value="">Não informado</option>
                      {sizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field title="Numeração da bota">
                    <select
                      className={field}
                      value={form.boot_size || ''}
                      onChange={(e) => setValue('boot_size', e.target.value)}
                    >
                      <option value="">Não informado</option>
                      {Array.from({ length: 21 }, (_, i) => i + 30).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    Os tamanhos informados facilitam a preparação de kits de
                    uniforme, botas e EPIs. Não alteram o estoque
                    automaticamente.
                  </p>
                </div>
              )}
              {tab === 'dependents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <p className="text-sm text-slate-600">
                      Cadastre somente dependentes necessários para a finalidade
                      administrativa. Data de nascimento é opcional.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={form.dependents.length >= 20}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          dependents: [...f.dependents, blankDependent()],
                        }))
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {form.dependents.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
                    >
                      <Field
                        title="Nome do dependente *"
                        className="sm:col-span-3"
                        value={d.full_name}
                        onChange={(v) => updateDependent(i, 'full_name', v)}
                      />
                      <Field
                        title="Vínculo *"
                        className="sm:col-span-2"
                        value={d.relationship}
                        placeholder="Filho(a), cônjuge..."
                        onChange={(v) => updateDependent(i, 'relationship', v)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Excluir dependente"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            dependents: f.dependents.filter((_, j) => i !== j),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                      <Field
                        title="Data de nascimento (opcional)"
                        className="sm:col-span-3"
                        type="date"
                        value={normalizedDate(d.date_of_birth)}
                        onChange={(v) => updateDependent(i, 'date_of_birth', v)}
                      />
                    </div>
                  ))}
                  {!form.dependents.length && (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-center text-slate-500">
                      Nenhum dependente cadastrado.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t bg-slate-50 px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Informações pessoais: acesso restrito e registro de alterações.
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit">
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar funcionário'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
