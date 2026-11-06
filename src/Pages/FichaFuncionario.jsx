import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  HardHat,
  History,
  UserRound,
  Wrench,
} from 'lucide-react';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/estoque';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { canViewFinancial } from '@/lib/permissions';

const day = (value) => {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('pt-BR');
};
const statusLabel = (value) =>
  ({
    good: 'Devolvida ao estoque',
    damaged: 'Danificada (baixada)',
    lost: 'Extraviada (baixada)',
  })[value] || value;
function Stat({ label, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-slate-500 text-sm">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
export default function FichaFuncionario() {
  const { user } = useAuth();
  const showMoney = canViewFinancial(user?.role);
  const { registration } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState('epi');
  useEffect(() => {
    let live = true;
    setData(null);
    setLoading(true);
    api('employees/profile', { warehouse: false, params: { registration } })
      .then((result) => {
        if (live) setData(result);
      })
      .catch((error) => {
        if (live) toast.error(error.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [registration]);

  const stats = useMemo(() => {
    if (!data) return null;
    const open = data.tools.filter((t) => Number(t.outstanding_quantity) > 0);
    return {
      epiCount: data.epis.length,
      epiAmount: data.epis.reduce((sum, d) => sum + Number(d.quantity || 0), 0),
      toolOpen: open.length,
      toolPending: open.reduce(
        (sum, d) => sum + Number(d.outstanding_quantity || 0),
        0,
      ),
    };
  }, [data]);

  const download = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { generateEmployeeStatementPdf } =
        await import('@/lib/employeePdf');
      generateEmployeeStatementPdf({ ...data, canViewFinancial: showMoney });
      toast.success('Ficha PDF gerada.');
    } catch (error) {
      toast.error(error.message || 'Não foi possível gerar o PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-slate-500">
        Carregando ficha do funcionário...
      </div>
    );
  if (!data)
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Link
          to="/rh/funcionarios"
          className="inline-flex gap-2 text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos funcionários
        </Link>
        <div className="rounded-xl border bg-white p-6 text-slate-600">
          Não foi possível carregar a ficha. Confirme a matrícula e se a API PHP
          foi atualizada.
        </div>
      </div>
    );

  const { employee, epis, tools, returns } = data;
  const timeline = [
    ...epis.map((e) => ({
      id: `e-${e.id}`,
      at: e.delivered_at,
      kind: 'EPI entregue',
      name: e.product_name,
      quantity: e.quantity,
      person: e.delivered_by,
      unit: e.issue_unit_name,
    })),
    ...tools.map((t) => ({
      id: `t-${t.id}`,
      at: t.issued_at,
      kind: 'Ferramenta entregue',
      name: t.product_name,
      quantity: t.issued_quantity,
      person: t.issued_by,
      unit: t.issue_unit_name,
    })),
    ...returns.map((r) => ({
      id: `r-${r.id}`,
      at: r.occurred_at,
      kind:
        r.disposition === 'good'
          ? 'Ferramenta devolvida'
          : r.disposition === 'damaged'
            ? 'Baixa por dano'
            : 'Baixa por extravio',
      name: r.product_name,
      quantity: r.quantity,
      person: r.received_by,
      unit: r.issue_unit_name,
    })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Link
            to="/rh/funcionarios"
            className="text-sm text-indigo-700 hover:text-indigo-900 inline-flex gap-1 items-center mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Funcionários
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Ficha individual
          </h1>
          <p className="text-sm text-slate-500">
            EPIs, ferramentas, pendências e devoluções vinculados à matrícula.
          </p>
        </div>
        <Button onClick={download} disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Gerando PDF...' : 'Baixar ficha em PDF'}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex gap-3 items-start">
          <div className="rounded-lg bg-indigo-50 p-3 text-indigo-700">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-slate-900 break-words">
              {employee.full_name}
            </p>
            <p className="text-sm text-slate-500">
              Matrícula {employee.registration}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${employee.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
          >
            {employee.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-sm">
          <div>
            <div className="text-slate-500">Função</div>
            <div className="font-medium break-words">
              {employee.job_title || '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Departamento / setor</div>
            <div className="font-medium break-words">
              {employee.department || '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Unidade atual</div>
            <div className="font-medium break-words">
              {employee.unit_name || '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Centro de custo atual</div>
            <div className="font-medium break-words">
              {[employee.cost_center_code, employee.cost_center_name]
                .filter(Boolean)
                .join(' · ') || 'Não atribuído'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Entregas de EPI"
          value={epis.length}
          subtitle={`${formatNumber(stats.epiAmount)} unidades entregues`}
          icon={HardHat}
        />
        <Stat
          label="Ferramentas entregues"
          value={tools.length}
          subtitle="Histórico completo"
          icon={Wrench}
        />
        <Stat
          label="Contas pendentes"
          value={stats.toolOpen}
          subtitle={`${formatNumber(stats.toolPending)} unidades em posse`}
          icon={ClipboardList}
        />
        <Stat
          label="Devoluções e baixas"
          value={returns.length}
          subtitle="Registros de ferramentas"
          icon={History}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div
          className="flex flex-wrap gap-2 border-b p-3"
          role="tablist"
          aria-label="Históricos do colaborador"
        >
          {[
            ['epi', 'EPIs', epis.length],
            ['tools', 'Ferramentas', tools.length],
            ['returns', 'Devoluções / baixas', returns.length],
            ['timeline', 'Linha do tempo', timeline.length],
          ].map(([key, title, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {title} ({count})
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          {tab === 'epi' && (
            <table className="min-w-[950px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Data',
                    'EPI',
                    'Qtd.',
                    'CA',
                    'Motivo da substituição',
                    'Almoxarifado / Unidade',
                    ...(showMoney ? ['Custo da entrega'] : []),
                  ].map((h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {epis.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {day(e.delivered_at)}
                    </td>
                    <td className="p-3 font-medium">{e.product_name}</td>
                    <td className="p-3">
                      {formatNumber(e.quantity)} {e.product_unit}
                    </td>
                    <td className="p-3">{e.ca_number || '—'}</td>
                    <td className="p-3">{e.replacement_reason || '—'}</td>
                    <td className="p-3">
                      {e.warehouse_name}
                      <div className="text-xs text-slate-500">
                        {e.issue_unit_name}
                      </div>
                    </td>
                    {showMoney && (
                      <td className="p-3 whitespace-nowrap">
                        {formatCurrency(e.delivery_value)}
                      </td>
                    )}
                  </tr>
                ))}
                {!epis.length && (
                  <tr>
                    <td
                      colSpan={showMoney ? 7 : 6}
                      className="p-8 text-center text-slate-500"
                    >
                      Nenhum EPI registrado nesta ficha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {tab === 'tools' && (
            <table className="min-w-[950px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Entrega',
                    'Ferramenta',
                    'Qtd. entregue',
                    'Qtd. encerrada',
                    'Em posse',
                    'Almoxarifado / Unidade',
                    ...(showMoney ? ['Valor da entrega'] : []),
                    'Situação',
                  ].map((h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {day(t.issued_at)}
                    </td>
                    <td className="p-3 font-medium">{t.product_name}</td>
                    <td className="p-3">
                      {formatNumber(t.issued_quantity)} {t.product_unit}
                    </td>
                    <td className="p-3">{formatNumber(t.settled_quantity)}</td>
                    <td className="p-3 font-semibold text-amber-700">
                      {formatNumber(t.outstanding_quantity)}
                    </td>
                    <td className="p-3">
                      {t.warehouse_name}
                      <div className="text-xs text-slate-500">
                        {t.issue_unit_name}
                      </div>
                    </td>
                    {showMoney && (
                      <td className="p-3 whitespace-nowrap">
                        {formatCurrency(t.issued_value)}
                      </td>
                    )}
                    <td className="p-3">
                      {Number(t.outstanding_quantity) > 0
                        ? 'Em posse'
                        : 'Encerrada'}
                    </td>
                  </tr>
                ))}
                {!tools.length && (
                  <tr>
                    <td
                      colSpan={showMoney ? 8 : 7}
                      className="p-8 text-center text-slate-500"
                    >
                      Nenhuma ferramenta registrada nesta ficha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {tab === 'timeline' && (
            <table className="min-w-[850px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Data',
                    'Evento',
                    'Produto',
                    'Quantidade',
                    'Unidade',
                    'Registrado por',
                  ].map((h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeline.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{day(item.at)}</td>
                    <td className="p-3 font-medium">{item.kind}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{formatNumber(item.quantity)}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3">{item.person || '—'}</td>
                  </tr>
                ))}
                {!timeline.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhuma movimentação vinculada ao colaborador.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {tab === 'returns' && (
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Data',
                    'Ferramenta',
                    'Quantidade',
                    'Condição / destino',
                    'Almoxarifado',
                    'Recebido por',
                    'Observações',
                  ].map((h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {day(r.occurred_at)}
                    </td>
                    <td className="p-3 font-medium">{r.product_name}</td>
                    <td className="p-3">
                      {formatNumber(r.quantity)} {r.product_unit}
                    </td>
                    <td className="p-3">{statusLabel(r.disposition)}</td>
                    <td className="p-3">{r.warehouse_name}</td>
                    <td className="p-3">{r.received_by}</td>
                    <td className="p-3">{r.notes || '—'}</td>
                  </tr>
                ))}
                {!returns.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhuma devolução ou baixa registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Ficha administrativa baseada nos registros do Ykire. O PDF não substitui
        recibo de entrega assinado ou documentos exigidos pela segurança do
        trabalho. Apenas usuários autorizados podem consultar a ficha.
      </p>
    </div>
  );
}
