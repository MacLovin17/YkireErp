import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ProductPicker from "@/components/ProductPicker";
import { ArrowDownToLine, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ENTRY_TYPES, formatNumber } from "@/lib/estoque";
import { registrarEntrada } from "@/lib/estoqueOperations";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { canViewFinancial } from "@/lib/permissions";

export default function Entrada() {
  const [suppliers, setSuppliers] = useState([]);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    quantity: "", date: new Date().toISOString().slice(0, 16),
    entry_type: "compra", document: "", supplier_id: "", unit_cost: "", notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const showMoney = canViewFinancial(user?.role);

  useEffect(() => {
    base44.entities.Supplier.list(null, 500).then(setSuppliers);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!product) return setError("Selecione um produto.");
    if (!form.quantity || Number(form.quantity) <= 0) return setError("Quantidade deve ser maior que zero.");

    setSaving(true);
    try {
      const sup = suppliers.find((s) => s.id === form.supplier_id);
      const result = await registrarEntrada({
        product_id: product.id,
        quantity: Number(form.quantity),
        date: new Date(form.date).toISOString(),
        entry_type: form.entry_type,
        document: form.document,
        supplier_id: form.supplier_id,
        supplier_name: sup?.company_name,
        ...(showMoney ? { unit_cost: form.unit_cost !== "" ? Number(form.unit_cost) : null } : {}),
        notes: form.notes,
        user,
      });
      toast.success(`Entrada registrada! Novo saldo: ${formatNumber(result.new_balance)} ${product.unit}`);
      setProduct(null);
      setForm({ quantity: "", date: new Date().toISOString().slice(0, 16), entry_type: "compra", document: "", supplier_id: "", unit_cost: "", notes: "" });
    } catch (e) {
      setError(e.message || "Erro ao registrar entrada.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Entrada de Estoque" subtitle="Registre a entrada de produtos no almoxarifado" icon={ArrowDownToLine} />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Produto *</Label>
            <ProductPicker value={product} onChange={setProduct} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Quantidade *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Data *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo de Entrada</Label>
              <select value={form.entry_type} onChange={(e) => set("entry_type", e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">
                {ENTRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Documento / Nota Fiscal</Label>
              <Input value={form.document} onChange={(e) => set("document", e.target.value)} placeholder="NF-e, pedido..." />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Fornecedor</Label>
              <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">
                <option value="">Selecione...</option>
                {suppliers.filter((s) => s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            {showMoney && <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Custo Unitário (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} placeholder={product ? String(product.unit_cost || 0) : "0,00"} />
            </div>}
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Observação</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          {product && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <span className="text-slate-500">Saldo atual: </span>
              <span className="font-semibold text-slate-800">{formatNumber(product.current_balance)} {product.unit}</span>
              {form.quantity && Number(form.quantity) > 0 && (
                <>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-slate-500">Novo saldo: </span>
                  <span className="font-semibold text-emerald-600">{formatNumber((product.current_balance || 0) + Number(form.quantity))} {product.unit}</span>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setProduct(null); setError(""); }}>Limpar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}