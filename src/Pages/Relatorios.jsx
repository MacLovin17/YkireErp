import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { api, selectedWarehouse } from "@/api/http";
import PageHeader from "@/components/PageHeader";
import { FileBarChart, Download, FileText } from "lucide-react";
import { getStockStatus, formatNumber, formatCurrency, formatDateTime, exportToCSV, getPeriodRange, inPeriod, MOVEMENT_TYPES } from "@/lib/estoque";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { canViewFinancial } from "@/lib/permissions";

export default function Relatorios() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { user } = useAuth();
  const showMoney = canViewFinancial(user?.role);
  const [reportType, setReportType] = useState("estoque_atual");
  const [period, setPeriod] = useState("30dias");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list(null, 2000),
      base44.entities.Movement.list("-date", 3000),
      base44.entities.Inventory.list("-created_date", 500),
    ]).then(([p, m, i]) => { setProducts(p); setMovements(m); setInventories(i); setLoading(false); });
  }, []);

  const { start, end } = useMemo(() => getPeriodRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const REPORTS = [
    { key: "estoque_atual", label: "Estoque Atual", needsPeriod: false },
    { key: "abaixo_minimo", label: "Produtos Abaixo do Mínimo", needsPeriod: false },
    { key: "sem_estoque", label: "Produtos Sem Estoque", needsPeriod: false },
    { key: "entradas_periodo", label: "Entradas por Período", needsPeriod: true },
    { key: "saidas_periodo", label: "Saídas por Período", needsPeriod: true },
    { key: "mov_produto", label: "Movimentações por Produto", needsPeriod: true },
    { key: "mov_usuario", label: "Movimentações por Usuário", needsPeriod: true },
    { key: "mov_setor", label: "Movimentações por Setor", needsPeriod: true },
    { key: "inventarios", label: "Inventários Realizados", needsPeriod: false },
    { key: "divergencias", label: "Divergências de Inventário", needsPeriod: false },
    { key: "sem_movimentacao", label: "Produtos Sem Movimentação", needsPeriod: true },
    { key: "valor_estoque", label: "Valor Estimado do Estoque", needsPeriod: false },
  ];

  const availableReports = REPORTS.filter((r)=>showMoney || r.key!=="valor_estoque");
  const currentReport = availableReports.find((r) => r.key === reportType);

  const data = useMemo(() => {
    const active = products.filter((p) => p.status === "active");
    const periodMovs = movements.filter((m) => inPeriod(m.date, start, end));

    switch (reportType) {
      case "estoque_atual":
        return active.map((p) => ({ Codigo: p.code, Produto: p.name, Categoria: p.category_name || "—", Unidade: p.unit, Saldo: p.current_balance || 0, Minimo: p.min_stock || 0, ...(showMoney?{Custo:p.unit_cost || 0, ValorTotal:p.inventory_value ?? (p.current_balance || 0)*(p.unit_cost || 0)}:{}), Situacao: getStockStatus(p) }));
      case "abaixo_minimo":
        return active.filter((p) => Number(p.min_stock) > 0 && Number(p.current_balance || 0) < Number(p.min_stock)).map((p) => ({ Codigo: p.code, Produto: p.name, Saldo: p.current_balance || 0, Minimo: p.min_stock || 0, Diferenca: (p.min_stock || 0) - (p.current_balance || 0) }));
      case "sem_estoque":
        return active.filter((p) => getStockStatus(p) === "zerado").map((p) => ({ Codigo: p.code, Produto: p.name, Minimo: p.min_stock || 0, Localizacao: p.location || "—" }));
      case "entradas_periodo":
        return periodMovs.filter((m) => m.type === "entrada").map((m) => ({ Data: formatDateTime(m.date), Produto: m.product_name, Codigo: m.product_code, Quantidade: m.quantity, Documento: m.document || "—", Fornecedor: m.supplier_name || "—", Usuario: m.user_name || "—" }));
      case "saidas_periodo":
        return periodMovs.filter((m) => m.type === "saida").map((m) => ({ Data: formatDateTime(m.date), Produto: m.product_name, Codigo: m.product_code, Quantidade: m.quantity, Setor: m.department || "—", Funcionario: m.employee || "—", Usuario: m.user_name || "—" }));
      case "mov_produto": {
        const map = {};
        periodMovs.forEach((m) => { if (!map[m.product_id]) map[m.product_id] = { Produto: m.product_name, Codigo: m.product_code, Entradas: 0, Saidas: 0, Saldo: 0 }; if (["entrada", "ajuste_positivo"].includes(m.type)) map[m.product_id].Entradas += m.quantity; else map[m.product_id].Saidas += m.quantity; });
        return Object.values(map).map((r) => ({ ...r, Saldo: r.Entradas - r.Saidas }));
      }
      case "mov_usuario": {
        const map = {};
        periodMovs.forEach((m) => { const u = m.user_name || "—"; if (!map[u]) map[u] = { Usuario: u, Total: 0, Entradas: 0, Saidas: 0 }; map[u].Total++; if (m.type === "entrada") map[u].Entradas += m.quantity; else map[u].Saidas += m.quantity; });
        return Object.values(map);
      }
      case "mov_setor": {
        const map = {};
        periodMovs.forEach((m) => { const d = m.department || "—"; if (!map[d]) map[d] = { Setor: d, Total: 0, Saidas: 0 }; map[d].Total++; if (m.type === "saida") map[d].Saidas += m.quantity; });
        return Object.values(map);
      }
      case "inventarios":
        return inventories.map((i) => ({ Codigo: i.code, Status: i.status, Itens: (i.items || []).length, Divergencias: (i.items || []).filter((it) => it.difference !== 0).length, CriadoPor: i.created_by_name || "—", Data: formatDateTime(i.created_date) }));
      case "divergencias":
        return inventories.flatMap((i) => (i.items || []).filter((it) => it.difference !== 0).map((it) => ({ Inventario: i.code, Produto: it.product_name, Esperado: it.expected, Contado: it.counted, Diferenca: it.difference, ...(showMoney?{Valor:it.divergence_value}:{}) })));
      case "sem_movimentacao": {
        const movedIds = new Set(periodMovs.map((m) => m.product_id));
        return active.filter((p) => !movedIds.has(p.id)).map((p) => ({ Codigo: p.code, Produto: p.name, Saldo: p.current_balance || 0, UltimaMov: p.last_movement_date ? formatDateTime(p.last_movement_date) : "Nunca" }));
      }
      case "valor_estoque":
        if(!showMoney)return [];
        return active.map((p) => ({ Codigo: p.code, Produto: p.name, Saldo: p.current_balance || 0, Custo: p.unit_cost || 0, ValorTotal: (p.inventory_value ?? ((p.current_balance || 0) * (p.unit_cost || 0))) }));
      default: return [];
    }
  }, [reportType, products, movements, inventories, start, end, showMoney]);

  const totals = useMemo(() => {
    if (data.length === 0) return null;
    if (showMoney && (reportType === "estoque_atual" || reportType === "valor_estoque")) {
      return { label: "Valor Total", value: formatCurrency(data.reduce((s, r) => s + (r.ValorTotal || 0), 0)) };
    }
    if (reportType === "entradas_periodo" || reportType === "saidas_periodo") {
      return { label: "Total Quantidade", value: formatNumber(data.reduce((s, r) => s + (r.Quantidade || 0), 0)) };
    }
    return { label: "Total de Registros", value: formatNumber(data.length) };
  }, [data, reportType, showMoney]);

  const handleExportCSV = () => {
    if (data.length === 0) { toast.error("Sem dados para exportar."); return; }
    exportToCSV(`relatorio_${reportType}.csv`, data);
  };

  const handleExportPdf = async () => {
    if (data.length === 0) { toast.error("Sem dados para exportar."); return; }
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const { exportStockReportPdf } = await import("@/lib/stockReportPdf");
      let unitLabel = "Unidade não identificada";
      const warehouseId = selectedWarehouse();
      if (warehouseId === "all") {
        unitLabel = "Todas as unidades (visão geral)";
      } else {
        try {
          const units = await api("org/units", {warehouse:false});
          const currentUnit = units.find(u => String(u.warehouse_id) === String(warehouseId)) || (!warehouseId ? units[0] : null);
          if (currentUnit) unitLabel = `${currentUnit.kind === "sede" ? "Sede" : "Obra"} - ${currentUnit.name}`;
        } catch {
          // A falha na consulta descritiva da unidade não bloqueia o PDF.
        }
      }
      const periodLabel = currentReport?.needsPeriod
        ? `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`
        : "Posição atual";
      await exportStockReportPdf({
        rows: data,
        title: currentReport?.label || "Relatório de Estoque",
        unitLabel,
        periodLabel,
        generatedBy: user?.display_name || user?.full_name || user?.username || "Usuário autenticado",
        summaryLabel: totals?.label || "Registros",
        summaryValue: totals?.value || String(data.length),
        reportKey: reportType,
      });
      toast.success("PDF gerado com sucesso.");
    } catch (e) {
      console.error("Erro ao gerar PDF de estoque:", e);
      toast.error(e?.message || "Não foi possível gerar o PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Relatórios"
        subtitle="Gere relatórios detalhados do estoque"
        icon={FileBarChart}
        actions={
          <>
            <button onClick={handleExportPdf} disabled={exportingPdf || data.length === 0} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> {exportingPdf ? "Gerando PDF..." : "Gerar PDF"}
            </button>
            <button onClick={handleExportCSV} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> CSV
            </button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo de Relatório</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">
              {availableReports.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          {currentReport?.needsPeriod && (
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Período</label>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                  <option value="mes">Este mês</option>
                  <option value="periodo">Personalizado</option>
                </select>
                {period === "periodo" && (
                  <>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">{currentReport?.label}</h2>
            <p className="text-xs text-slate-500">Gerado em {formatDateTime(new Date().toISOString())} por {user?.full_name || user?.email || "—"}</p>
          </div>
          {totals && (
            <div className="text-right">
              <div className="text-xs text-slate-500">{totals.label}</div>
              <div className="text-lg font-bold text-slate-800">{totals.value}</div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                {columns.map((c) => <th key={c} className="text-left px-4 py-2.5">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={columns.length || 1} className="px-4 py-10 text-center text-slate-400">Sem dados para este relatório.</td></tr>
              ) : data.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {columns.map((c) => {
                    const v = row[c];
                    const isNum = typeof v === "number";
                    return <td key={c} className={`px-4 py-2.5 ${isNum ? "text-right" : "text-left"} ${c === "ValorTotal" || c === "Custo" || c === "Valor" ? "font-medium" : ""}`}>{isNum ? formatNumber(v) : v}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 100 && (
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 text-center">
            Mostrando 100 de {data.length} registros. O PDF e o CSV incluem todos os registros carregados no relatório.
          </div>
        )}
      </div>
    </div>
  );
}