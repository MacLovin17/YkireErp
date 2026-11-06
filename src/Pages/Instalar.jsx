import React, { useState } from 'react';
import { api } from '@/api/http';
import { Building2, LockKeyhole } from 'lucide-react';
export default function Instalar() {
  const [form, setForm] = useState({
      setup_key: '',
      sede_name: 'Sede Administrativa',
      username: 'Master',
      password: '',
    }),
    [msg, setMsg] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api('setup', { data: form, warehouse: false });
      setMsg(r.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-sm border p-8 space-y-4"
      >
        <Building2 className="w-10 h-10 text-indigo-600" />
        <h1 className="text-2xl font-bold">Instalar Ykire Estoque 2.0</h1>
        <p className="text-sm text-slate-600">
          Importe primeiro o arquivo <code>api/schema.sql</code> pelo phpMyAdmin
          e preencha <code>api/config.php</code>. Esta etapa cria somente o
          usuário inicial e a sede com seu almoxarifado.
        </p>
        {error && (
          <div className="bg-rose-50 p-3 text-rose-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {msg && (
          <div className="bg-emerald-50 p-3 text-emerald-700 rounded-lg text-sm">
            {msg}{' '}
            <a className="underline" href={`${import.meta.env.BASE_URL}login`}>
              Ir ao login
            </a>
          </div>
        )}
        {[
          ['setup_key', 'Chave de instalação configurada no PHP'],
          ['sede_name', 'Nome da sede'],
          ['username', 'Usuário Master'],
          ['password', 'Senha nova do Master (mín. 12 caracteres)'],
        ].map(([name, label]) => (
          <label key={name} className="block text-sm font-medium">
            {label}
            <input
              className="mt-1 w-full border rounded-lg p-3 text-sm"
              type={
                name === 'setup_key' || name === 'password'
                  ? 'password'
                  : 'text'
              }
              autoComplete="off"
              required
              minLength={name === 'password' ? 12 : undefined}
              value={form[name]}
              onChange={(e) =>
                setForm((v) => ({ ...v, [name]: e.target.value }))
              }
            />
          </label>
        ))}
        <button
          disabled={busy || !!msg}
          className="w-full rounded-lg bg-indigo-600 text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Instalando...' : 'Criar sede e usuário Master'}
        </button>
        <div className="text-xs text-slate-500 flex gap-2">
          <LockKeyhole className="w-5 h-5 shrink-0" />
          Após instalar, remova a chave de instalação do arquivo config.php. A
          API bloqueia instalações quando já existem usuários.
        </div>
      </form>
    </main>
  );
}
