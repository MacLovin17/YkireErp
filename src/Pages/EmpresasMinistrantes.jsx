import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Edit3,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
const empty = { legal_name: '', trade_name: '', cnpj: '', status: 'active' };
const formatCnpj = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : v || '—';
};
export default function EmpresasMinistrantes() {
  const [list, setList] = useState([]),
    [filter, setFilter] = useState(''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [selectedId, setSelectedId] = useState(''),
    [form, setForm] = useState(empty);
  const load = async () => {
    setLoading(true);
    try {
      setList(
        await api('certificates/companies', {
          warehouse: false,
          params: { include_inactive: '1' },
        }),
      );
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
      list.filter((c) =>
        [c.legal_name, c.trade_name, c.cnpj]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(filter.toLocaleLowerCase('pt-BR')),
      ),
    [list, filter],
  );
  const start = (company) => {
    setSelectedId(company ? String(company.id) : '');
    setForm(
      company
        ? {
            legal_name: company.legal_name || '',
            trade_name: company.trade_name || '',
            cnpj: company.cnpj || '',
            status: company.status || 'active',
          }
        : empty,
    );
    setShow(true);
  };
  const save = async (e) => {
    e.preventDefault();
    if (!form.legal_name.trim()) {
      toast.error('Informe a razão social.');
      return;
    }
    setBusy(true);
    try {
      await api('certificates/companies', {
        method: selectedId ? 'PUT' : 'POST',
        warehouse: false,
        data: { ...form, ...(selectedId ? { id: selectedId } : {}) },
      });
      toast.success(
        selectedId
          ? 'Empresa atualizada. Certificados já emitidos permanecem inalterados.'
          : 'Empresa ministrante cadastrada.',
      );
      setShow(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Empresas ministrantes"
          subtitle="Cadastre quem realiza os treinamentos usados nos certificados de SSMA."
          icon={Building2}
        />
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => start(null)}
        >
          <Plus className="w-4 h-4 mr-1" /> Nova empresa
        </Button>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-2 text-sm text-blue-900">
        <ShieldCheck className="w-5 h-5 shrink-0" /> O nome da empresa será
        registrado na emissão. Alterações futuras no cadastro não modificam
        certificados já emitidos.
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">
              Empresas cadastradas
            </h3>
            <p className="text-xs text-slate-500">
              {list.filter((c) => c.status === 'active').length} ativa(s) de{' '}
              {list.length} empresa(s)
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              className="pl-9"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Pesquisar razão social ou CNPJ"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {[
                  'Razão social',
                  'Nome fantasia',
                  'CNPJ',
                  'Situação',
                  'Ações',
                ].map((t) => (
                  <th key={t} className="text-left p-3">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-900">
                    {c.legal_name}
                  </td>
                  <td className="p-3 text-slate-600">{c.trade_name || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatCnpj(c.cnpj)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {c.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => start(c)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-500">
                    {loading ? 'Carregando...' : 'Nenhuma empresa encontrada.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {show && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <form
            onSubmit={save}
            className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-700">
                  SSMA / Cadastro
                </p>
                <h3 className="text-xl font-bold">
                  {selectedId ? 'Editar empresa' : 'Nova empresa ministrante'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                className="text-slate-500 text-xl"
                onClick={() => setShow(false)}
              >
                ✕
              </button>
            </div>
            <div>
              <Label className="block mb-1.5">Razão social *</Label>
              <Input
                required
                maxLength={180}
                value={form.legal_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, legal_name: e.target.value }))
                }
                placeholder="Ex.: EMPRESA DE TREINAMENTOS LTDA"
              />
            </div>
            <div>
              <Label className="block mb-1.5">Nome fantasia (opcional)</Label>
              <Input
                maxLength={180}
                value={form.trade_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trade_name: e.target.value }))
                }
                placeholder="Ex.: Centro de Treinamentos"
              />
            </div>
            <div>
              <Label className="block mb-1.5">CNPJ (opcional)</Label>
              <Input
                inputMode="numeric"
                maxLength={18}
                value={form.cnpj}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cnpj: e.target.value }))
                }
                placeholder="00.000.000/0000-00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Se informado, será validado. O CNPJ não substitui a
                identificação da empresa emissora nas assinaturas.
              </p>
            </div>
            {selectedId && (
              <div>
                <Label className="block mb-1.5">Situação</Label>
                <select
                  className="h-10 w-full border border-slate-200 rounded-lg px-3"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="active">
                    Ativa — disponível para novas emissões
                  </option>
                  <option value="inactive">
                    Inativa — não aparece nas novas emissões
                  </option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShow(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}
                {selectedId ? 'Salvar alterações' : 'Cadastrar empresa'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
