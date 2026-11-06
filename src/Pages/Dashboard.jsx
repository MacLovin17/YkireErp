import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StockBadge from "@/components/StockBadge";
import { LayoutDashboard, TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, ArrowRight } from "lucide-react";
import {
  getStockStatus, formatCurrency, formatNumber, formatDateTime,
  getPeriodRange, inPeriod, MOVEMENT_TYPES,
} from "@/lib/estoque";
import { Link } from "react-router-dom";
import {ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid} from "recharts";

import { useAuth } from '@/lib/AuthContext';
import { canViewFinancial } from '@/lib/permissions';
export default function Dashboard() {
  const {user}=useAuth();
  const showMoney = canViewFinancial(user?.role);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30dias");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list(null, 2000),
      base44.entities.Movement.list("-date", 2000),
    ]).then(([p, m]) => {
      setProducts(p);
      setMovements(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { start, end } = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active");
    const totalQty = active.reduce((s, p) => s + (p.current_balance || 0), 0);
    const totalValue = active.reduce((s, p) => s + (p.inventory_value ?? ((p.current_balance || 0) * (p.unit_cost || 0))), 0);
    const belowMin = active.filter((p) => getStockStatus(p) === "baixo");
    const zero = active.filter((p) => getStockStatus(p) === "zerado");

    const periodMovs = movements.filter((m) => inPeriod(m.date, start, end));
    const entradas = periodMovs.filter((m) => m.type === "entrada");
    const saidas = periodMovs.filter((m) => m.type === "saida");
    const entradaQty = entradas.reduce((s, m) => s + m.quantity, 0);
    const saidaQty = saidas.reduce((s, m) => s + m.quantity, 0);

    return { activeCount: active.length, totalQty, totalValue, belowMin, zero, entradas, saidas, entradaQty, saidaQty };
  }, [products, movements, start, end]);

  const chartData = useMemo(() => {
    const days = new Map();
    for(const m of movements.filter(v=>inPeriod(v.date,start,end))){
      if(!['entrada','saida'].includes(m.type))continue;
      const day = String(m.date).slice(0,10);
      const row = days.get(day) || {day,entradas:0,saidas:0};
      const value = (Number(m.quantity)||0)*(Number(m.unit_cost)||0);
      if(m.type==='entrada')row.entradas += value;else row.saidas += value;
      days.set(day,row);
    }
    return Array.from(days.values()).sort((a,b)=>a.day.localeCompare(b.day)).slice(-30).map(r=>({...r,dia:r.day.slice(5)}));
  }, [movements,start,end]);

  const recentMovements = useMemo(() => movements.slice(0, 8), [movements]);

  const topProducts = useMemo(() => {
    const counts = {};
    movements
      .filter((m) => inPeriod(m.date, start, end))
      .forEach((m) => {
        if (!counts[m.product_id]) counts[m.product_id] = { name: m.product_name, code: m.product_code, qty: 0 };
        counts[m.product_id].qty += m.quantity;
      });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [movements, start, end]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard do Estoque"
        subtitle="Visão geral do almoxarifado"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
              <option value="periodo">Período personalizado</option>
            </select>
            {period === "periodo" && (
              <>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Package} label="Produtos Ativos" value={formatNumber(stats.activeCount)} color="indigo" />
        <KpiCard icon={TrendingUp} label="Qtd. Total em Estoque" value={formatNumber(stats.totalQty)} color="slate" />
        {showMoney && <KpiCard icon={DollarSign} label="Valor Estimado" value={formatCurrency(stats.totalValue)} color="emerald" />}
        <KpiCard icon={AlertTriangle} label="Abaixo do Mínimo" value={formatNumber(stats.belowMin.length)} color="amber" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={TrendingUp} label="Entradas (período)" value={formatNumber(stats.entradaQty)} sub={`${stats.entradas.length} mov.`} color="emerald" />
        <KpiCard icon={TrendingDown} label="Saídas (período)" value={formatNumber(stats.saidaQty)} sub={`${stats.saidas.length} mov.`} color="rose" />
        <KpiCard icon={AlertTriangle} label="Sem Estoque" value={formatNumber(stats.zero.length)} color="rose" />
        <Link to="/estoque/alertas" className="block">
          <KpiCard icon={AlertTriangle} label="Ver Alertas" value="→" sub="produtos críticos" color="amber" />
        </Link>
      </div>

      {showMoney && <section className="bg-white rounded-xl border border-slate-200 p-5 mb-6" aria-label="Gráfico financeiro das movimentações">
        <h2 className="font-semibold text-slate-800">Movimentações por dia — valor estimado</h2>
        <p className="text-xs text-slate-500 mb-4">Entradas e saídas do período selecionado, valorizadas pelo custo unitário registrado. Não inclui transferências internas.</p>
        {chartData.length ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{top:8,right:16,bottom:0,left:8}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="dia" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v=>`R$${Math.round(v)}`}/>
            <Tooltip formatter={v=>formatCurrency(v)} labelFormatter={(_,payload)=>payload?.[0]?.payload?.day||''}/>
            <Legend />
            <Bar name="Entradas" dataKey="entradas" fill="#059669" radius={[3,3,0,0]}/>
            <Bar name="Saídas" dataKey="saidas" fill="#e11d48" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer></div> : <p className="py-12 text-center text-slate-400 text-sm">Nenhuma entrada ou saída no período.</p>}
      </section>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas movimentações */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Últimas Movimentações</h2>
            <Link to="/estoque/historico" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMovements.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma movimentação registrada.</div>
            ) : (
              recentMovements.map((m) => {
                const t = MOVEMENT_TYPES[m.type] || { label: m.type, color: "text-slate-600", dot: "bg-slate-400" };
                const isEntrada = ["entrada", "ajuste_positivo", "inventario", "transferencia_entrada"].includes(m.type);
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.product_name}</div>
                      <div className="text-xs text-slate-500">{t.label} • {formatDateTime(m.date)}</div>
                    </div>
                    <div className={`text-sm font-semibold ${isEntrada ? "text-emerald-600" : "text-rose-600"}`}>
                      {isEntrada ? "+" : "−"}{formatNumber(m.quantity)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Produtos mais movimentados */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Produtos Mais Movimentados</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topProducts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Sem movimentações no período.</div>
            ) : (
              topProducts.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.code}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{formatNumber(p.qty)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Produtos abaixo do mínimo */}
      {stats.belowMin.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Produtos Abaixo do Estoque Mínimo</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2">Código</th>
                  <th className="text-left px-5 py-2">Produto</th>
                  <th className="text-right px-5 py-2">Atual</th>
                  <th className="text-right px-5 py-2">Mínimo</th>
                  <th className="text-left px-5 py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.belowMin.slice(0, 8).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-mono text-xs">{p.code}</td>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-amber-600">{formatNumber(p.current_balance)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{formatNumber(p.min_stock)}</td>
                    <td className="px-5 py-2.5"><StockBadge product={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}