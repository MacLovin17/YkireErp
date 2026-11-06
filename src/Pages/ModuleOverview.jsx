import React, {useEffect,useState} from 'react';
import CompanyLogo from '@/components/CompanyLogo';
import { Link } from 'react-router-dom';
import { MODULES } from '@/lib/modules';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/http';
import { ArrowUpRight, CheckCircle2, Building2 } from 'lucide-react';
export default function ModuleOverview({module}){
 const m=MODULES.find(x=>x.key===module);
 const {user}=useAuth();
 const [stat,setStat]=useState(null);
 useEffect(()=>{
 let active=true;
 const route=module==='rh'?'employees':module==='ssma'?'epi/deliveries':module==='adm'?'org/units':module==='frotas'?'fleet/vehicles':null;
 if(route)api(route,{warehouse:module==='adm'?false:undefined}).then(items=>{if(active)setStat(Array.isArray(items)?items.length:null);}).catch(()=>{});
 return ()=>{active=false;};
 },[module]);
 const Icon=m.icon;
 const links=m.links.filter(l=>!(module==='adm'&&l.to==='/adm/usuarios'&&user?.role!=='master')&&!(module==='adm'&&l.to==='/adm/unidades'&&user?.role!=='master')&&!(module==='ssma'&&l.to==='/ssma/aso'&&!['master','admin'].includes(user?.role))&&!(module==='ssma'&&l.to==='/ssma/certificados'&&user?.company_code&&user?.company_code!=='PRO001'));
 return <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-7">
  <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 sm:p-10 text-white">
   <div className={`absolute right-0 -top-20 w-80 h-80 rounded-full bg-gradient-to-br ${m.gradient} opacity-25 blur-3xl`}/>
   <div className="relative"><div className="flex items-center gap-3"><CompanyLogo user={user} className="h-14 w-28 sm:w-36"/><div className="min-w-0"><p className="text-white text-sm font-semibold truncate max-w-[275px]">{user?.company_name || 'Empresa'}</p><span className="text-indigo-200 text-xs font-semibold tracking-[.15em] uppercase">{m.short}</span></div></div><h1 className="text-3xl sm:text-4xl font-bold mt-4">{m.title}</h1><p className="text-slate-300 mt-3 max-w-lg">{m.description}. Suas atividades em um só lugar, com acesso por obra e rastreabilidade.</p></div>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-white border border-slate-200 rounded-2xl p-5"><Icon className="w-5 h-5 text-indigo-600"/><div className="text-xs text-slate-500 mt-4">Módulo</div><div className="text-2xl font-bold mt-1">{m.short}</div></div>
    <div className="bg-white border border-slate-200 rounded-2xl p-5"><CheckCircle2 className="w-5 h-5 text-emerald-600"/><div className="text-xs text-slate-500 mt-4">Acesso</div><div className="text-2xl font-bold mt-1">Autorizado</div></div>
    <div className="bg-white border border-slate-200 rounded-2xl p-5"><Building2 className="w-5 h-5 text-sky-600"/><div className="text-xs text-slate-500 mt-4">{module==='rh'?'Funcionários cadastrados':module==='ssma'?'Entregas de EPI':module==='frotas'?'Veículos cadastrados':'Unidades disponíveis'}</div><div className="text-2xl font-bold mt-1">{stat===null?'—':stat}</div></div>
  </div>
  <div><h2 className="text-lg font-bold mb-4">Acesso rápido</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{links.filter(l=>l.to!==m.path).map(l=><Link key={l.to} to={l.to} className="flex items-center justify-between bg-white border rounded-xl px-5 py-5 hover:border-indigo-300 hover:shadow-sm transition"><span className="font-medium text-slate-800">{l.label}</span><ArrowUpRight className="w-4 h-4 text-indigo-600"/></Link>)}</div></div>
  <p className="text-xs text-slate-500">Os dados exibidos dependem das permissões do perfil e das obras liberadas para seu usuário.</p>
 </div>;
}
