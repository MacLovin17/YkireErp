import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Warehouse } from 'lucide-react';
import { api, selectedWarehouse } from '@/api/http';
import { registrarTransferencia } from '@/lib/estoqueOperations';
import PageHeader from '@/components/PageHeader';
import ProductPicker from '@/components/ProductPicker';
import { formatNumber } from '@/lib/estoque';
const field =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white';
export default function Transferencias() {
  const [units, setUnits] = useState([]),
    [product, setProduct] = useState(null),
    [target, setTarget] = useState(''),
    [amount, setAmount] = useState(''),
    [notes, setNotes] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api('org/units', { warehouse: false })
      .then(setUnits)
      .catch((e) => setError(e.message));
  }, []);
  const origin = units.find((u) => u.warehouse_id === selectedWarehouse());
  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!product || !target) return setError('Selecione produto e destino.');
    setBusy(true);
    try {
      const r = await registrarTransferencia({
        product_id: product.id,
        quantity: Number(amount),
        destination_warehouse_id: target,
        notes,
      });
      setMessage(
        `Transferência registrada. Saldo na origem: ${formatNumber(r.out.new_balance)} ${product.unit}. Identificação ${r.transfer_ref}.`,
      );
      setAmount('');
      setNotes('');
      setProduct(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Transferências entre Almoxarifados"
        subtitle="Movimente produtos entre a sede e as obras sem registrar consumo"
        icon={ArrowLeftRight}
      />
      {selectedWarehouse() === 'all' && (
        <div className="mb-4 border rounded-xl bg-amber-50 p-4 text-amber-800 text-sm">
          Selecione um almoxarifado específico acima para transferir.
        </div>
      )}
      {error && (
        <div className="mb-4 border border-rose-200 rounded-xl bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 border border-emerald-200 rounded-xl bg-emerald-50 p-3 text-emerald-700 text-sm">
          {message}
        </div>
      )}
      <form
        onSubmit={submit}
        className="bg-white border rounded-xl p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Origem</div>
            <div className="flex gap-2 items-center text-sm font-semibold">
              <Warehouse className="w-4 h-4" />
              {origin?.name || 'Escolha uma unidade'}
            </div>
          </div>
          <ArrowRight className="hidden sm:block text-indigo-500" />
          <div>
            <label
              htmlFor="dest"
              className="text-xs font-semibold text-slate-600"
            >
              Destino *
            </label>
            <select
              className={field}
              id="dest"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {units
                .filter(
                  (u) =>
                    u.warehouse_id !== selectedWarehouse() &&
                    u.status === 'active',
                )
                .map((u) => (
                  <option key={u.id} value={u.warehouse_id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Produto *
          </label>
          <ProductPicker value={product} onChange={setProduct} />
        </div>
        <div>
          <label
            htmlFor="qty"
            className="block text-xs font-semibold text-slate-600 mb-2"
          >
            Quantidade *
          </label>
          <input
            id="qty"
            type="number"
            step="0.001"
            min="0.001"
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          {product && (
            <div className="text-sm mt-2 text-slate-500">
              Disponível na origem:{' '}
              <strong>
                {formatNumber(product.current_balance)} {product.unit}
              </strong>
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-semibold text-slate-600 mb-2"
          >
            Observação / documento
          </label>
          <textarea
            id="notes"
            rows="3"
            className={field}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button
          disabled={busy || selectedWarehouse() === 'all'}
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 font-medium text-sm disabled:opacity-50"
        >
          {busy ? 'Transferindo...' : 'Confirmar transferência'}
        </button>
        <p className="text-xs text-slate-500">
          Saída e entrada são registradas juntas, com saldos próprios e o mesmo
          identificador de transferência.
        </p>
      </form>
    </div>
  );
}
