import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

// Seletor de produto por código interno automático ou nome.
// onlyActive: se true, só mostra produtos ativos.
export default function ProductPicker({
  value,
  onChange,
  onlyActive = true,
  placeholder = 'Buscar produto por código ou nome...',
}) {
  const [search, setSearch] = useState('');
  const [results, setResult] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setResult([]);
      return;
    }
    let active = true;
    setLoading(true);
    base44.entities.Product.list(null, 1000)
      .then((products) => {
        if (!active) return;
        const q = search.toLowerCase();
        const filtered = products
          .filter((p) => (onlyActive ? p.status === 'active' : true))
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(q) ||
              p.code?.toLowerCase().includes(q) ||
              false,
          )
          .slice(0, 10);
        setResult(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [search, onlyActive]);

  const selected = value;

  return (
    <div className="relative" ref={ref}>
      {selected ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">
              {selected.code} — {selected.name}
            </div>
            <div className="text-xs text-slate-500">
              Saldo atual:{' '}
              <span className="font-semibold">
                {selected.current_balance || 0} {selected.unit}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearch('');
            }}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="pl-9"
            />
          </div>
          {open && search.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-400">
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-400">
                  Nenhum produto encontrado.
                </div>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <div className="text-sm font-medium text-slate-800">
                      {p.code} — {p.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Saldo: {p.current_balance || 0} {p.unit}{' '}
                      {p.category_name ? `• ${p.category_name}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
