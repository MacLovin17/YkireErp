import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  Building2,
  BriefcaseBusiness,
  Plus,
  Search,
  SquarePen,
  X,
  Save,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/api/http';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const configs = {
  jobs: {
    title: 'Funções',
    singular: 'função',
    description:
      'Nomenclatura padronizada dos cargos. O código é automático e único.',
    icon: BriefcaseBusiness,
  },
  departments: {
    title: 'Departamentos',
    singular: 'departamento',
    description:
      'Cadastre os setores uma vez para utilização em todas as obras.',
    icon: BookOpenCheck,
  },
  companies: {
    title: 'Empresas empregadoras',
    singular: 'empresa',
    description:
      'Cadastre os CNPJs das empresas responsáveis pelos contratos de trabalho.',
    icon: Building2,
  },
};
const empty = { name: '', trade_name: '', cnpj: '', status: 'active' };
const maskCnpj = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : String(v || '');
};
export default function RhCatalog({ type }) {
  const cfg = configs[type];
  const Icon = cfg.icon;
  const { user } = useAuth();
  const canEdit = ['admin', 'master'].includes(user?.role);
  const [rows, setRows] = useState([]),
    [query, setQuery] = useState(''),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(empty);
  const load = async () => {
    setLoading(true);
    try {
      setRows(await api('hr/catalog', { warehouse: false, params: { type } }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setOpen(false);
    setQuery('');
    load();
  }, [type]);
  const filtered = useMemo(
    () =>
      rows.filter((x) =>
        [x.id, x.name, x.trade_name, x.cnpj]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(query.toLocaleLowerCase('pt-BR')),
      ),
    [rows, query],
  );
  const begin = (row) => {
    setEditing(row ? row.id : null);
    setForm(
      row
        ? {
            name: row.name || '',
            trade_name: row.trade_name || '',
            cnpj: maskCnpj(row.cnpj),
            status: row.status || 'active',
          }
        : empty,
    );
    setOpen(true);
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (type === 'companies' && form.cnpj.replace(/\D/g, '').length !== 14)
        throw new Error('Informe um CNPJ de 14 dígitos válido.');
      await api('hr/catalog', {
        method: editing ? 'PUT' : 'POST',
        warehouse: false,
        params: { type },
        data: { ...form, ...(editing ? { id: editing } : {}) },
      });
      toast.success(editing ? 'Cadastro atualizado.' : 'Cadastro criado.');
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={cfg.title} subtitle={cfg.description} icon={Icon} />
        {canEdit && (
          <Button onClick={() => begin(null)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo cadastro
          </Button>
        )}
      </div>
      <div className="bg-indigo-50 text-indigo-900 text-sm px-4 py-3 rounded-xl border border-indigo-100">
        O código é gerado pelo sistema. Na ficha do funcionário, o RH deve
        selecionar um item já cadastrado, sem digitar livremente a descrição.
      </div>
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 flex flex-wrap justify-between gap-3 items-center">
          <div>
            <h3 className="font-semibold text-slate-900">Cadastros</h3>
            <p className="text-xs text-slate-500">
              {rows.filter((r) => r.status === 'active').length} ativos de{' '}
              {rows.length}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute top-3 left-3 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Pesquisar código, nome ou CNPJ"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">
                  {type === 'companies' ? 'Razão social' : 'Nome padronizado'}
                </th>
                {type === 'companies' && (
                  <>
                    <th className="px-4 py-3 text-left">Fantasia</th>
                    <th className="px-4 py-3 text-left">CNPJ</th>
                  </>
                )}
                <th className="px-4 py-3 text-left">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-semibold">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  {type === 'companies' && (
                    <>
                      <td className="px-4 py-3">{row.trade_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {maskCnpj(row.cnpj)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {row.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => begin(row)}
                      >
                        <SquarePen className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={type === 'companies' ? 6 : 4}
                    className="text-center p-8 text-slate-500"
                  >
                    {loading ? 'Carregando...' : 'Nenhum registro encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-3">
          <form
            onSubmit={save}
            className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editing ? 'Editar' : 'Cadastrar'} {cfg.singular}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editing && (
              <div className="text-sm text-slate-600">
                Código interno: <b>{editing}</b>
              </div>
            )}
            <div>
              <Label className="block mb-1">
                {type === 'companies' ? 'Razão social' : 'Nome padronizado'} *
              </Label>
              <Input
                required
                maxLength={type === 'companies' ? 180 : 150}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            {type === 'companies' && (
              <>
                <div>
                  <Label className="block mb-1">Nome fantasia</Label>
                  <Input
                    maxLength={180}
                    value={form.trade_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trade_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="block mb-1">CNPJ *</Label>
                  <Input
                    required
                    maxLength={18}
                    inputMode="numeric"
                    value={form.cnpj}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cnpj: e.target.value }))
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </>
            )}
            {editing && (
              <div>
                <Label className="block mb-1">Situação</Label>
                <select
                  className="h-10 w-full border rounded-lg px-3"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">
                    Inativo — indisponível em novos cadastros
                  </option>
                </select>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Nenhum registro é excluído automaticamente. Desative cadastros
              obsoletos para preservar o vínculo com funcionários.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                <Save className="h-4 w-4 mr-1" />
                {busy ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
