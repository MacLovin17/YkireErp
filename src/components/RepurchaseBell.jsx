import React,{useCallback,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Bell} from 'lucide-react';
import {api} from '@/api/http';
import {useAuth} from '@/lib/AuthContext';
import {moduleEnabled} from '@/lib/modules';
const dateBR=(value)=>value?value.slice(0,10).split('-').reverse().join('/'):'—';
export default function RepurchaseBell(){
 const {user}=useAuth();const loc=useLocation();const allowed=moduleEnabled(user,'vendas');
 const [alerts,setAlerts]=useState([]);const [count,setCount]=useState(0);const [open,setOpen]=useState(false);
 const [error,setError]=useState('');
 const update=useCallback(()=>{if(!allowed)return;api('sales/repurchases/alerts').then(r=>{setAlerts(r.alerts||[]);setCount(r.summary?.alerts||0);setError('');}).catch(e=>setError(e.message));},[allowed]);
 useEffect(()=>{update();},[update,loc.pathname]);
 useEffect(()=>{if(!allowed)return;const interval=setInterval(update,120000);return()=>clearInterval(interval);},[allowed,update]);
 if(!allowed)return null;
 return <div className="relative"><button type="button" title="Alertas de recompra" aria-label={`Recompras: ${count} alerta(s)`} aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(!open)update();}} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Bell className="h-5 w-5"/>{count>0&&<span className="absolute -top-1 -right-1 rounded-full bg-rose-600 text-white text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center">{count>99?'99+':count}</span>}</button>{open&&<div className="absolute right-0 mt-2 w-[min(350px,90vw)] rounded-xl border bg-white shadow-2xl z-50 overflow-hidden"><div className="p-3 border-b font-semibold text-sm">Recompras pendentes ({count})</div><div className="max-h-72 overflow-y-auto">{error?<p className="p-4 text-xs text-rose-600">{error}</p>:alerts.length?alerts.slice(0,5).map(r=><div className="px-3 py-3 border-b last:border-none text-sm" key={r.id}><strong className="block text-slate-800">{r.customer_name}</strong><span className="text-slate-600 text-xs">{r.product_name} · Previsão {dateBR(r.next_due)}</span></div>):<p className="p-4 text-sm text-slate-500">Nenhuma recompra precisa de aviso agora.</p>}</div><Link to="/vendas/recompras" onClick={()=>setOpen(false)} className="block p-3 text-center font-semibold text-indigo-700 text-sm bg-indigo-50">Abrir agenda de recompras</Link></div>}</div>;
}
