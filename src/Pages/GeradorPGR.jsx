import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  FileDown,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Copy,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  newPgrContent,
  pgrTables,
  exportPgrPdf,
  exportPgrDocx,
} from '@/lib/pgrDocument';

const selectCls =
  'w-full h-10 border border-slate-200 rounded-lg bg-white px-3 text-sm';
const textCls =
  'w-full border border-slate-200 rounded-lg bg-white px-3 py-2 text-sm';
const newDoc = () => ({
  id: '',
  revision: 0,
  title: 'PGR — Programa de Gerenciamento de Riscos',
  hr_company_id: '',
  unit_id: '',
  contract_number: '',
  start_on: '',
  end_on: '',
  status: 'draft',
  content: newPgrContent(),
});
const sections = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'funcoes', label: 'Funções e GHE' },
  { id: 'riscos', label: 'Inventário de riscos' },
  { id: 'acoes', label: 'Plano de ação' },
  { id: 'revisao', label: 'Revisão e exportação' },
];
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
function Textbox({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <Field label={label}>
      <textarea
        className={textCls}
        rows={rows}
        placeholder={
          placeholder || 'Preencher conforme levantamento e revisão técnica'
        }
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
function TableEditor({ title, columns, rows, setRows, roles }) {
  const add = () =>
    setRows([
      ...(rows || []),
      Object.fromEntries(columns.map((c) => [c[0], ''])),
    ]);
  const update = (i, key, v) =>
    setRows(rows.map((r, j) => (i === j ? { ...r, [key]: v } : r)));
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b gap-3">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">
            {(rows || []).length} registro(s). Os dados exigem avaliação do
            responsável técnico.
          </p>
        </div>
        <Button type="button" onClick={add} variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
      <div className="p-4 space-y-4">
        {(rows || []).map((r, i) => (
          <div key={i} className="rounded-xl border bg-slate-50 p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-slate-600">
                Registro {i + 1}
              </span>
              <button
                title="Remover"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                type="button"
                className="text-rose-600 hover:text-rose-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {columns.map(([key, label]) => (
                <Field key={key} label={label}>
                  {key === 'role' && roles?.length ? (
                    <select
                      className={selectCls}
                      value={r[key] || ''}
                      onChange={(e) => update(i, key, e.target.value)}
                    >
                      <option value="">
                        Selecione a função cadastrada no RH
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                      {r[key] && !roles.some((x) => x.name === r[key]) && (
                        <option value={r[key]}>
                          {r[key]} (registro anterior)
                        </option>
                      )}
                    </select>
                  ) : [
                      'activity',
                      'description',
                      'assessment',
                      'controls',
                      'recommendation',
                      'action',
                      'hazard',
                      'source',
                      'damage',
                      'evidence',
                    ].includes(key) ? (
                    <textarea
                      className={textCls}
                      rows={2}
                      value={r[key] || ''}
                      onChange={(e) => update(i, key, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={r[key] || ''}
                      onChange={(e) => update(i, key, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}
        {!(rows || []).length && (
          <div className="text-center p-8 text-sm text-slate-500">
            Nenhum registro. Clique em Adicionar para preencher esta etapa.
          </div>
        )}
      </div>
    </div>
  );
}
export default function GeradorPGR() {
  const [list, setList] = useState([]),
    [options, setOptions] = useState({ companies: [], units: [], roles: [] });
  const [doc, setDoc] = useState(newDoc),
    [tab, setTab] = useState('identificacao'),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(''),
    [review, setReview] = useState(false);
  const c = doc.content || {};
  const choose = (key, val) => setDoc((d) => ({ ...d, [key]: val }));
  const set = (key, val) =>
    setDoc((d) => ({ ...d, content: { ...d.content, [key]: val } }));
  const ready = Boolean(doc.hr_company_id && doc.unit_id && doc.title.trim());
  const selectedCompany = options.companies.find(
    (o) => String(o.id) === String(doc.hr_company_id),
  );
  const selectedUnit = options.units.find(
    (o) => String(o.id) === String(doc.unit_id),
  );
  const hydrated = useMemo(
    () => ({
      ...doc,
      company_name: selectedCompany?.legal_name || '',
      company_cnpj: selectedCompany?.cnpj || '',
      unit_name: selectedUnit?.name || '',
    }),
    [doc, selectedCompany, selectedUnit],
  );
  const load = async () => {
    try {
      const [op, res] = await Promise.all([
        api('pgr/options', { warehouse: false }),
        api('pgr/list', { warehouse: false }),
      ]);
      setOptions(op);
      setList(res);
    } catch (e) {
      toast.error(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = async (id) => {
    setBusy(true);
    try {
      const d = await api('pgr/document', { warehouse: false, params: { id } });
      setDoc({
        ...newDoc(),
        ...d,
        hr_company_id: String(d.hr_company_id),
        unit_id: String(d.unit_id),
        content: { ...newPgrContent(), ...d.content },
      });
      setTab('identificacao');
      setReview(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const fresh = () => {
    setDoc(newDoc());
    setTab('identificacao');
    setReview(false);
  };
  const duplicate = () => {
    setDoc((d) => ({
      ...d,
      id: '',
      revision: 0,
      status: 'draft',
      title: d.title + ' — Nova versão',
      content: { ...d.content, review_kind: 'Revisão' },
    }));
    setTab('identificacao');
    setReview(false);
    toast.message('Cópia criada localmente. Salve como novo PGR.');
  };
  const save = async (status) => {
    if (!ready) {
      toast.error('Selecione empresa, obra e informe um título.');
      setTab('identificacao');
      return;
    }
    if (status === 'validated' && !review) {
      toast.error('Confirme a revisão técnica responsável.');
      setTab('revisao');
      return;
    }
    setBusy(true);
    try {
      const res = await api('pgr/document', {
        warehouse: false,
        method: doc.id ? 'PUT' : 'POST',
        data: {
          ...doc,
          content: c,
          status,
          technical_review_confirmed: status === 'validated' && review,
        },
      });
      setDoc((d) => ({
        ...d,
        id: res.id,
        revision: res.revision,
        status: res.status,
      }));
      toast.success(
        status === 'draft'
          ? 'Rascunho salvo.'
          : status === 'review'
            ? 'Enviado para revisão.'
            : 'Revisão técnica registrada. Ainda requer assinatura formal.',
      );
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (kind) => {
    if (!ready) {
      toast.error('Preencha título, empresa e obra antes da exportação.');
      setTab('identificacao');
      return;
    }
    setExporting(kind);
    try {
      if (kind === 'pdf') await exportPgrPdf(hydrated);
      else await exportPgrDocx(hydrated);
      toast.success('Arquivo gerado como minuta para conferência técnica.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting('');
    }
  };
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <PageHeader
          title="Gerador de PGR"
          subtitle="Modelo Proseg · Preenchimento dinâmico · Word e PDF"
          icon={ClipboardList}
        />
        <Button onClick={fresh}>
          <Plus className="h-4 w-4 mr-1" />
          Novo PGR
        </Button>
      </div>
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
        <p>
          <strong>Documento técnico.</strong> O YKIRE monta uma minuta com a
          identidade visual e a organização do PGR da Proseg enviado. Não cria
          medições, inventário ou conclusões automaticamente. Os resultados,
          critérios e assinatura devem ser conferidos pelo profissional
          habilitado. Um documento gerado não equivale a um PGR assinado.
        </p>
      </div>
      <div className="grid lg:grid-cols-[250px_1fr] gap-5 items-start">
        <aside className="bg-white border rounded-xl overflow-hidden lg:sticky lg:top-24">
          <div className="p-4 border-b">
            <h3 className="text-sm font-bold">Documentos salvos</h3>
            <p className="text-xs text-slate-500">
              Até 300 documentos recentes
            </p>
          </div>
          <div className="max-h-[380px] overflow-auto">
            {list.map((item) => (
              <button
                key={item.id}
                onClick={() => open(item.id)}
                type="button"
                className={`w-full p-3 border-b text-left hover:bg-indigo-50 ${String(doc.id) === String(item.id) ? 'bg-indigo-50' : ''}`}
              >
                <p className="font-semibold text-sm text-slate-800 truncate">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {item.company_name}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rev. {item.revision} ·{' '}
                  {item.status === 'validated'
                    ? 'Revisado'
                    : item.status === 'review'
                      ? 'Em revisão'
                      : 'Rascunho'}
                </p>
              </button>
            ))}
            {!list.length && (
              <p className="text-sm text-slate-500 p-4">
                Nenhum PGR salvo ainda.
              </p>
            )}
          </div>
        </aside>
        <div className="space-y-5 min-w-0">
          <div className="bg-white border rounded-xl p-3">
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setTab(s.id)}
                  className={`px-3 py-2 text-sm rounded-lg ${tab === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {tab === 'identificacao' && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-bold">
                1. Identificação, contrato e responsável
              </h3>
              <Field label="Título do documento *">
                <Input
                  maxLength={180}
                  value={doc.title}
                  onChange={(e) => choose('title', e.target.value)}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Empresa empregadora / CNPJ *">
                  <select
                    className={selectCls}
                    value={doc.hr_company_id}
                    onChange={(e) => choose('hr_company_id', e.target.value)}
                  >
                    <option value="">Selecione uma empresa do RH</option>
                    {options.companies.map((co) => (
                      <option value={co.id} key={co.id}>
                        {co.legal_name} — {co.cnpj}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Obra / estabelecimento *">
                  <select
                    className={selectCls}
                    value={doc.unit_id}
                    onChange={(e) => choose('unit_id', e.target.value)}
                  >
                    <option value="">Selecione a unidade</option>
                    {options.units.map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Contratante">
                  <Input
                    value={c.client || ''}
                    onChange={(e) => set('client', e.target.value)}
                  />
                </Field>
                <Field label="Contratada">
                  <Input
                    value={c.contractor || ''}
                    onChange={(e) => set('contractor', e.target.value)}
                  />
                </Field>
                <Field label="Subcontratada (se houver)">
                  <Input
                    value={c.subcontractor || ''}
                    onChange={(e) => set('subcontractor', e.target.value)}
                  />
                </Field>
                <Field label="Nº do contrato">
                  <Input
                    value={doc.contract_number}
                    onChange={(e) => choose('contract_number', e.target.value)}
                  />
                </Field>
                <Field label="Início da vigência">
                  <Input
                    type="date"
                    value={doc.start_on || ''}
                    onChange={(e) => choose('start_on', e.target.value)}
                  />
                </Field>
                <Field label="Fim da vigência">
                  <Input
                    type="date"
                    value={doc.end_on || ''}
                    onChange={(e) => choose('end_on', e.target.value)}
                  />
                </Field>
                <Field label="Tipo de documento">
                  <select
                    className={selectCls}
                    value={c.review_kind || 'Elaboração'}
                    onChange={(e) => set('review_kind', e.target.value)}
                  >
                    {['Elaboração', 'Renovação', 'Revisão', 'Atualização'].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Local das atividades">
                  <Input
                    value={c.work_location || ''}
                    onChange={(e) => set('work_location', e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Responsável técnico">
                  <Input
                    value={c.technician_name || ''}
                    onChange={(e) => set('technician_name', e.target.value)}
                  />
                </Field>
                <Field label="Qualificação">
                  <Input
                    value={c.technician_title || ''}
                    onChange={(e) => set('technician_title', e.target.value)}
                    placeholder="Engenheiro(a) de segurança"
                  />
                </Field>
                <Field label="Registro profissional">
                  <Input
                    value={c.technician_registration || ''}
                    onChange={(e) =>
                      set('technician_registration', e.target.value)
                    }
                    placeholder="CREA/UF, etc."
                  />
                </Field>
              </div>
              <Textbox
                label="Introdução / caracterização das atividades"
                value={c.activities_summary}
                onChange={(v) => set('activities_summary', v)}
              />
              <Textbox
                label="Objetivos e campo de aplicação"
                value={c.goals}
                onChange={(v) => set('goals', v)}
              />
            </div>
          )}
          {tab === 'funcoes' && (
            <div className="space-y-5">
              <TableEditor
                title="1.2 — Descrição das atividades por função"
                columns={pgrTables.roles.columns}
                rows={c.roles || []}
                setRows={(v) => set('roles', v)}
                roles={options.roles}
              />
              <TableEditor
                title="1.3 — GHE / GES"
                columns={pgrTables.groups.columns}
                rows={c.groups || []}
                setRows={(v) => set('groups', v)}
              />
            </div>
          )}
          {tab === 'riscos' && (
            <div className="space-y-5">
              <div className="bg-white p-4 border rounded-xl">
                <Textbox
                  label="6 — Metodologia e conceitos adotados"
                  rows={3}
                  value={c.methodology}
                  onChange={(v) => set('methodology', v)}
                  placeholder="Informe metodologia aprovada pelo responsável técnico"
                />
                <Textbox
                  label="7 — Avaliação dos riscos e critérios de classificação"
                  rows={4}
                  value={c.evaluation_criteria}
                  onChange={(v) => set('evaluation_criteria', v)}
                  placeholder="Indique probabilidade, severidade, nível e evidências de exposição levantadas"
                />
              </div>
              <TableEditor
                title="7 / 11 / 16 — Inventário de riscos ocupacionais"
                columns={pgrTables.risks.columns}
                rows={c.risks || []}
                setRows={(v) => set('risks', v)}
              />
            </div>
          )}
          {tab === 'acoes' && (
            <div className="space-y-5">
              <TableEditor
                title="8 / 17 — Plano de ação e cronograma"
                columns={pgrTables.actions.columns}
                rows={c.actions || []}
                setRows={(v) => set('actions', v)}
              />
              <div className="bg-white border rounded-xl p-5 space-y-4">
                <Textbox
                  label="9 — Medidas de prevenção"
                  value={c.preventive_policy}
                  onChange={(v) => set('preventive_policy', v)}
                />
                <Textbox
                  label="10 — Preparação para emergências"
                  value={c.emergency_plan}
                  onChange={(v) => set('emergency_plan', v)}
                />
                <Textbox
                  label="14 — Avaliação de eficácia"
                  value={c.effectiveness}
                  onChange={(v) => set('effectiveness', v)}
                />
                <Textbox
                  label="15 — Registro, manutenção e divulgação"
                  value={c.dissemination}
                  onChange={(v) => set('dissemination', v)}
                />
                <Textbox
                  label="18 — Fundamentos legais utilizados"
                  value={c.legal_basis}
                  onChange={(v) => set('legal_basis', v)}
                />
                <Textbox
                  label="19 — Recomendações gerais e conclusão técnica"
                  rows={5}
                  value={c.technical_conclusion}
                  onChange={(v) => set('technical_conclusion', v)}
                />
              </div>
            </div>
          )}
          {tab === 'revisao' && (
            <div className="bg-white border rounded-xl p-5 space-y-5">
              <h3 className="font-bold text-slate-900">
                Revisão, versões e exportação
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  ['Funções cadastradas', (c.roles || []).length],
                  ['GHE cadastrados', (c.groups || []).length],
                  ['Riscos avaliados', (c.risks || []).length],
                  ['Ações', (c.actions || []).length],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 border rounded-xl p-3">
                    <div className="text-2xl font-bold">{v}</div>
                    <p className="text-xs text-slate-500">{k}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-amber-50 text-amber-900 p-4 text-sm border border-amber-200">
                <strong>PDF e Word editável:</strong> os documentos incluem as
                seções preenchidas. Campos em branco aparecem como pendentes,
                não como conteúdo técnico fabricado. O layout é inspirado no PGR
                da Proseg e não reproduz automaticamente todas as 119 páginas do
                documento original.
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={review}
                  onChange={(e) => setReview(e.target.checked)}
                />
                <span>
                  Confirmo que o conteúdo, a metodologia, o inventário e as
                  ações foram revisados por profissional competente e que sua
                  assinatura formal ainda será necessária.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => download('word')}
                  disabled={!!exporting}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Word (.docx)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => download('pdf')}
                  disabled={!!exporting}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                {doc.id && (
                  <Button variant="outline" onClick={duplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar para nova revisão
                  </Button>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Status atual:{' '}
                {doc.status === 'draft'
                  ? 'Rascunho'
                  : doc.status === 'review'
                    ? 'Em revisão'
                    : 'Revisão registrada'}{' '}
                · Revisão {doc.revision || 'ainda não salva'}
              </div>
            </div>
          )}
          <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => save('draft')}
              disabled={busy || doc.status === 'validated'}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar rascunho
            </Button>
            <Button
              onClick={() => save('review')}
              variant="outline"
              disabled={busy || doc.status === 'validated'}
            >
              <Eye className="w-4 h-4 mr-2" />
              Enviar para revisão
            </Button>
            <Button
              onClick={() => save('validated')}
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={busy || doc.status === 'validated' || !review}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Registrar revisão técnica
            </Button>
            {doc.status === 'validated' && (
              <span className="text-xs text-emerald-700 font-semibold">
                Revisado: para corrigir, duplique e crie uma nova versão.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
