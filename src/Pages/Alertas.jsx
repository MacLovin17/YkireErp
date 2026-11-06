import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StockBadge from '@/components/StockBadge';
import { AlertTriangle, Package, MapPin, Truck, Clock } from 'lucide-react';
import {
  getStockStatus,
  formatNumber,
  formatDateTime,
  formatDate,
} from '@/lib/estoque';

export default function Alertas() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('abaixo');

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list(null, 2000),
      base44.entities.Movement.list('-date', 2000),
      base44.entities.Inventory.list('-created_date', 500),
    ]).then(([p, m, i]) => {
      setProducts(p);
      setMovements(m);
      setInventories(i);
      setLoading(false);
    });
  }, []);

  const alerts = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    const lastMovMap = {};
    movements.forEach((m) => {
      if (
        !lastMovMap[m.product_id] ||
        new Date(m.date) > new Date(lastMovMap[m.product_id])
      )
        lastMovMap[m.product_id] = m.date;
    });

    const abaixo = active.filter((p) => getStockStatus(p) === 'baixo');
    const zerado = active.filter((p) => getStockStatus(p) === 'zerado');
    const acima = active.filter((p) => getStockStatus(p) === 'acima');
    const semMov = active.filter((p) => {
      const last = lastMovMap[p.id];
      if (!last) return true;
      const days = (Date.now() - new Date(last).getTime()) / 86400000;
      return days > 30;
    });
    const inativoComSaldo = products.filter(
      (p) => p.status === 'inactive' && (p.current_balance || 0) > 0,
    );
    const semLoc = active.filter((p) => !p.location);
    const semForn = active.filter((p) => !p.supplier_id);
    const invPend = inventories.filter(
      (i) => i.status === 'aguardando_aprovacao',
    );

    return {
      abaixo,
      zerado,
      acima,
      semMov,
      inativoComSaldo,
      semLoc,
      semForn,
      invPend,
    };
  }, [products, movements, inventories]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    {
      key: 'abaixo',
      label: 'Abaixo do Mínimo',
      count: alerts.abaixo.length,
      icon: AlertTriangle,
      color: 'amber',
    },
    {
      key: 'zerado',
      label: 'Sem Estoque',
      count: alerts.zerado.length,
      icon: Package,
      color: 'rose',
    },
    {
      key: 'acima',
      label: 'Acima do Máximo',
      count: alerts.acima.length,
      icon: Package,
      color: 'blue',
    },
    {
      key: 'semMov',
      label: 'Sem Movimentação',
      count: alerts.semMov.length,
      icon: Clock,
      color: 'slate',
    },
    {
      key: 'inativoComSaldo',
      label: 'Inativo c/ Saldo',
      count: alerts.inativoComSaldo.length,
      icon: Package,
      color: 'slate',
    },
    {
      key: 'semLoc',
      label: 'Sem Localização',
      count: alerts.semLoc.length,
      icon: MapPin,
      color: 'amber',
    },
    {
      key: 'semForn',
      label: 'Sem Fornecedor',
      count: alerts.semForn.length,
      icon: Truck,
      color: 'amber',
    },
    {
      key: 'invPend',
      label: 'Inv. Pendentes',
      count: alerts.invPend.length,
      icon: AlertTriangle,
      color: 'purple',
    },
  ];

  const current = tabs.find((t) => t.key === tab);
  const list = alerts[tab] || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Alertas e Produtos Críticos"
        subtitle="Monitoramento de situações que exigem atenção"
        icon={AlertTriangle}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-left p-3 rounded-xl border transition-colors ${tab === t.key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between">
              <t.icon
                className={`w-4 h-4 ${tab === t.key ? 'text-indigo-600' : 'text-slate-400'}`}
              />
              <span
                className={`text-lg font-bold ${t.count > 0 ? 'text-slate-800' : 'text-slate-300'}`}
              >
                {t.count}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              {t.label}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{current.label}</h2>
        </div>
        {tab === 'invPend' ? (
          <div className="p-4">
            {list.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                Nenhum inventário pendente.
              </div>
            ) : (
              list.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-slate-800">{inv.code}</div>
                    <div className="text-xs text-slate-500">
                      {(inv.items || []).length} itens •{' '}
                      {formatDateTime(inv.created_date)}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Aguardando aprovação
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5">Código</th>
                  <th className="text-left px-4 py-2.5">Produto</th>
                  <th className="text-right px-4 py-2.5">Atual</th>
                  <th className="text-right px-4 py-2.5">Mínimo</th>
                  <th className="text-left px-4 py-2.5">Localização</th>
                  <th className="text-left px-4 py-2.5">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Nenhum item nesta categoria. Tudo certo!
                    </td>
                  </tr>
                ) : (
                  list.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {p.code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {p.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatNumber(p.current_balance)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {formatNumber(p.min_stock)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {p.location || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StockBadge product={p} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
