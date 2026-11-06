import CompanyLogo from '@/components/CompanyLogo';
import React,{useState} from 'react';
import {Link, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import {MODULES} from '@/lib/modules';
import {ROLE_LABELS} from '@/lib/permissions';
import {Layers3, Menu, X, LogOut, ArrowLeft, ChevronDown, Boxes, LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, Wrench, ArrowLeftRight, ClipboardList, History, SlidersHorizontal, Tags, Truck, AlertTriangle, FileBarChart, UsersRound, UserRound, HardHat, Users, Building2, ShieldCheck, Settings2, Award, Building, BriefcaseBusiness, BookOpenCheck, HeartPulse, FileText, ShoppingCart, Receipt, Contact, BadgeDollarSign,Bell} from 'lucide-react';
import UnidadeSelector from '@/components/UnidadeSelector';
import RepurchaseBell from '@/components/RepurchaseBell';
const menu={
  rh:[{to:'/rh',label:'Visão geral',icon:LayoutDashboard,end:true},{to:'/rh/funcionarios',label:'Funcionários',icon:UsersRound},{to:'/rh/funcoes',label:'Funções',icon:BriefcaseBusiness,admin:true},{to:'/rh/departamentos',label:'Departamentos',icon:BookOpenCheck,admin:true},{to:'/rh/empresas',label:'Empresas (CNPJs)',icon:Building2,admin:true}],
  estoque:[{to:'/estoque',label:'Dashboard',icon:LayoutDashboard,end:true},{to:'/estoque/produtos',label:'Produtos',icon:Package},{to:'/estoque/entrada',label:'Entrada',icon:ArrowDownToLine},{to:'/estoque/saida',label:'Saída',icon:ArrowUpFromLine},{to:'/estoque/ferramentas',label:'Ferramentas',icon:Wrench},{to:'/estoque/transferencias',label:'Transferências',icon:ArrowLeftRight,admin:true},{to:'/estoque/inventario',label:'Inventário',icon:ClipboardList},{to:'/estoque/ajustes',label:'Ajustes',icon:SlidersHorizontal,admin:true},{to:'/estoque/historico',label:'Histórico',icon:History,admin:true},{to:'/estoque/categorias',label:'Categorias',icon:Tags,admin:true},{to:'/estoque/fornecedores',label:'Fornecedores',icon:Truck},{to:'/estoque/alertas',label:'Alertas',icon:AlertTriangle,admin:true},{to:'/estoque/relatorios',label:'Relatórios',icon:FileBarChart,admin:true}],
  ssma:[{to:'/ssma',label:'Visão geral',icon:LayoutDashboard,end:true},{to:'/ssma/epi',label:'Controle de EPI',icon:HardHat},{to:'/ssma/certificados',label:'Certificados',icon:Award,prosegOnly:true},{to:'/ssma/aso',label:'Saúde Ocupacional / ASO',icon:HeartPulse,admin:true},{to:'/ssma/empresas-ministrantes',label:'Empresas ministrantes',icon:Building,admin:true},{to:'/ssma/pgr',label:'Estúdio de PGR',icon:FileText,admin:true,prosegOnly:true},{to:'/ssma/pgr/homologacao',label:'Homologação do PGR',icon:BookOpenCheck,prosegOnly:true}],
  vendas:[{to:'/vendas/dashboard',label:'Dashboard',icon:LayoutDashboard},{to:'/vendas',label:'Nova venda',icon:ShoppingCart,end:true},{to:'/vendas/historico',label:'Histórico de vendas',icon:Receipt},{to:'/vendas/clientes',label:'Clientes',icon:Contact},{to:'/vendas/recompras',label:'Recompras e alertas',icon:Bell},{to:'/vendas/vasilhames',label:'Vasilhames e validades',icon:ArrowLeftRight},{to:'/vendas/precos',label:'Preços de venda',icon:BadgeDollarSign,admin:true}],
  frotas:[{to:'/frotas',label:'Dashboard',icon:LayoutDashboard,end:true},{to:'/frotas/veiculos',label:'Veículos',icon:Truck},{to:'/frotas/postos',label:'Postos de combustível',icon:Building2},{to:'/frotas/abastecimentos',label:'Abastecimentos',icon:ArrowDownToLine},{to:'/frotas/manutencoes',label:'Manutenções',icon:Wrench},{to:'/frotas/documentos',label:'Documentos',icon:FileText},{to:'/frotas/multas',label:'Multas',icon:AlertTriangle}],
  adm:[{to:'/adm',label:'Visão geral',icon:LayoutDashboard,end:true},{to:'/adm/usuarios',label:'Usuários e permissões',icon:Users,master:true},{to:'/adm/unidades',label:'Sede, obras e centros',icon:Building2,master:true},{to:'/adm/auditoria',label:'Auditoria',icon:ShieldCheck,admin:true}],
};
export default function Layout(){
 const [open,setOpen]=useState(false);const {user,logout}=useAuth();const loc=useLocation();
 const current=MODULES.find(m=>loc.pathname===m.path||loc.pathname.startsWith(`${m.path}/`))||MODULES[1];
 const Icon=current.icon;
 const nav=(menu[current.key]||[]).filter(item=>!item.master||user?.role==='master').filter(item=>!item.admin||['master','admin'].includes(user?.role)).filter(item=>!item.prosegOnly||!user?.company_code||['PRO001','PRO0001'].includes(user?.company_code));
 const handleLogout=async()=>{await logout(false);window.location.href=`${import.meta.env.BASE_URL}login`;};
 return <div className="min-h-screen bg-[#f5f7fb] flex">
 <aside className={`fixed lg:sticky top-0 left-0 z-50 w-64 h-[100dvh] shrink-0 self-start bg-slate-950 text-slate-100 flex flex-col transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
  <div className="h-[76px] shrink-0 flex items-center gap-3 px-4 border-b border-white/10">
   <CompanyLogo user={user} className="h-14 w-[72px]"/>
   <div className="min-w-0 flex-1">
     <div className="text-xs font-semibold leading-snug text-white line-clamp-2" title={user?.company_name || 'Empresa'}>{user?.company_name || 'Empresa'}</div>
     <div className="text-[10px] text-slate-400 truncate mt-0.5">{user?.company_code || 'Gestão empresarial'}</div>
   </div>
   <button aria-label="Fechar menu" className="ml-auto lg:hidden text-slate-400" onClick={()=>setOpen(false)}><X className="w-5 h-5"/></button>
  </div>
  <div className="px-3 pt-4 shrink-0"><Link to="/modulos" onClick={()=>setOpen(false)} className="flex gap-2 items-center text-xs px-3 py-2.5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10"><ArrowLeft className="w-4 h-4"/> Todos os módulos</Link></div>
  <div className="px-4 py-5 shrink-0"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${current.gradient} flex items-center justify-center text-white`}><Icon className="w-5 h-5"/></div><div><div className="text-[10px] text-slate-500 uppercase tracking-widest">Módulo atual</div><div className="font-semibold text-sm">{current.title}</div></div></div></div>
  <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-3 space-y-0.5" aria-label={`Menu ${current.short}`}>
    {nav.map(item=><NavLink key={item.to} to={item.to} end={item.end} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive?'bg-indigo-600 text-white':'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><item.icon className="w-[18px] h-[18px] shrink-0"/>{item.label}</NavLink>)}
  </nav>
  <div className="shrink-0 p-3 border-t border-white/10 bg-slate-950"><div className="px-2 py-2 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{user?.display_name||user?.username}</div><div className="text-[11px] text-slate-500 truncate">{ROLE_LABELS[user?.role]||user?.role}</div></div></div><button onClick={handleLogout} className="w-full flex gap-2 items-center px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white"><LogOut className="w-4 h-4"/> Sair</button></div>
 </aside>
 {open&&<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={()=>setOpen(false)}/>}
 <div className="flex-1 flex flex-col min-w-0">
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-7 sticky top-0 z-30">
    <div className="flex items-center gap-3"><button aria-label="Abrir menu" onClick={()=>setOpen(true)} className="lg:hidden p-2 text-slate-700"><Menu className="w-6 h-6"/></button><div className="flex items-center gap-2"><Icon className="w-5 h-5 text-indigo-600"/><span className="font-bold text-slate-800 text-sm sm:text-base">{current.title}</span></div></div>
    <div className="flex items-center gap-3"><RepurchaseBell/><Link to="/modulos" className="text-xs sm:text-sm text-indigo-700 font-semibold hover:text-indigo-900 flex items-center gap-1"><Layers3 className="h-4 w-4"/><span className="hidden sm:inline">Trocar módulo</span><span className="sm:hidden">Módulos</span></Link></div>
  </header>
  <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-7"><UnidadeSelector/></div>
  <main className="flex-1 overflow-x-hidden"><Outlet/></main>
 </div></div>;
}
