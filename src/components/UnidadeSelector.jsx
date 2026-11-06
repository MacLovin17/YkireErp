import React, { useEffect, useState } from 'react';
import { api, selectedWarehouse, setSelectedWarehouse } from '@/api/http';
import { MapPin } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
export default function UnidadeSelector() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('org/units', { warehouse: false })
      .then((rows) => {
        setUnits(rows);
        if (rows.length && !selectedWarehouse())
          setSelectedWarehouse(rows[0].warehouse_id);
        else if (
          rows.length &&
          selectedWarehouse() !== 'all' &&
          !rows.some((x) => x.warehouse_id === selectedWarehouse())
        ) {
          setSelectedWarehouse(rows[0].warehouse_id);
          window.location.reload();
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <MapPin className="w-4 h-4 text-indigo-600" />
      <label htmlFor="ykire-unit" className="font-semibold text-slate-700">
        Unidade / almoxarifado
      </label>
      <select
        id="ykire-unit"
        aria-label="Selecionar almoxarifado"
        value={selectedWarehouse() || units[0]?.warehouse_id || ''}
        onChange={(e) => {
          setSelectedWarehouse(e.target.value);
          location.reload();
        }}
        className="min-w-[210px] max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800"
      >
        {units.map((u) => (
          <option value={u.warehouse_id} key={u.id}>
            {u.kind === 'sede' ? 'Sede' : 'Obra'} · {u.name}
          </option>
        ))}
        {user?.role === 'master' && units.length > 0 && (
          <option value="all">Todas as unidades (visão geral)</option>
        )}
      </select>
      <span className="text-xs text-slate-500">
        Saldos separados por almoxarifado
      </span>
      {error && <span className="text-rose-600">{error}</span>}
    </div>
  );
}
