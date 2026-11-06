import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Download,
  FileText,
  HardHat,
  Layers,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Warehouse,
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

/** Estúdio de PGR baseado no fluxo observado no vídeo do sistema SST.
 * O conteúdo é armazenado no JSON do PGR 014, compatível com a migração 009.
 * Resultados de exposição, classificação técnica, medidas e conclusão NÃO são inferidos.
 */
const menu = [
  { id: 'empresa', label: 'Empresa e contrato', icon: Briefcase },
  { id: 'ambientes', label: 'Ambientes e setores', icon: Warehouse },
  { id: 'funcoes', label: 'Cargos e GHE', icon: Layers },
  { id: 'riscos', label: 'Inventário de riscos', icon: AlertTriangle },
  { id: 'controles', label: 'Medidas de controle', icon: ShieldCheck },
  { id: 'medicoes', label: 'Avaliações ambientais', icon: Activity },
  { id: 'equipamentos', label: 'Equipamentos e anexos', icon: HardHat },
  { id: 'acoes', label: 'Plano de ação', icon: ClipboardCheck },
  { id: 'emitir', label: 'Revisão e emissão', icon: FileText },
];
const classInput =
  'w-full rounded-lg border border-slate-200 bg-white min-h-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const riskTypes = [
  'Físico',
  'Químico',
  'Biológico',
  'Ergonômico',
  'Acidente',
  'Psicossocial',
  'Outro',
];
const agentTypes = [
  'Ruído',
  'Iluminação',
  'Calor',
  'Vibração',
  'Umidade',
  'Poeira',
  'Agente químico',
  'Outro',
];
const probability = ['1', '2', '3', '4', '5'];
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
const schema = {
  areas: [
    ['name', 'Ambiente / posto'],
    ['floor', 'Piso / área'],
    ['ceiling', 'Cobertura / estrutura'],
    ['conditions', 'Descrição e condições', 'textarea'],
  ],
  sectors: [
    ['name', 'Nome do setor'],
    ['description', 'Atividades exercidas', 'textarea'],
  ],
  roles: [
    ['role', 'Função', 'role'],
    ['cbo', 'CBO'],
    ['ghe', 'Grupo de exposição (GHE)'],
    ['sector', 'Setor'],
    ['employees', 'Nº funcionários', 'number'],
    ['activity', 'Descrição das atividades', 'textarea'],
  ],
  groups: [
    ['code', 'Código (ex.: GHE 01)'],
    ['name', 'Nome do GHE'],
    ['functions', 'Funções abrangidas', 'textarea'],
    ['description', 'Caracterização da exposição', 'textarea'],
  ],
  risks: [
    ['ghe', 'GHE'],
    ['category', 'Classificação do agente', 'risk'],
    ['hazard', 'Perigo / agente'],
    ['source', 'Fonte geradora / circunstância', 'textarea'],
    ['affected', 'Trabalhadores expostos'],
    ['damage', 'Possíveis consequências', 'textarea'],
    ['exposure', 'Frequência / tipo de exposição'],
    ['probability', 'Probabilidade', 'probability'],
    ['severity', 'Severidade', 'probability'],
    ['assessment', 'Avaliação quantitativa ou qualitativa', 'textarea'],
    ['level', 'Nível / classificação técnica'],
    ['controls', 'Controles existentes', 'textarea'],
    ['recommendation', 'Medidas recomendadas', 'textarea'],
  ],
  control_measures: [
    ['measure', 'Medida administrativa'],
    ['existing', 'Existe?', 'yesno'],
    ['proposed', 'A implantar / manter'],
    ['evidence', 'Procedimento / comprovação'],
  ],
  epis: [
    ['ghe', 'GHE'],
    ['name', 'EPI'],
    ['ca', 'CA (se aplicável)'],
    ['effectiveness', 'Eficácia avaliada'],
    ['frequency', 'Periodicidade'],
    ['evidence', 'Registro / ficha de EPI'],
  ],
  epcs: [
    ['name', 'Medida de proteção coletiva'],
    ['existing', 'Existe?', 'yesno'],
    ['proposed', 'A implantar / manter'],
    ['evidence', 'Comprovação'],
  ],
  measurements: [
    ['sector', 'Setor'],
    ['location', 'Local / posto'],
    ['agent', 'Agente / parâmetro', 'agent'],
    ['result', 'Resultado apurado'],
    ['unit', 'Unidade'],
    ['method', 'Metodologia / norma'],
    ['instrument', 'Instrumento'],
    ['date', 'Data', 'date'],
    ['notes', 'Condições de medição e observações', 'textarea'],
  ],
  equipment: [
    ['name', 'Equipamento'],
    ['manufacturer', 'Fabricante'],
    ['model', 'Modelo'],
    ['certificate', 'Certificado de calibração / validade'],
  ],
  appendices: [
    ['title', 'Nome / descrição do anexo'],
    ['reference', 'Referência documental'],
    ['notes', 'Onde está arquivado', 'textarea'],
  ],
  actions: [
    ['action', 'Ação preventiva / corretiva', 'textarea'],
    ['related_risk', 'Risco / GHE relacionado'],
    ['responsible', 'Responsável'],
    ['deadline', 'Prazo', 'date'],
    ['status', 'Situação', 'actionstatus'],
    ['evidence', 'Evidência e acompanhamento', 'textarea'],
  ],
};
function Field({ title, children, hint }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-700">{title}</span>
      {children}
      {hint && <span className="text-xs text-slate-500 block">{hint}</span>}
    </label>
  );
}
function BoxText({ title, value, onChange, rows = 3, hint }) {
  return (
    <Field title={title} hint={hint}>
      <textarea
        rows={rows}
        className={classInput}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
function SelectInput({ value, onChange, items, empty = 'Selecione' }) {
  return (
    <select
      className={classInput}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{empty}</option>
      {items.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
    </select>
  );
}
function EntryInput({ column, entry, change, roles }) {
  const [key, , type] = column;
  const value = entry[key] ?? '';
  if (type === 'risk')
    return (
      <SelectInput
        value={value}
        onChange={(v) => change(key, v)}
        items={riskTypes}
      />
    );
  if (type === 'agent')
    return (
      <SelectInput
        value={value}
        onChange={(v) => change(key, v)}
        items={agentTypes}
      />
    );
  if (type === 'probability')
    return (
      <SelectInput
        value={value}
        onChange={(v) => change(key, v)}
        items={probability}
        empty="A definir pelo TST"
      />
    );
  if (type === 'yesno')
    return (
      <SelectInput
        value={value}
        onChange={(v) => change(key, v)}
        items={['Sim', 'Não', 'Parcial', 'A verificar']}
      />
    );
  if (type === 'actionstatus')
    return (
      <SelectInput
        value={value}
        onChange={(v) => change(key, v)}
        items={['Planejada', 'Em andamento', 'Concluída', 'Suspensa']}
      />
    );
  if (type === 'role' && roles?.length)
    return (
      <>
        <SelectInput
          value={value}
          onChange={(v) => change(key, v)}
          items={[
            ...roles.map((x) => x.name),
            ...(value && !roles.some((x) => x.name === value) ? [value] : []),
          ]}
          empty="Selecionar função do RH"
        />
        <p className="mt-1 text-xs text-slate-500">
          Funções cadastradas em RH → Catálogos
        </p>
      </>
    );
  if (type === 'textarea')
    return (
      <textarea
        rows={2}
        value={value}
        onChange={(e) => change(key, e.target.value)}
        className={classInput}
      />
    );
  return (
    <Input
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      min={type === 'number' ? '0' : undefined}
      value={value}
      onChange={(e) => change(key, e.target.value)}
    />
  );
}
function Records({
  title,
  description,
  rows = [],
  onChange,
  fields,
  roles,
  empty = 'Nenhum registro cadastrado nesta etapa.',
}) {
  const add = () =>
    onChange([...rows, Object.fromEntries(fields.map(([key]) => [key, '']))]);
  const update = (index, k, v) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [k]: v } : row)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));
  return (
    <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
      <div className="p-4 space-y-3">
        {!rows.length && (
          <div className="py-7 text-sm text-slate-500 text-center bg-slate-50 rounded-lg">
            {empty}
          </div>
        )}
        {rows.map((row, index) => (
          <div className="border rounded-xl p-4 bg-slate-50/60" key={index}>
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-emerald-800 uppercase">
                Registro {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-rose-600 p-2 hover:bg-rose-50 rounded"
                title="Excluir registro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((col) => (
                <Field key={col[0]} title={col[1]}>
                  <EntryInput
                    column={col}
                    entry={row}
                    roles={roles}
                    change={(k, v) => update(index, k, v)}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function Section({ title, description, children }) {
  return (
    <section className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
export default function PgrStudio() {
  const [docs, setDocs] = useState([]),
    [options, setOptions] = useState({ companies: [], units: [], roles: [] });
  const [doc, setDoc] = useState(newDoc),
    [tab, setTab] = useState('empresa'),
    [busy, setBusy] = useState(false),
    [output, setOutput] = useState(''),
    [review, setReview] = useState(false);
  const c = doc.content || {};
  const choose = (k, v) => setDoc((old) => ({ ...old, [k]: v }));
  const set = (k, v) =>
    setDoc((old) => ({ ...old, content: { ...old.content, [k]: v } }));
  const required = !!(doc.hr_company_id && doc.unit_id && doc.title.trim());
  const company = options.companies.find(
    (x) => String(x.id) === String(doc.hr_company_id),
  );
  const unit = options.units.find((x) => String(x.id) === String(doc.unit_id));
  const hydrated = useMemo(
    () => ({
      ...doc,
      company_name: company?.legal_name || '',
      company_cnpj: company?.cnpj || '',
      unit_name: unit?.name || '',
    }),
    [doc, company, unit],
  );
  const count = (k) => (c[k] || []).length;
  async function load() {
    try {
      const [a, b] = await Promise.all([
        api('pgr/options', { warehouse: false }),
        api('pgr/list', { warehouse: false }),
      ]);
      setOptions(a);
      setDocs(b);
    } catch (err) {
      toast.error(
        err.message ||
          'Não foi possível carregar os PGRs. Confira a migração 009 e a API.',
      );
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function open(id) {
    setBusy(true);
    try {
      const d = await api('pgr/document', { warehouse: false, params: { id } });
      setDoc({
        ...newDoc(),
        ...d,
        id: String(d.id),
        hr_company_id: String(d.hr_company_id),
        unit_id: String(d.unit_id),
        content: { ...newPgrContent(), ...(d.content || {}) },
      });
      setTab('empresa');
      setReview(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  function fresh() {
    setDoc(newDoc());
    setTab('empresa');
    setReview(false);
  }
  function duplicate() {
    setDoc((d) => ({
      ...d,
      id: '',
      revision: 0,
      status: 'draft',
      title: d.title + ' — Revisão',
      content: { ...d.content, review_kind: 'Revisão' },
    }));
    setReview(false);
    setTab('empresa');
    toast.message('Nova revisão criada. Salve para registrar no banco.');
  }
  async function save(status = 'draft') {
    if (!required) {
      toast.error('Preencha empresa, obra e título do PGR.');
      setTab('empresa');
      return;
    }
    if (status === 'validated' && !review) {
      toast.error('O responsável técnico deve confirmar a revisão.');
      setTab('emitir');
      return;
    }
    setBusy(true);
    try {
      const r = await api('pgr/document', {
        warehouse: false,
        method: doc.id ? 'PUT' : 'POST',
        data: {
          ...doc,
          status,
          content: c,
          technical_review_confirmed: status === 'validated' && review,
        },
      });
      setDoc((old) => ({
        ...old,
        id: String(r.id),
        revision: r.revision,
        status: r.status,
      }));
      toast.success('PGR salvo no YKIRE ERP.');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportFile(kind) {
    if (!required) {
      toast.error('Informe a empresa, obra e título antes de exportar.');
      setTab('empresa');
      return;
    }
    setOutput(kind);
    try {
      if (kind === 'word') await exportPgrDocx(hydrated);
      else await exportPgrPdf(hydrated);
      toast.success('Minuta gerada para conferência do responsável técnico.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOutput('');
    }
  }
  function jump(dir) {
    const i = menu.findIndex((x) => x.id === tab);
    setTab(menu[Math.max(0, Math.min(menu.length - 1, i + dir))].id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const records = (id, title, description) => (
    <Records
      title={title}
      description={description}
      fields={schema[id]}
      rows={c[id] || []}
      onChange={(v) => set(id, v)}
      roles={options.roles}
    />
  );
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <PageHeader
          title="Estúdio de PGR"
          subtitle="YKIRE ERP · SSMA · Cadastros técnicos e geração documental"
          icon={ClipboardList}
        />
        <Button onClick={fresh}>
          <Plus className="h-4 w-4 mr-2" />
          Novo PGR
        </Button>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          <strong>Documento em elaboração técnica.</strong> O estúdio registra
          avaliações inseridas pelo TST/engenheiro e exporta uma minuta
          editável. Não calcula exposições nem fornece aprovação ou assinatura
          automática. O relatório dinâmico ainda não reproduz as 119 páginas do
          PGR Fagundes original; use a aba Homologação para comparar o modelo.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[255px_minmax(0,1fr)] items-start">
        <aside className="space-y-4 xl:sticky xl:top-20">
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 text-sm font-semibold border-b">
              Etapas do PGR
            </div>
            <nav className="p-2 space-y-1">
              {menu.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex gap-2.5 items-center text-left px-3 py-2.5 text-sm rounded-lg ${tab === item.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}
                  >
                    <span className="text-xs opacity-60 w-4">{i + 1}</span>
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm flex items-center justify-between">
              <span>PGRs cadastrados</span>
              <span className="text-xs font-normal text-slate-500">
                {docs.length}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {docs.length ? (
                docs.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => open(d.id)}
                    className={`w-full text-left p-3 border-b text-sm hover:bg-emerald-50 ${String(doc.id) === String(d.id) ? 'bg-emerald-50' : ''}`}
                  >
                    <span className="font-semibold line-clamp-2">
                      {d.title}
                    </span>
                    <span className="block text-xs text-slate-500 mt-1">
                      {d.company_name} · Rev. {d.revision}
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-xs text-slate-500">
                  Nenhum documento salvo.
                </p>
              )}
            </div>
          </div>
        </aside>
        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white rounded-xl border p-3">
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {menu.find((x) => x.id === tab)?.label}
              </p>
              <p className="text-xs text-slate-500">
                {doc.status === 'validated'
                  ? 'Revisão registrada'
                  : doc.status === 'review'
                    ? 'Em revisão'
                    : 'Rascunho'}{' '}
                · Revisão {doc.revision || 'não salva'} ·{' '}
                {doc.id ? 'ID ' + doc.id : 'Novo documento'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                disabled={busy || doc.status === 'validated'}
                onClick={() => save('draft')}
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
              <Button
                variant="outline"
                disabled={!!output}
                onClick={() => exportFile('word')}
              >
                <FileText className="w-4 h-4 mr-1" />
                Word
              </Button>
              <Button disabled={!!output} onClick={() => exportFile('pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
          {tab === 'empresa' && (
            <>
              <Section
                title="1. Identificação da empresa e contrato"
                description="Preenchimento administrativo com os catálogos cadastrados no RH e nas unidades do YKIRE."
              >
                <Field title="Título do PGR">
                  <Input
                    value={doc.title}
                    maxLength={180}
                    onChange={(e) => choose('title', e.target.value)}
                  />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field title="Empresa empregadora *">
                    <SelectInput
                      value={doc.hr_company_id}
                      onChange={(v) => choose('hr_company_id', v)}
                      empty="Selecionar empresa cadastrada"
                      items={options.companies.map((x) => ({
                        value: String(x.id),
                        label: `${x.legal_name} — ${x.cnpj || 'sem CNPJ'}`,
                      }))}
                    />
                  </Field>
                  <Field title="Obra / estabelecimento *">
                    <SelectInput
                      value={doc.unit_id}
                      onChange={(v) => choose('unit_id', v)}
                      items={options.units.map((x) => ({
                        value: String(x.id),
                        label: x.name,
                      }))}
                    />
                  </Field>
                  <Field title="Contratante">
                    <Input
                      value={c.client || ''}
                      onChange={(e) => set('client', e.target.value)}
                    />
                  </Field>
                  <Field title="Contratada">
                    <Input
                      value={c.contractor || ''}
                      onChange={(e) => set('contractor', e.target.value)}
                    />
                  </Field>
                  <Field title="Subcontratada">
                    <Input
                      value={c.subcontractor || ''}
                      onChange={(e) => set('subcontractor', e.target.value)}
                    />
                  </Field>
                  <Field title="Número do contrato">
                    <Input
                      value={doc.contract_number || ''}
                      onChange={(e) =>
                        choose('contract_number', e.target.value)
                      }
                    />
                  </Field>
                  <Field title="Vigência inicial">
                    <Input
                      type="date"
                      value={doc.start_on || ''}
                      onChange={(e) => choose('start_on', e.target.value)}
                    />
                  </Field>
                  <Field title="Vigência final">
                    <Input
                      type="date"
                      value={doc.end_on || ''}
                      onChange={(e) => choose('end_on', e.target.value)}
                    />
                  </Field>
                  <Field title="Tipo de documento">
                    <SelectInput
                      value={c.review_kind || 'Elaboração'}
                      onChange={(v) => set('review_kind', v)}
                      items={[
                        'Elaboração',
                        'Renovação',
                        'Revisão',
                        'Atualização',
                      ]}
                    />
                  </Field>
                  <Field title="Local da execução">
                    <Input
                      value={c.work_location || ''}
                      onChange={(e) => set('work_location', e.target.value)}
                    />
                  </Field>
                </div>
                <BoxText
                  title="Descrição geral das atividades e do objeto do contrato"
                  value={c.activities_summary}
                  onChange={(v) => set('activities_summary', v)}
                />
              </Section>
              <Section title="2. Responsabilidade técnica">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field title="Nome do responsável">
                    <Input
                      value={c.technician_name || ''}
                      onChange={(e) => set('technician_name', e.target.value)}
                    />
                  </Field>
                  <Field title="Profissão / habilitação">
                    <Input
                      value={c.technician_title || ''}
                      onChange={(e) => set('technician_title', e.target.value)}
                    />
                  </Field>
                  <Field title="CREA / registro profissional">
                    <Input
                      value={c.technician_registration || ''}
                      onChange={(e) =>
                        set('technician_registration', e.target.value)
                      }
                    />
                  </Field>
                </div>
                <BoxText
                  title="Objetivos e abrangência"
                  value={c.goals}
                  onChange={(v) => set('goals', v)}
                />
              </Section>
            </>
          )}
          {tab === 'ambientes' && (
            <>
              {records(
                'sectors',
                'Setores da obra',
                'Descreva os locais, processos e tarefas da empresa.',
              )}
              {records(
                'areas',
                'Caracterização dos ambientes de trabalho',
                'No vídeo: ambiente, características físicas e condições de trabalho.',
              )}
            </>
          )}
          {tab === 'funcoes' && (
            <>
              {records(
                'groups',
                'Grupos homogêneos de exposição (GHE)',
                'Cadastre cada GHE com funções equivalentes em relação à exposição.',
              )}
              {records(
                'roles',
                'Cargos, CBO, efetivo e atividades',
                'Pode selecionar a função cadastrada no RH e associá-la ao GHE.',
              )}
            </>
          )}
          {tab === 'riscos' && (
            <>
              <Section
                title="Critérios e metodologia técnica"
                description="Preencher com a metodologia adotada pela equipe de SST; não usar classificação automática sem validação."
              >
                <BoxText
                  title="Metodologia de reconhecimento e avaliação"
                  value={c.methodology}
                  onChange={(v) => set('methodology', v)}
                />
                <BoxText
                  title="Critérios de probabilidade, severidade e aceitabilidade"
                  value={c.evaluation_criteria}
                  onChange={(v) => set('evaluation_criteria', v)}
                />
              </Section>
              {records(
                'risks',
                'Inventário de riscos ocupacionais',
                'Agentes físicos, químicos, biológicos, ergonômicos, de acidentes e outros. Cada risco deve estar vinculado ao GHE.',
              )}
            </>
          )}
          {tab === 'controles' && (
            <>
              {records(
                'control_measures',
                'Medidas administrativas',
                'Prevenção, treinamento, procedimentos, orientações e documentação.',
              )}
              {records(
                'epcs',
                'Medidas de proteção coletiva (EPC)',
                'Indique existência, implantação prevista e evidências.',
              )}
              {records(
                'epis',
                'Equipamentos de proteção individual (EPI)',
                'Associe EPIs e respectivos certificados/controles aos GHEs.',
              )}
              <Section title="Medidas preventivas gerais">
                <BoxText
                  title="Política e medidas preventivas"
                  value={c.preventive_policy}
                  onChange={(v) => set('preventive_policy', v)}
                />
                <BoxText
                  title="Avaliação da eficácia das medidas"
                  value={c.effectiveness}
                  onChange={(v) => set('effectiveness', v)}
                />
              </Section>
            </>
          )}
          {tab === 'medicoes' && (
            <>
              {records(
                'measurements',
                'Levantamentos de níveis / avaliações ambientais',
                'Exemplos mostrados no vídeo: ruído, calor e iluminação. Só registre resultados realmente medidos.',
              )}
              <Section title="Observações técnicas">
                <BoxText
                  title="Análises complementares e observações"
                  value={c.technical_notes}
                  onChange={(v) => set('technical_notes', v)}
                />
              </Section>
            </>
          )}
          {tab === 'equipamentos' && (
            <>
              {records(
                'equipment',
                'Instrumentos, máquinas e equipamentos',
                'Cadastre os instrumentos utilizados e registros de calibração, quando aplicável.',
              )}
              {records(
                'appendices',
                'Documentos e anexos de referência',
                'Nesta etapa são registradas referências. O envio de arquivos binários ainda não está implementado.',
              )}
            </>
          )}
          {tab === 'acoes' && (
            <>
              {records(
                'actions',
                'Cronograma e plano de ação',
                'Defina ação, risco relacionado, responsável, prazo, situação e evidência.',
              )}
              <Section title="Planos e acompanhamento">
                <BoxText
                  title="Preparação para emergências"
                  value={c.emergency_plan}
                  onChange={(v) => set('emergency_plan', v)}
                />
                <BoxText
                  title="Registro, manutenção e divulgação do PGR"
                  value={c.dissemination}
                  onChange={(v) => set('dissemination', v)}
                />
              </Section>
            </>
          )}
          {tab === 'emitir' && (
            <>
              <Section
                title="Revisão e emissão do PGR"
                description="Conferência do levantamento técnico e geração do documento editável."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ['GHEs', count('groups')],
                    ['Funções', count('roles')],
                    ['Riscos', count('risks')],
                    ['EPIs', count('epis')],
                    ['Medições', count('measurements')],
                    ['Ações', count('actions')],
                  ].map(([label, n]) => (
                    <div
                      key={label}
                      className="p-3 rounded-xl bg-slate-50 border"
                    >
                      <p className="text-2xl font-bold text-slate-900">{n}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <BoxText
                  title="Fundamentos legais considerados"
                  value={c.legal_basis}
                  onChange={(v) => set('legal_basis', v)}
                />
                <BoxText
                  title="Conclusão técnica (redigida pelo responsável)"
                  rows={6}
                  value={c.technical_conclusion}
                  onChange={(v) => set('technical_conclusion', v)}
                />
                <div className="p-3 rounded-lg border bg-amber-50 text-sm text-amber-900">
                  <strong>Fidelidade ao Fagundes:</strong> a exportação da
                  versão atual é uma minuta dinâmica com as informações
                  registradas. O original de 119 páginas permanece disponível
                  para conferência na Homologação, mas ainda não foi
                  transformado integralmente em um Word equivalente.
                </div>
                <label className="flex gap-3 items-start text-sm">
                  <input
                    type="checkbox"
                    checked={review}
                    onChange={(e) => setReview(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Confirmo que este conteúdo foi revisado por profissional
                    competente. Entendo que a assinatura e a aprovação formal
                    dependem de procedimento próprio.
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => save('review')}
                    disabled={busy || doc.status === 'validated'}
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Enviar para revisão
                  </Button>
                  <Button
                    onClick={() => save('validated')}
                    disabled={busy || doc.status === 'validated' || !review}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Registrar revisão técnica
                  </Button>
                  {doc.id && (
                    <Button onClick={duplicate} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar / nova revisão
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => exportFile('word')}
                    disabled={!!output}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Word
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportFile('pdf')}
                    disabled={!!output}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </Section>
            </>
          )}
          <div className="bg-white border rounded-xl p-3 flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => jump(-1)}
              disabled={tab === menu[0].id}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {tab !== menu[menu.length - 1].id ? (
              <Button onClick={() => jump(1)}>
                Próxima etapa
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                disabled={busy || doc.status === 'validated'}
                onClick={() => save('draft')}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar PGR
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
