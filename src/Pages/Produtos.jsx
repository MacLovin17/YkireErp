import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader, { SearchInput } from "@/components/PageHeader";
import StockBadge from "@/components/StockBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { Package, Plus, Download, Pencil, Power } from "lucide-react";
import { getStockStatus, formatNumber, formatCurrency, exportToCSV } from "@/lib/estoque";
import { useAuth } from "@/lib/AuthContext";
import { canEdit, canViewFinancial } from "@/lib/permissions";

export default function Produtos() {
  const { user } = useAuth();
  const userCanEdit = canEdit(user?.role);
  const showMoney = canViewFinancial(user?.role);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSituation, setFilterSituation] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmInactivate, setConfirmInactivate] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Product.list(null, 2000),
      base44.entities.Category.list(null, 500),
      base44.entities.Supplier.list(null, 500),
    ]).then(([p, c, s]) => {
      setProducts(p);
      setCategories(c);
      setSuppliers(s);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = products;
    const q = search.toLowerCase().trim();
    if (q) r = r.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      false
    );
    if (filterCategory) r = r.filter((p) => p.category_id === filterCategory);
    if (filterSupplier) r = r.filter((p) => p.supplier_id === filterSupplier);
    if (filterStatus) r = r.filter((p) => p.status === filterStatus);
    if (filterSituation) r = r.filter((p) => getStockStatus(p) === filterSituation);
    r = [...r].sort((a, b) => {
      let va = a[sortBy] ?? "", vb = b[sortBy] ?? "";
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return r;
  }, [products, search, filterCategory, filterSupplier, filterStatus, filterSituation, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const handleExport = () => {
    exportToCSV("produtos.csv", filtered.map((p) => ({
      Codigo: p.code, Nome: p.name, Categoria: p.category_name || "",
      Unidade: p.unit, Fornecedor: p.supplier_name || "", Localizacao: p.location || "", Prateleira: p.shelf || "",
      EstoqueAtual: p.current_balance || 0, Minimo: p.min_stock || 0, Maximo: p.max_stock || "",
      ...(showMoney ? { Custo: p.unit_cost || 0 } : {}), Status: p.status, Situacao: getStockStatus(p),
    })));
  };

  const handleInactivate = async (p) => {
    await base44.entities.Product.update(p.id, { status: "inactive" });
    load();
  };

  const activeCategories = categories.filter((c) => c.status === "active");
  const activeSuppliers = suppliers.filter((s) => s.status === "active");

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Produtos"
        subtitle={`${filtered.length} produto(s) encontrado(s)`}
        icon={Package}
        actions={
          <>
            <button onClick={handleExport} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> CSV
            </button>
            {userCanEdit && (
              <button onClick={() => { setEditing(null); setFormOpen(true); }} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Novo Produto
              </button>
            )}
          </>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Código ou nome..." />
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="">Todas categorias</option>
          {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterSupplier} onChange={(e) => { setFilterSupplier(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="">Todos fornecedores</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="">Todos status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
        <select value={filterSituation} onChange={(e) => { setFilterSituation(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
          <option value="">Toda situação</option>
          <option value="normal">Normal</option>
          <option value="baixo">Baixo</option>
          <option value="zerado">Zerado</option>
          <option value="acima">Acima do máx.</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <Th label="Código" col="code" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Th label="Nome" col="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Th label="Categoria" col="category_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Th label="Unidade" col="unit" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-right px-4 py-2.5 cursor-pointer select-none" onClick={() => handleSort("current_balance")}>Atual {sortBy === "current_balance" && (sortDir === "asc" ? "↑" : "↓")}</th>
                <th className="text-right px-4 py-2.5">Mínimo</th>
                {showMoney && <th className="text-right px-4 py-2.5">Custo</th>}
                <th className="text-left px-4 py-2.5">Situação</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 ? (
                <tr><td colSpan={showMoney ? 9 : 8} className="px-4 py-10 text-center text-slate-400">Nenhum produto encontrado.</td></tr>
              ) : pageData.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.category_name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.unit}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatNumber(p.current_balance)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{formatNumber(p.min_stock)}</td>
                  {showMoney && <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(p.unit_cost)}</td>}
                  <td className="px-4 py-2.5"><StockBadge product={p} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {userCanEdit ? (
                        <>
                          <button onClick={() => { setEditing(p); setFormOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {p.status === "active" && (
                            <button onClick={() => setConfirmInactivate(p)} className="p-1.5 rounded hover:bg-rose-50 text-rose-500" title="Inativar">
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
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

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={activeCategories}
        suppliers={activeSuppliers}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirmInactivate}
        onOpenChange={(o) => !o && setConfirmInactivate(null)}
        onConfirm={() => handleInactivate(confirmInactivate)}
        title="Inativar Produto"
        message={`Deseja inativar "${confirmInactivate?.name}"? O produto não aparecerá em novas entradas/saídas, mas o histórico é preservado.`}
        confirmLabel="Inativar"
        destructive
      />
    </div>
  );
}

function Th({ label, col, sortBy, sortDir, onSort }) {
  return (
    <th className="text-left px-4 py-2.5 cursor-pointer select-none" onClick={() => onSort(col)}>
      {label} {sortBy === col && (sortDir === "asc" ? "↑" : "↓")}
    </th>
  );
}