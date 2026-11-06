import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Warehouse,
  MapPin,
  BriefcaseBusiness,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/api/http';
import PageHeader from '@/components/PageHeader';

const field =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';
export default function Unidades() {
  const [units, setUnits] = useState([]),
    [centers, setCenters] = useState([]),
    [name, setName] = useState(''),
    [center, setCenter] = useState({ unit_id: '', code: '', name: '' }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = () =>
    Promise.all([
      api('org/units', { warehouse: false }),
      api('org/centers', { warehouse: false }),
    ])
      .then(([a, b]) => {
        setUnits(a);
        setCenters(b);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const submit = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Sede, Obras e Centros de Custo"
        subtitle="A sede administra todas as unidades. Cada obra possui exatamente um almoxarifado."
        icon={Building2}
      />
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              await api('org/units', { data: { name } });
              setName('');
            });
          }}
          className="rounded-xl border bg-white p-5 space-y-3"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Cadastrar nova obra
          </h2>
          <p className="text-xs text-slate-500">
            O almoxarifado da obra será criado automaticamente, sem
            possibilidade de duplicação.
          </p>
          <input
            className={field}
            placeholder="Nome da obra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={180}
            required
          />
          <button
            disabled={busy}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Criar obra e almoxarifado
          </button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(async () => {
              await api('org/centers', { data: center, warehouse: false });
              setCenter((v) => ({ ...v, code: '', name: '' }));
            });
          }}
          className="rounded-xl border bg-white p-5 space-y-3"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4" /> Cadastrar centro de custo
          </h2>
          <select
            className={field}
            value={center.unit_id}
            onChange={(e) => setCenter({ ...center, unit_id: e.target.value })}
            required
          >
            <option value="">Selecione a unidade</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.kind === 'sede' ? 'Sede' : 'Obra'})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={field}
              placeholder="Código ex.: 001"
              value={center.code}
              onChange={(e) => setCenter({ ...center, code: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder="Nome ex.: TI"
              value={center.name}
              onChange={(e) => setCenter({ ...center, name: e.target.value })}
              required
            />
          </div>
          <button
            disabled={busy}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Cadastrar centro de custo
          </button>
        </form>
      </div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-slate-800">Estrutura da empresa</h2>
        <button
          onClick={load}
          className="text-xs text-indigo-700 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {units.map((u) => (
          <section key={u.id} className="rounded-xl border bg-white p-5">
            <div className="flex gap-3 items-center mb-3">
              <span className="bg-indigo-50 rounded-lg p-2 text-indigo-600">
                {u.kind === 'sede' ? <Building2 /> : <MapPin />}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-slate-500">
                  {u.kind === 'sede' ? 'Sede administrativa' : 'Obra'} •{' '}
                  {u.status === 'active' ? 'Ativa' : 'Inativa'}
                </div>
              </div>
              <span className="text-xs font-medium text-indigo-600">
                #{u.id}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 flex gap-2 items-center">
              <Warehouse className="w-5 h-5 text-slate-500" />
              <span className="text-sm">{u.warehouse_name}</span>
              <span className="text-xs text-slate-400 ml-auto">Único</span>
            </div>
            <h3 className="text-xs font-semibold mt-4 mb-2 text-slate-500 uppercase tracking-wide">
              Centros de custo (
              {centers.filter((c) => c.unit_id === u.id).length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {centers
                .filter((c) => c.unit_id === u.id)
                .map((c) => (
                  <span
                    key={c.id}
                    className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full"
                  >
                    {c.code} — {c.name}
                  </span>
                ))}
              {!centers.some((c) => c.unit_id === u.id) && (
                <span className="text-slate-400 text-xs">
                  Nenhum centro de custo cadastrado
                </span>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
