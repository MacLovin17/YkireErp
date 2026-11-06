import CompanyLogo from '@/components/CompanyLogo';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Shield, Layers3, Building2, LogOut, ChevronRight, LockKeyhole } from 'lucide-react';
import { MODULES, userModules, moduleStart } from '@/lib/modules';
import { useAuth } from '@/lib/AuthContext';
export default function Modulos(){
  const {user,logout}=useAuth();
  const enabled=userModules(user);
  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <div className="bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"/>
      <div className="mx-auto max-w-7xl px-5 lg:px-10 relative">
        <header className="flex items-center justify-between gap-3 py-6 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            {/* No ambiente da empresa, a identidade visual exibida é somente a do cliente. */}
            <CompanyLogo user={user} className="h-16 w-[142px] sm:w-[180px]" />
            <div className="hidden sm:block min-w-0 pl-3 border-l border-white/15">
              <div className="font-semibold text-base truncate max-w-[280px]">{user?.company_name || 'Plataforma empresarial'}</div>
              <p className="text-xs text-slate-400 truncate">{user?.company_code || 'Gestão corporativa integrada'}</p>
            </div>
          </div>
          <button onClick={()=>logout()} className="flex items-center gap-2 text-sm border border-white/15 hover:bg-white/10 rounded-lg px-3 py-2"><LogOut className="w-4 h-4"/> <span className="hidden sm:inline">Sair</span></button>
        </header>
        <div className="py-14 sm:py-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-400/10 border border-indigo-300/20 text-indigo-200 text-xs px-3 py-1.5"><Shield className="h-3.5 w-3.5"/> Plataforma empresarial</div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mt-5 leading-tight">Olá, {user?.display_name?.split(' ')[0] || user?.username}.<br/><span className="text-slate-400">Por onde vamos começar?</span></h1>
          <p className="text-slate-300 mt-5 text-base max-w-xl">{user?.company_name ? <>Você está no ambiente de <strong className="text-white">{user.company_name}</strong>. </> : null}Escolha um módulo para acessar suas ferramentas de trabalho. Cada área possui permissões próprias e mantém os dados integrados.</p>
        </div>
      </div>
    </div>
    <section className="max-w-7xl mx-auto px-5 lg:px-10 -mt-7 relative pb-14">
      <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-slate-800">Áreas do sistema</h2><p className="text-xs text-slate-500">{enabled.length} de {MODULES.length} módulos disponíveis</p></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {MODULES.map(m=>{
        const enabledModule=enabled.includes(m.key);
        const Icon=m.icon;
        const content=<div className={`group h-full rounded-2xl border bg-white p-6 shadow-sm transition-all ${enabledModule?'hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 cursor-pointer':'opacity-55 cursor-not-allowed'}`}>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.gradient} text-white flex items-center justify-center shadow-md`}><Icon className="w-7 h-7"/></div>
          <div className="mt-7 text-[11px] tracking-wider uppercase text-slate-400 font-semibold">{m.kicker}</div>
          <h3 className="mt-1 font-bold text-xl">{m.short}</h3>
          <p className="mt-2 text-sm text-slate-500 min-h-[66px] leading-relaxed">{m.description}</p>
          <div className="mt-5 pt-4 border-t flex justify-between items-center text-sm font-semibold"><span className={enabledModule?'text-indigo-700':'text-slate-400'}>{enabledModule?'Abrir módulo':'Sem permissão'}</span>{enabledModule?<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform text-indigo-600"/>:<LockKeyhole className="h-4 w-4 text-slate-400"/>}</div>
        </div>;
        return enabledModule?<Link to={m.path} key={m.key}>{content}</Link>:<div key={m.key} title="Acesso não autorizado">{content}</div>;
      })}</div>
      {!enabled.length&&<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Seu usuário está ativo, mas ainda não possui módulos autorizados. Solicite ao Master o acesso no ADM → Usuários.</div>}
      <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Building2 className="w-4 h-4"/> Sede e obras compartilham os cadastros centrais, respeitando os acessos por unidade.</div>
    </section>
  </div>;
}
