import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  Plus,
  ClipboardList,
  Loader2,
  Users,
  GraduationCap,
  FilterX,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { downloadCertificate } from '@/lib/certificatePdf';
import {
  exportTrainingXlsx,
  exportTrainingPdf,
} from '@/lib/certificateReportExport';
import { toast } from 'sonner';
const initial = {
  template_code: '',
  employee_id: '',
  training_company_id: '',
  training_date: '',
  location: '',
  hours: '',
  instructor_name: '',
  instructor_title: '',
  instructor_registration: '',
  verification_note: '',
  confirmed_completion: false,
};
const localDate = (s) =>
  s
    ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
    : '—';
const field =
  'w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white';
export default function Certificados() {
  const { user } = useAuth();
  const canIssue = ['master', 'admin'].includes(user?.role);
  const [templates, setTemplates] = useState([]),
    [companies, setCompanies] = useState([]),
    [units, setUnits] = useState([]),
    [form, setForm] = useState(initial),
    [show, setShow] = useState(false);
  const [query, setQuery] = useState(''),
    [results, setResults] = useState([]),
    [selected, setSelected] = useState(null),
    [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false),
    [downloading, setDownloading] = useState('');
  const [mode, setMode] = useState('training'),
    [templateFilter, setTemplateFilter] = useState(''),
    [employeeFilter, setEmployeeFilter] = useState(''),
    [unitFilter, setUnitFilter] = useState('');
  const [report, setReport] = useState(null),
    [reportBusy, setReportBusy] = useState(false),
    [exportBusy, setExportBusy] = useState('');
  const reload = async () => {
    try {
      const [tpl, list, companyList] = await Promise.all([
        api('certificates/templates', { warehouse: false }),
        api('org/units', { warehouse: false }),
        api('certificates/companies', { warehouse: false }),
      ]);
      setTemplates(tpl);
      setUnits(list);
      setCompanies(companyList);
    } catch (err) {
      toast.error(err.message);
    }
  };
  useEffect(() => {
    reload();
  }, []);
  const set = (key, val) => setForm((current) => ({ ...current, [key]: val }));
  const findEmployees = async () => {
    if (query.trim().length < 2) {
      toast.error('Digite ao menos 2 letras ou números.');
      return;
    }
    setSearching(true);
    try {
      const found = await api('certificates/employees', {
        warehouse: false,
        params: { q: query.trim() },
      });
      setResults(found);
      if (!found.length)
        toast.message('Nenhum colaborador encontrado nesta unidade.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };
  const open = () => {
    setForm(initial);
    setQuery('');
    setResults([]);
    setSelected(null);
    setShow(true);
  };
  const choose = (r) => {
    setSelected(r);
    set('employee_id', r.id);
    setResults([]);
    setQuery(`${r.registration} — ${r.full_name}`);
  };
  const chooseTemplate = (k) => {
    const t = templates.find((t) => t.code === k);
    setForm((f) => ({ ...f, template_code: k, hours: t?.default_hours || '' }));
  };
  const download = async (id) => {
    setDownloading(String(id));
    try {
      const detail = await api('certificates/detail', {
        warehouse: false,
        params: { id },
      });
      await downloadCertificate(detail);
      toast.success(
        'PDF individual gerado. Confira os dados e as assinaturas necessárias.',
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDownloading('');
    }
  };
  const save = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Selecione um colaborador da pesquisa.');
      return;
    }
    if (!selected.cpf_registered) {
      toast.error('Cadastre o CPF deste colaborador no RH antes de emitir.');
      return;
    }
    if (
      !companies.some((c) => String(c.id) === String(form.training_company_id))
    ) {
      toast.error('Selecione uma empresa ministrante cadastrada e ativa.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('certificates', {
        method: 'POST',
        warehouse: false,
        data: form,
      });
      toast.success('Certificado registrado com sucesso.');
      setShow(false);
      setReport(null);
      await reload();
      await download(result.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changeMode = (next) => {
    setMode(next);
    setReport(null);
  };
  const consult = async () => {
    if (mode === 'training' && !templateFilter) {
      toast.error('Selecione um treinamento.');
      return;
    }
    if (mode === 'employee' && employeeFilter.trim().length < 2) {
      toast.error('Digite pelo menos 2 caracteres do nome ou matrícula.');
      return;
    }
    setReport(null);
    setReportBusy(true);
    try {
      const params = {
        mode,
        ...(mode === 'training'
          ? { template_code: templateFilter }
          : { q: employeeFilter.trim() }),
        ...(unitFilter ? { unit_id: unitFilter } : {}),
      };
      const found = await api('certificates/report', {
        warehouse: false,
        params,
      });
      const description =
        mode === 'training'
          ? templates.find((t) => t.code === templateFilter)?.title ||
            templateFilter
          : employeeFilter.trim();
      const unitLabel =
        units.find((u) => String(u.id) === String(unitFilter))?.name ||
        'Todas as unidades permitidas';
      setReport({ rows: found, mode, description, unitLabel });
      if (!found.length)
        toast.message('Nenhuma capacitação encontrada com esses filtros.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReportBusy(false);
    }
  };
  const changeFilter = (callback, value) => {
    callback(value);
    setReport(null);
  };
  const exportFile = async (type) => {
    if (!report?.rows?.length) return;
    setExportBusy(type);
    try {
      if (type === 'excel') exportTrainingXlsx(report.rows, report.mode);
      else await exportTrainingPdf(report.rows, report);
      toast.success(
        type === 'excel' ? 'Planilha Excel gerada.' : 'Relatório PDF gerado.',
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExportBusy('');
    }
  };
  const rows = report?.rows || [];
  const employeeCount = new Set(rows.map((r) => String(r.employee_id))).size;
  const trainingCount = new Set(rows.map((r) => r.template_code)).size;
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <PageHeader
          title="Consultas de Treinamentos"
          subtitle="Veja quem concluiu cada treinamento ou quais capacitações cada funcionário possui."
          icon={Award}
        />
        {canIssue && (
          <Button onClick={open} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-1" /> Nova emissão
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">
            Modelos de treinamento ativos
          </p>
          <p className="text-2xl font-black">{templates.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">
            {report
              ? 'Colaboradores na consulta'
              : 'Pesquisa por treinamento ou matrícula'}
          </p>
          <p className="text-2xl font-black">{report ? employeeCount : '—'}</p>
        </div>
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700" />
          <p className="text-xs text-amber-900">
            Emitir somente após comprovar a conclusão real. O PDF individual do
            certificado exige validação das assinaturas necessárias.
          </p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Search className="w-5 h-5 text-amber-700" /> Consultar capacitações
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Tipo de consulta"
        >
          <button
            type="button"
            onClick={() => changeMode('training')}
            aria-pressed={mode === 'training'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border ${mode === 'training' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <GraduationCap className="w-4 h-4" /> Por treinamento
          </button>
          <button
            type="button"
            onClick={() => changeMode('employee')}
            aria-pressed={mode === 'employee'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border ${mode === 'employee' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4" /> Por funcionário
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1">
            <Label className="block mb-1.5 text-sm">
              {mode === 'training' ? 'Treinamento *' : 'Nome ou matrícula *'}
            </Label>
            {mode === 'training' ? (
              <select
                className={field}
                value={templateFilter}
                onChange={(e) =>
                  changeFilter(setTemplateFilter, e.target.value)
                }
              >
                <option value="">Selecione um treinamento...</option>
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.title}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Digite nome ou matrícula"
                value={employeeFilter}
                onChange={(e) =>
                  changeFilter(setEmployeeFilter, e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') consult();
                }}
              />
            )}
          </div>
          <div>
            <Label className="block mb-1.5 text-sm">Unidade / obra</Label>
            <select
              className={field}
              value={unitFilter}
              onChange={(e) => changeFilter(setUnitFilter, e.target.value)}
            >
              <option value="">Todas as unidades permitidas</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={reportBusy}
              onClick={consult}
              className="bg-amber-600 hover:bg-amber-700 flex-1"
            >
              {reportBusy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Search className="w-4 h-4 mr-1" />
              )}{' '}
              Consultar
            </Button>
            <Button
              title="Limpar consulta"
              variant="outline"
              onClick={() => {
                setEmployeeFilter('');
                setTemplateFilter('');
                setUnitFilter('');
                setReport(null);
              }}
            >
              <FilterX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      {report ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 flex flex-wrap gap-3 items-center justify-between border-b border-slate-100">
            <div>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-700" />
                {report.mode === 'training'
                  ? 'Funcionários com o treinamento'
                  : 'Treinamentos dos funcionários'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {report.description} · {report.unitLabel} · {employeeCount}{' '}
                colaborador(es), {trainingCount} treinamento(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!rows.length || !!exportBusy}
                onClick={() => exportFile('excel')}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {exportBusy === 'excel' ? 'Preparando...' : 'Exportar Excel'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!rows.length || !!exportBusy}
                onClick={() => exportFile('pdf')}
              >
                <FileDown className="w-4 h-4 mr-1" />
                {exportBusy === 'pdf' ? 'Preparando...' : 'Exportar PDF'}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {[
                    'Matrícula',
                    'Colaborador',
                    'Treinamento',
                    'Conclusão',
                    'Unidade',
                    'Local',
                    'Certificado',
                  ].map((col) => (
                    <th key={col} className="p-3 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.employee_id}-${row.template_code}`}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="p-3 font-semibold">
                      {row.registration_snapshot}
                    </td>
                    <td className="p-3">{row.full_name_snapshot}</td>
                    <td className="p-3">{row.template_title}</td>
                    <td className="p-3 whitespace-nowrap">
                      {localDate(row.training_date)}
                    </td>
                    <td className="p-3">{row.unit_name}</td>
                    <td className="p-3">{row.location}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!downloading}
                        onClick={() => download(row.id)}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        {downloading === String(row.id)
                          ? 'Gerando...'
                          : 'PDF individual'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-500">
                      Nenhum funcionário ou treinamento encontrado. Altere os
                      filtros e consulte novamente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Uma linha por colaborador e treinamento, considerando a última
            emissão válida. Excel e relatório PDF contêm apenas os dados da
            consulta; o certificado original é baixado individualmente.
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">
            Nenhum relatório aberto
          </p>
          <p className="text-sm mt-1">
            Escolha um treinamento ou pesquise um funcionário e clique em
            Consultar.
          </p>
        </div>
      )}
      {show && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-3">
          <form
            onSubmit={save}
            className="w-full max-w-2xl max-h-[94vh] overflow-y-auto p-5 sm:p-7 rounded-2xl bg-white shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-amber-700 tracking-widest">
                  SSMA / Treinamentos
                </p>
                <h3 className="text-xl font-bold mt-1">Emitir certificado</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Utiliza o CPF validado e os modelos cadastrados.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800 text-lg px-3"
                onClick={() => setShow(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div>
              <Label className="text-sm mb-1 block">
                Colaborador — pesquise por nome ou matrícula *
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome ou matrícula (mín. 2 caracteres)"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                    set('employee_id', '');
                    setResults([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      findEmployees();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={findEmployees}
                  disabled={searching}
                >
                  <Search className="w-4 h-4 mr-1" /> Buscar
                </Button>
              </div>
              {!!results.length && (
                <div className="border border-slate-200 mt-2 rounded-lg divide-y max-h-40 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className="w-full text-left p-2 hover:bg-slate-50 text-sm"
                      onClick={() => choose(r)}
                    >
                      <b>{r.registration}</b> — {r.full_name}{' '}
                      <span className="text-slate-500">({r.unit_name})</span>
                    </button>
                  ))}
                </div>
              )}
              {selected && (
                <div className="bg-slate-50 mt-2 rounded-lg p-3 text-sm">
                  <p className="font-semibold">
                    {selected.full_name} · {selected.registration}
                  </p>
                  <p className="text-slate-600">
                    {selected.job_title} — {selected.department} ·{' '}
                    {selected.unit_name}
                  </p>
                  <p
                    className={
                      selected.cpf_registered
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }
                  >
                    {selected.cpf_registered
                      ? `CPF cadastrado: ${selected.cpf_masked}`
                      : 'CPF ausente no RH; regularize o cadastro antes de emitir.'}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm">
                  Empresa que ministrou o treinamento *
                </Label>
                <Link
                  to="/ssma/empresas-ministrantes"
                  className="text-xs font-semibold text-amber-700 hover:underline"
                  onClick={() => setShow(false)}
                >
                  Cadastrar empresa no SSMA
                </Link>
              </div>
              <select
                className={field}
                required
                value={form.training_company_id}
                onChange={(e) => set('training_company_id', e.target.value)}
              >
                <option value="">Selecione a empresa ministrante...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                    {c.trade_name ? ` — ${c.trade_name}` : ''}
                  </option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="text-xs text-amber-700">
                  Nenhuma empresa ativa cadastrada. Cadastre uma para emitir
                  certificados.
                </p>
              )}
              {form.training_company_id && (
                <p className="text-xs text-slate-500">
                  Esta razão social será inserida no texto do certificado e
                  preservada no histórico da emissão.
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm mb-1 block">
                Modelo do certificado *
              </Label>
              <select
                className={field}
                required
                value={form.template_code}
                onChange={(e) => chooseTemplate(e.target.value)}
              >
                <option value="">Escolha um modelo</option>
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            {form.template_code && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 flex gap-3 items-center">
                <img
                  alt="Prévia do modelo"
                  className="w-28 rounded border bg-white"
                  src={`${import.meta.env.BASE_URL}certificate-templates/${form.template_code}_1.jpg`}
                />
                <div className="text-xs text-amber-900">
                  Modelo de duas páginas. Os dados e assinaturas de exemplos
                  anteriores foram retirados da base.
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs block mb-1">Conclusão *</Label>
                <Input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.training_date}
                  onChange={(e) => set('training_date', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs block mb-1">
                  Local (cidade/UF) *
                </Label>
                <Input
                  required
                  maxLength={120}
                  placeholder="Paracatu/MG"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs block mb-1">Carga horária *</Label>
                <Input
                  required
                  type="number"
                  min={1}
                  max={500}
                  value={form.hours}
                  onChange={(e) => set('hours', e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs block mb-1">
                  Instrutor responsável *
                </Label>
                <Input
                  required
                  maxLength={150}
                  value={form.instructor_name}
                  onChange={(e) => set('instructor_name', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs block mb-1">
                  Cargo / qualificação do instrutor
                </Label>
                <Input
                  maxLength={150}
                  value={form.instructor_title}
                  onChange={(e) => set('instructor_title', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs block mb-1">
                Registro profissional do instrutor (quando aplicável)
              </Label>
              <Input
                maxLength={90}
                value={form.instructor_registration}
                onChange={(e) => set('instructor_registration', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs block mb-1">
                Comprovação interna de conclusão *
              </Label>
              <textarea
                required
                minLength={8}
                rows={2}
                className="w-full p-3 border rounded-lg text-sm"
                placeholder="Ex.: Lista de presença e avaliação conferidas pelo responsável de SSMA"
                value={form.verification_note}
                onChange={(e) => set('verification_note', e.target.value)}
              />
            </div>
            <label className="flex gap-3 items-start bg-amber-50 border border-amber-200 p-3 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.confirmed_completion}
                onChange={(e) => set('confirmed_completion', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-amber-950">
                Confirmo que este colaborador realizou e concluiu o treinamento
                informado e que os dados foram conferidos. A emissão será
                vinculada ao meu usuário.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShow(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  !selected?.cpf_registered ||
                  !form.training_company_id ||
                  busy ||
                  !form.confirmed_completion
                }
                type="submit"
                className="bg-amber-600 hover:bg-amber-700"
              >
                {busy ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-1" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}{' '}
                Registrar e gerar PDF
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
