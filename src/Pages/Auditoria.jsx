import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/api/http';
import { formatDateTime, exportToCSV } from '@/lib/estoque';
export default function Auditoria() {
  const [rows, setRows] = useState([]),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('');
  useEffect(() => {
    api('audit')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  const shown = rows.filter((r) =>
    [r.user_name, r.action, r.entity, r.entity_id]
      .join(' ')
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Rastreabilidade e Auditoria"
        subtitle="Ações administrativas e movimentações registradas no servidor"
        icon={ShieldCheck}
        actions={
          <button
            onClick={() =>
              exportToCSV(
                'auditoria.csv',
                shown.map((r) => ({
                  Data: r.created_at,
                  Usuario: r.user_name,
                  Acao: r.action,
                  Registro: r.entity,
                  ID: r.entity_id,
                  Detalhes: JSON.stringify(r.details),
                })),
              )
            }
            className="bg-white border rounded-lg px-4 py-2 text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        }
      />
      {error && (
        <div className="p-3 text-rose-700 bg-rose-50 rounded mb-3">{error}</div>
      )}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <input
            aria-label="Pesquisar auditoria"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border px-3 py-2 rounded-lg w-full sm:w-72 text-sm"
            placeholder="Pesquisar usuário, ação, registro..."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Data', 'Usuário', 'Ação', 'Entidade', 'ID', 'Detalhes'].map(
                  (h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="p-3">{r.user_name}</td>
                  <td className="p-3 font-semibold">{r.action}</td>
                  <td className="p-3">{r.entity}</td>
                  <td className="p-3">{r.entity_id}</td>
                  <td className="p-3 text-xs text-slate-500 max-w-xs break-all">
                    {JSON.stringify(r.details || {})}
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400">
                    Nenhuma ação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
