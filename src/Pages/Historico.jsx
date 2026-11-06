import { canViewFinancial } from '@/lib/permissions';
import { useAuth } from '@/lib/AuthContext';
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader, { SearchInput } from "@/components/PageHeader";
import { History, Download, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MOVEMENT_TYPES, formatDateTime, formatNumber, formatCurrency, exportToCSV } from "@/lib/estoque";

export default function Historico() {
  const {user}=useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fUser, setFUser] = useState("");
  const [fDept, setFDept] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const pageSize = 20;

  useEffect(() => {
    base44.entities.Movement.list("-date", 3000).then((m) => {
      setMovements(m);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let r = movements;
    const q = search.toLowerCase().trim();
    if (q) r = r.filter((m) =>
      m.product_name?.toLowerCase().includes(q) ||
      m.product_code?.toLowerCase().includes(q) ||
      (m.document || "").toLowerCase().includes(q) ||
      (m.employee || "").toLowerCase().includes(q)
    );
    if (fType) r = r.filter((m) => m.type === fType);
    if (fUser) r = r.filter((m) => (m.user_name || "").toLowerCase().includes(fUser.toLowerCase()));
    if (fDept) r = r.filter((m) => (m.department || "").toLowerCase().includes(fDept.toLowerCase()));
    if (fStart) r = r.filter((m) => new Date(m.date) >= new Date(fStart + "T00:00:00"));
    if (fEnd) r = r.filter((m) => new Date(m.date) <= new Date(fEnd + "T23:59:59"));
    return r;
  }, [movements, search, fType, fUser, fDept, fStart, fEnd]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleExport = () => {
    exportToCSV("historico_movimentacoes.csv", filtered.map((m) => ({
      Data: formatDateTime(m.date), Produto: m.product_name, Codigo: m.product_code,
      Tipo: MOVEMENT_TYPES[m.type]?.label || m.type, Quantidade: m.quantity,
      SaldoAnterior: m.previous_balance, SaldoPosterior: m.new_balance,
      Documento: m.document || "", Setor: m.department || "", Funcionario: m.employee || "",
      Usuario: m.user_name || "", Motivo: m.reason || "", Observacao: m.notes || "",
    })));
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Histórico de Movimentações"
        subtitle={`${filtered.length} movimentação(ões)`}
        icon={History}
        actions={
          <button onClick={handleExport} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> CSV
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Produto, código, doc..." />
        <select value={fType} onChange={(e) => { setFType(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="ajuste_positivo">Ajuste Positivo</option>
          <option value="ajuste_negativo">Ajuste Negativo</option>
          <option value="inventario">Inventário</option>
          <option value="transferencia_saida">Transferência enviada</option>
          <option value="transferencia_entrada">Transferência recebida</option>
        </select>
        <Input placeholder="Usuário" value={fUser} onChange={(e) => { setFUser(e.target.value); setPage(0); }} className="h-9" />
        <Input placeholder="Setor" value={fDept} onChange={(e) => { setFDept(e.target.value); setPage(0); }} className="h-9" />
        <Input type="date" value={fStart} onChange={(e) => { setFStart(e.target.value); setPage(0); }} className="h-9" />
        <Input type="date" value={fEnd} onChange={(e) => { setFEnd(e.target.value); setPage(0); }} className="h-9" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Data/Hora</th>
                <th className="text-left px-4 py-2.5">Produto</th>
                <th className="text-left px-4 py-2.5">Tipo</th>
                <th className="text-right px-4 py-2.5">Qtd.</th>
                <th className="text-right px-4 py-2.5">Saldo Ant.</th>
                <th className="text-right px-4 py-2.5">Saldo Post.</th>
                <th className="text-left px-4 py-2.5">Documento</th>
                <th className="text-left px-4 py-2.5">Usuário</th>
                <th className="text-right px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Nenhuma movimentação encontrada.</td></tr>
              ) : pageData.map((m) => {
                const t = MOVEMENT_TYPES[m.type] || {};
                const isEntrada = ["entrada", "ajuste_positivo", "inventario"].includes(m.type);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(m.date)}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{m.product_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{m.product_code}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${t.bg} ${t.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${isEntrada ? "text-emerald-600" : "text-rose-600"}`}>
                      {isEntrada ? "+" : "−"}{formatNumber(m.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{formatNumber(m.previous_balance)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatNumber(m.new_balance)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.document || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.user_name || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setDetail(m)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Anterior</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {detail && <MovementDetailDialog movement={detail} showMoney={canViewFinancial(user?.role)} onOpenChange={(o) => !o && setDetail(null)} />}
    </div>
  );
}

function MovementDetailDialog({ movement, showMoney, onOpenChange }) {
  const m = movement;
  const t = MOVEMENT_TYPES[m.type] || {};
  const rows = [
    ["Data/Hora", formatDateTime(m.date)],
    ["Produto", `${m.product_name} (${m.product_code})`],
    ["Tipo", t.label || m.type],
    ["Quantidade", formatNumber(m.quantity)],
    ["Saldo Anterior", formatNumber(m.previous_balance)],
    ["Saldo Posterior", formatNumber(m.new_balance)],
    ["Documento/NF", m.document || "—"],
    ["Tipo de Entrada", m.entry_type || "—"],
    ["Motivo de Saída", m.exit_reason || "—"],
    ["Fornecedor", m.supplier_name || "—"],
    ["Setor", m.department || "—"],
    ["Funcionário", m.employee || "—"],
    ["Centro de Custo", m.cost_center || "—"],
    ["Motivo/Justificativa", m.reason || "—"],
    ["Usuário Responsável", m.user_name || "—"],
    ...(showMoney ? [["Custo Unitário", formatCurrency(m.unit_cost)]] : []),
    ["Observação", m.notes || "—"],
  ];
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Detalhes da Movimentação</DialogTitle></DialogHeader>
        <div className="divide-y divide-slate-100">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-4 py-2 text-sm">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-800 font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}