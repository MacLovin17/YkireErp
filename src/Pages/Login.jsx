import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Building2, Loader2, Lock, LogIn, User } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function Login(){
 const {login}=useAuth();
 const [mode,setMode]=useState(null);const [code,setCode]=useState('');
 const [company,setCompany]=useState(null);const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{api('auth/mode',{warehouse:false}).then(r=>setMode(!!r.multi_company)).catch(()=>setMode(false));},[]);
 async function selectCompany(e){e.preventDefault();setError('');setLoading(true);
  try {const r=await api('auth/company',{params:{code:code.trim().toUpperCase()},warehouse:false});setCompany(r);setPassword('');}
  catch(err){setError(err.message||'Código da empresa não encontrado.');}
  finally{setLoading(false);}
 }
 async function submit(e){e.preventDefault();setError('');setLoading(true);
  try{await login(username.trim(),password,company?.code||'');window.location.href=import.meta.env.BASE_URL;}
  catch(err){setError(err.message||'Falha ao entrar.');}
  finally{setLoading(false);}
 }
 const logo=company?.logo_url ? `${import.meta.env.BASE_URL}api/index.php${company.logo_url}` : null;
 return <AuthLayout subtitle={mode&&company?'Ambiente exclusivo da sua empresa': 'Gestão integrada de pessoas, estoque e SSMA'}>
  {error&&<div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}
  {mode===null?<p className="text-center text-slate-500">Carregando acesso…</p>:mode&&!company?
   <form onSubmit={selectCompany} className="space-y-5">
    <div className="text-center space-y-1"><h2 className="font-semibold text-lg">Identifique sua empresa</h2><p className="text-sm text-slate-500">Informe o código recebido da administração.</p></div>
    <div className="space-y-2"><Label htmlFor="company-code">Código da empresa</Label><Input id="company-code" autoFocus maxLength={20} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Ex.: PRO001" required className="h-12 uppercase"/></div>
    <Button type="submit" className="w-full h-12" disabled={loading||code.trim().length<3}>{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<>Continuar <ArrowRight className="w-4 h-4 ml-2"/></>}</Button>
   </form>:
   <form onSubmit={submit} className="space-y-4">
    {mode&&company&&<div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center space-y-2">
      {logo?<img src={logo} alt={`Logo ${company.name}`} className="h-20 max-w-52 object-contain mx-auto"/>:<Building2 className="h-12 w-12 mx-auto text-slate-500"/>}
      <h2 className="text-lg font-semibold">Seja bem-vindo ao YKIRE ERP!</h2><p className="text-slate-700 font-medium">{company.name}</p><p className="text-xs text-slate-500">Código: {company.code}</p>
     </div>}
    <div className="space-y-2"><Label htmlFor="username">Usuário</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input id="username" autoFocus={!mode} className="pl-10 h-12" value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" placeholder="Usuário"/></div></div>
    <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input id="password" className="pl-10 h-12" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></div></div>
    <Button type="submit" className="w-full h-12" disabled={loading}>{loading?<Loader2 className="w-4 h-4 animate-spin"/>:'Entrar'}</Button>
    {mode&&<button type="button" onClick={()=>{setCompany(null);setPassword('');setError('');}} className="text-sm text-slate-600 hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4"/>Trocar empresa</button>}
   </form>}
 </AuthLayout>;
}
