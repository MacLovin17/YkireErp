import React, { useEffect, useMemo, useState } from 'react';
import {
  HeartPulse,
  CalendarClock,
  FileCheck2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Download,
  Upload,
  Building2,
  FileDown,
  Save,
  X,
  RefreshCw,
  FolderOpen,
  History,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api, apiUpload } from '@/api/http';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { exportAsoPdf, exportAsoXlsx } from '@/lib/asoReport';

const examTypes = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno: 'Retorno ao trabalho',
  mudanca_riscos: 'Mudança de riscos ocupacionais',
  demissional: 'Demissional',
};
const statuses = {
  aguardando_agendamento: 'Aguardando agendamento',
  agendado: 'Agendado',
  realizado_aguardando_aso: 'Realizado — aguardando ASO',
  aso_recebido: 'ASO recebido',
  revisao_necessaria: 'Revisão necessária',
};
const blank = {
  employee_id: '',
  exam_type: 'periodico',
  admin_status: 'aguardando_agendamento',
  clinic_id: '',
  performed_on: '',
  next_evaluation_on: '',
  administrative_notes: '',
};
const datePT = (s) =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(String(s).slice(0, 10))
    ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
    : '—';
const dayCount = (v) => {
  if (!v) return null;
  const due = Date.parse(v.slice(0, 10) + 'T12:00:00Z');
  const today = new Date();
  const now = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  );
  return Number.isFinite(due) ? Math.round((due - now) / 86400000) : null;
};
export function getAlert(row) {
  if (!row.aso_id || !row.next_evaluation_on)
    return { key: 'pendente', label: 'Sem data definida', level: 9 };
  const days = dayCount(row.next_evaluation_on);
  if (days === null)
    return { key: 'pendente', label: 'Sem data definida', level: 9 };
  if (days < 0)
    return {
      key: 'vencido',
      label: `${Math.abs(days)} dia(s) após a data`,
      level: 0,
      days,
    };
  if (days <= 15)
    return {
      key: 'amarelo',
      label: days === 0 ? 'Hoje' : `${days} dia(s)`,
      level: 1,
      days,
    };
  if (days <= 30)
    return { key: 'verde', label: `${days} dias`, level: 2, days };
  return { key: 'normal', label: `${days} dias`, level: 3, days };
}
const colors = {
  vencido: 'bg-rose-100 text-rose-800 border-rose-200',
  amarelo: 'bg-amber-50 text-amber-800 border-amber-200',
  verde: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  normal: 'bg-slate-100 text-slate-700 border-slate-200',
  pendente: 'bg-violet-50 text-violet-700 border-violet-200',
};
const chip = (key, label) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 border text-xs font-semibold ${colors[key] || colors.normal}`}
  >
    {label}
  </span>
);
const basicSelect =
  'w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800';
const Modal = ({ title, subtitle, children, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-6 flex items-center justify-center"
    onClick={onClose}
  >
    <div
      className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start border-b px-5 py-4">
        <div>
          <h3 className="font-bold text-xl">{title}</h3>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <button onClick={onClose} aria-label="Fechar janela">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export default function AsoControle() {
  const { user } = useAuth();
  const [tab, setTab] = useState('painel'),
    [rows, setRows] = useState([]),
    [opts, setOpts] = useState({ units: [], companies: [] }),
    [clinics, setClinics] = useState([]);
  const [unit, setUnit] = useState('all'),
    [company, setCompany] = useState('all'),
    [alertFilter, setAlertFilter] = useState('todos'),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null),
    [history, setHistory] = useState(null),
    [historyRows, setHistoryRows] = useState([]),
    [clinicDialog, setClinicDialog] = useState(null),
    [clinicForm, setClinicForm] = useState({
      name: '',
      cnpj: '',
      contact: '',
      status: 'active',
    });
  const [form, setForm] = useState(blank),
    [file, setFile] = useState(null),
    [historyLoading, setHistoryLoading] = useState(false);
  const loadFilters = async () => {
    try {
      const [filters, clinicList] = await Promise.all([
        api('aso/filters', { warehouse: false }),
        api('aso/clinics', { warehouse: false }),
      ]);
      setOpts(filters);
      setClinics(clinicList);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const load = async () => {
    setBusy(true);
    try {
      setRows(
        await api('aso/overview', {
          warehouse: false,
          params: { unit_id: unit, company_id: company },
        }),
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    loadFilters();
  }, []);
  useEffect(() => {
    load();
  }, [unit, company]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        ['vencido', 'amarelo', 'verde', 'normal', 'pendente'].map((key) => [
          key,
          rows.filter((r) => getAlert(r).key === key).length,
        ]),
      ),
    [rows],
  );
  const visible = useMemo(
    () =>
      rows
        .filter((r) =>
          [r.registration, r.full_name, r.unit_name, r.company_name].some((x) =>
            String(x || '')
              .toLocaleLowerCase('pt-BR')
              .includes(search.toLocaleLowerCase('pt-BR')),
          ),
        )
        .filter(
          (r) => alertFilter === 'todos' || getAlert(r).key === alertFilter,
        )
        .sort(
          (a, b) =>
            getAlert(a).level - getAlert(b).level ||
            a.full_name.localeCompare(b.full_name, 'pt-BR'),
        ),
    [rows, search, alertFilter],
  );
  const start = (emp) => {
    setFile(null);
    setForm({ ...blank, employee_id: String(emp.employee_id) });
    setEdit({ employee: emp, record: null });
  };
  const openHistory = async (emp) => {
    setHistory(emp);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      setHistoryRows(
        await api('aso/history', {
          warehouse: false,
          params: { employee_id: emp.employee_id },
        }),
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setHistoryLoading(false);
    }
  };
  const openExisting = (emp, record) => {
    setHistory(null);
    setFile(null);
    setForm({
      employee_id: emp.employee_id,
      exam_type: record.exam_type,
      admin_status: record.admin_status,
      clinic_id: record.clinic_id || '',
      performed_on: record.performed_on || '',
      next_evaluation_on: record.next_evaluation_on || '',
      administrative_notes: record.administrative_notes || '',
    });
    setEdit({ employee: emp, record });
  };
  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (
        file &&
        (file.size > 8 * 1024 * 1024 ||
          (file.type && file.type !== 'application/pdf'))
      )
        throw new Error('Selecione um PDF válido de até 8 MB.');
      const data = {
        ...form,
        clinic_id: form.clinic_id || null,
        ...(edit?.record ? { id: edit.record.id } : {}),
      };
      const result = await api('aso/records', {
        warehouse: false,
        method: edit?.record ? 'PUT' : 'POST',
        data,
      });
      const rid = edit?.record?.id || result.id;
      // Caso o anexo falhe, uma segunda tentativa edita o mesmo registro, evitando duplicação.
      if (!edit?.record)
        setEdit((p) => ({ ...p, record: { id: rid, ...data } }));
      if (file) {
        const fd = new FormData();
        fd.set('record_id', rid);
        fd.set('document', file);
        await apiUpload('aso/upload', fd);
      }
      toast.success('Acompanhamento de ASO salvo.');
      setEdit(null);
      setFile(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const saveClinic = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('aso/clinics', {
        warehouse: false,
        method: clinicDialog?.id ? 'PUT' : 'POST',
        data: {
          ...clinicForm,
          ...(clinicDialog?.id ? { id: clinicDialog.id } : {}),
        },
      });
      toast.success('Clínica salva.');
      setClinicDialog(null);
      await loadFilters();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const downloadDocument = (row) => {
    window.open(
      `${import.meta.env.BASE_URL}api/index.php?route=aso%2Fdocument&id=${encodeURIComponent(row.id)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };
  const exportRows = visible.map((r) => ({
    ...r,
    alert: getAlert(r).label,
    alert_status: getAlert(r).key,
  }));
  const exportFile = async (type) => {
    try {
      if (!exportRows.length)
        throw new Error('Nenhum registro para exportação.');
      if (type === 'xlsx') exportAsoXlsx(exportRows);
      else
        await exportAsoPdf(exportRows, {
          unitLabel:
            unit === 'all'
              ? 'Todas as unidades'
              : opts.units.find((o) => String(o.id) === unit)?.name || unit,
          companyLabel:
            company === 'all'
              ? 'Todas as empresas'
              : opts.companies.find((c) => String(c.id) === company)?.name ||
                company,
          issuedBy: user?.display_name || user?.username || '',
        });
    } catch (e) {
      toast.error(e.message);
    }
  };
  const metrics = [
    {
      key: 'vencido',
      name: 'Prazo ultrapassado',
      icon: AlertTriangle,
      tone: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    {
      key: 'amarelo',
      name: 'Até 15 dias',
      icon: Clock,
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      key: 'verde',
      name: '16 a 30 dias',
      icon: CalendarClock,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      key: 'pendente',
      name: 'Sem próxima data',
      icon: FileCheck2,
      tone: 'text-violet-700 bg-violet-50 border-violet-200',
    },
  ];
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Saúde Ocupacional / ASO"
          subtitle="Controle administrativo de exames, prazos e documentos recebidos"
          icon={HeartPulse}
        />
        <Button variant="outline" onClick={load} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <Label className="text-xs block mb-1">Obra / unidade</Label>
          <select
            value={unit}
            className={basicSelect}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="all">Todas as unidades autorizadas</option>
            {opts.units.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Label className="text-xs block mb-1">Empresa empregadora</Label>
          <select
            value={company}
            className={basicSelect}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="all">Todas as empresas</option>
            {opts.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Label className="text-xs block mb-1">Pesquisar colaborador</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute top-3 left-3 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Nome ou matrícula"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          ['painel', 'Painel de prazos'],
          ['registros', 'Registros e anexos'],
          ['clinicas', 'Clínicas'],
          ['relatorios', 'Relatórios'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setAlertFilter('todos');
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'painel' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <button
                type="button"
                key={m.key}
                onClick={() =>
                  setAlertFilter(alertFilter === m.key ? 'todos' : m.key)
                }
                className={`text-left border rounded-xl p-4 ${m.tone} ${alertFilter === m.key ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <m.icon className="h-5 w-5 mb-2" />
                <div className="text-3xl font-bold">{counts[m.key] || 0}</div>
                <div className="text-sm font-semibold mt-1">{m.name}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
            A próxima avaliação segue a data informada pelo responsável conforme
            o PCMSO. Cores indicam prioridade de acompanhamento, não a validade
            médica do ASO. Funcionários sem data ou sem registro aparecem em
            pendências.
          </p>
        </>
      )}
      {tab === 'clinicas' ? (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <h3 className="font-semibold">Clínicas utilizadas</h3>
            <Button
              onClick={() => {
                setClinicDialog({});
                setClinicForm({
                  name: '',
                  cnpj: '',
                  contact: '',
                  status: 'active',
                });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova clínica
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Clínica</th>
                <th className="p-3 text-left">Contato</th>
                <th className="p-3 text-left">Situação</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.contact || '—'}</td>
                  <td className="p-3">
                    {c.status === 'active' ? 'Ativa' : 'Inativa'}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setClinicDialog(c);
                        setClinicForm({
                          name: c.name,
                          cnpj: c.cnpj || '',
                          contact: c.contact || '',
                          status: c.status,
                        });
                      }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {!clinics.length && (
                <tr>
                  <td colSpan="4" className="text-center text-slate-500 p-8">
                    Nenhuma clínica cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {tab === 'relatorios' && (
            <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Relatório administrativo de ASO</h3>
                <p className="text-xs text-slate-500">
                  Dados de acompanhamento, sem documentos PDF, resultados
                  clínicos ou diagnósticos.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportFile('xlsx')}
                  disabled={!visible.length}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  onClick={() => exportFile('pdf')}
                  disabled={!visible.length}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          )}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap gap-3 justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {tab === 'painel'
                    ? 'Prioridades de acompanhamento'
                    : tab === 'registros'
                      ? 'Colaboradores e histórico'
                      : 'Prévia dos resultados'}
                </h3>
                <p className="text-xs text-slate-500">
                  {visible.length} de {rows.length} colaboradores · Somente
                  unidades autorizadas
                </p>
              </div>
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
                className="border rounded-lg h-9 px-2 text-sm"
              >
                <option value="todos">Todas as situações</option>
                <option value="vencido">Prazo ultrapassado</option>
                <option value="amarelo">Até 15 dias</option>
                <option value="verde">16 a 30 dias</option>
                <option value="normal">Mais de 30 dias</option>
                <option value="pendente">Sem próxima data</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[850px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      'Colaborador',
                      'Empresa / Unidade',
                      'Último tipo',
                      'Próxima avaliação',
                      'Alerta',
                      'Situação administrativa',
                      'Ações',
                    ].map((h) => (
                      <th key={h} className="p-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const a = getAlert(r);
                    return (
                      <tr className="border-t" key={r.employee_id}>
                        <td className="p-3">
                          <span className="font-semibold">{r.full_name}</span>
                          <div className="text-xs text-slate-500">
                            Mat. {r.registration}
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          {r.company_name || 'Empresa não vinculada'}
                          <div className="text-slate-500">{r.unit_name}</div>
                        </td>
                        <td className="p-3">{examTypes[r.exam_type] || '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          {datePT(r.next_evaluation_on)}
                        </td>
                        <td className="p-3">{chip(a.key, a.label)}</td>
                        <td className="p-3 text-xs">
                          {statuses[r.admin_status] || 'Sem registro'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openHistory(r)}
                            >
                              <History className="h-4 w-4 mr-1" />
                              Ficha
                            </Button>
                            <Button size="sm" onClick={() => start(r)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!visible.length && (
                    <tr>
                      <td
                        colSpan="7"
                        className="p-10 text-center text-slate-500"
                      >
                        Nenhum colaborador corresponde aos filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {edit && (
        <Modal
          title={
            edit.record
              ? 'Atualizar acompanhamento'
              : 'Novo acompanhamento de ASO'
          }
          subtitle={`${edit.employee.full_name} · Matrícula ${edit.employee.registration} · ${edit.employee.unit_name}`}
          onClose={() => setEdit(null)}
        >
          <form className="space-y-4" onSubmit={save}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="block mb-1 text-xs">Tipo de exame *</Label>
                <select
                  required
                  className={basicSelect}
                  value={form.exam_type}
                  onChange={(e) => set('exam_type', e.target.value)}
                >
                  {Object.entries(examTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="block mb-1 text-xs">
                  Acompanhamento administrativo *
                </Label>
                <select
                  className={basicSelect}
                  value={form.admin_status}
                  onChange={(e) => set('admin_status', e.target.value)}
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="block mb-1 text-xs">Clínica</Label>
              <select
                value={form.clinic_id}
                onChange={(e) => set('clinic_id', e.target.value)}
                className={basicSelect}
              >
                <option value="">Não definida</option>
                {clinics
                  .filter(
                    (c) =>
                      c.status === 'active' ||
                      String(c.id) === String(form.clinic_id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['performed_on', 'Data do exame'],
                ['next_evaluation_on', 'Próxima avaliação (PCMSO)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label className="block mb-1 text-xs">{label}</Label>
                  <Input
                    type="date"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="border bg-amber-50 border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
              A próxima data é determinada conforme orientação da saúde
              ocupacional/PCMSO; não será preenchida automaticamente por prazo
              fixo.
            </div>
            <div>
              <Label className="block mb-1 text-xs">
                Observações administrativas (sem dados clínicos)
              </Label>
              <textarea
                maxLength={500}
                rows={2}
                className="border rounded-lg w-full p-3 text-sm"
                value={form.administrative_notes}
                onChange={(e) => set('administrative_notes', e.target.value)}
                placeholder="Ex.: aguardando retorno da clínica"
              />
            </div>
            <div>
              <Label className="block mb-1 text-xs">
                Anexar ASO oficial PDF (opcional, até 8MB)
              </Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Documento protegido no servidor, disponível somente a
                administradores SSMA autorizados.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                <Save className="h-4 w-4 mr-1" />
                {busy ? 'Salvando...' : 'Salvar registro'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {history && (
        <Modal
          title="Histórico de ASO"
          subtitle={`${history.full_name} · Matrícula ${history.registration}`}
          onClose={() => setHistory(null)}
        >
          <div className="space-y-3">
            {historyLoading ? (
              <p className="text-slate-500">Carregando...</p>
            ) : (
              historyRows.map((r) => (
                <div key={r.id} className="border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {examTypes[r.exam_type]}
                      </p>
                      <p className="text-xs text-slate-500">
                        {statuses[r.admin_status]} ·{' '}
                        {r.clinic_name || 'Clínica não informada'}
                      </p>
                    </div>
                    {chip(
                      getAlert({ ...r, aso_id: r.id }).key,
                      getAlert({ ...r, aso_id: r.id }).label,
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Exame: {datePT(r.performed_on)}
                    {r.received_on
                      ? ` · Recebido: ${datePT(r.received_on)}`
                      : ''}{' '}
                    · Próxima avaliação: {datePT(r.next_evaluation_on)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExisting(history, r)}
                    >
                      Editar
                    </Button>
                    {r.original_pdf_name && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(r)}
                      >
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Baixar ASO
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            {!historyLoading && !historyRows.length && (
              <p className="text-sm text-slate-500">
                Nenhum ASO registrado para esta matrícula.
              </p>
            )}
            <Button
              onClick={() => {
                const selected = history;
                setHistory(null);
                start(selected);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo registro
            </Button>
          </div>
        </Modal>
      )}
      {clinicDialog && (
        <Modal
          title={clinicDialog.id ? 'Editar clínica' : 'Cadastrar clínica'}
          onClose={() => setClinicDialog(null)}
        >
          <form onSubmit={saveClinic} className="space-y-3">
            <div>
              <Label className="block mb-1">Nome da clínica *</Label>
              <Input
                required
                maxLength={180}
                value={clinicForm.name}
                onChange={(e) =>
                  setClinicForm((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="block mb-1">CNPJ (opcional)</Label>
              <Input
                maxLength={18}
                placeholder="00.000.000/0000-00"
                value={clinicForm.cnpj}
                onChange={(e) =>
                  setClinicForm((c) => ({ ...c, cnpj: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="block mb-1">Contato</Label>
              <Input
                maxLength={160}
                value={clinicForm.contact}
                onChange={(e) =>
                  setClinicForm((c) => ({ ...c, contact: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="block mb-1">Situação</Label>
              <select
                className={basicSelect}
                value={clinicForm.status}
                onChange={(e) =>
                  setClinicForm((c) => ({ ...c, status: e.target.value }))
                }
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClinicDialog(null)}
              >
                Cancelar
              </Button>
              <Button disabled={busy} type="submit">
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <p className="text-xs text-slate-500">
        YKIRE ERP · Controle exclusivamente administrativo. Documentos médicos
        devem ser emitidos pelo médico examinador; diagnósticos e resultados de
        exames não integram este módulo.
      </p>
    </div>
  );
}
