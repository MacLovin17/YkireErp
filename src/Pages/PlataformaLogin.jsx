import React, {useState} from 'react';
import {api,setCsrfToken} from '@/api/http';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ShieldCheck,Loader2} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
export default function PlataformaLogin(){
 const [install,setInstall]=useState(false),[user,setUser]=useState(''),[pass,setPass]=useState(''),[key,setKey]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const submit=async(e)=>{e.preventDefault();setBusy(true);setErr('');try{if(install){await api('platform/setup',{data:{setup_key:key,username:user,password:pass},warehouse:false});setInstall(false);setPass('');setKey('');setErr('Superadministrador criado. Remova platform_setup_key do servidor e entre com seu usuário.');}else{const r=await api('platform/login',{data:{username:user,password:pass},warehouse:false});if(!r?.admin?.id||!r?.csrf)throw new Error('O servidor não confirmou o login do Superadministrador. Verifique a sessão na HostGator.');setCsrfToken(r.csrf);
 let verified;
 try { verified=await api('platform/me',{warehouse:false}); }
 catch (error) {
   throw new Error(`O servidor aceitou o login, mas a sessão não foi mantida: ${error?.message||'verifique os cookies PHP'}`);
 }
 if (!verified?.admin?.id || String(verified.admin.id)!==String(r.admin.id)) {
   throw new Error('O login foi aceito, mas o navegador não manteve a sessão. Verifique se o cookie da plataforma está habilitado.');
 }
 setCsrfToken(verified.csrf || r.csrf);
 location.assign(`${import.meta.env.BASE_URL}plataforma/empresas`);}}catch(e){setErr(e.message)}finally{setBusy(false)}};
 return <AuthLayout title="Administração da plataforma" subtitle="Acesso exclusivo do proprietário da plataforma">
 <form onSubmit={submit} className="space-y-4">
 {err&&<p role="alert" className="text-sm bg-amber-50 border rounded-lg p-3">{err}</p>}
 {install&&<p className="text-sm text-slate-600">Instalação inicial: somente com chave configurada no servidor e sem superadministrador existente.</p>}
 <div className="space-y-1"><Label>Usuário da plataforma</Label><Input value={user} onChange={e=>setUser(e.target.value)} required minLength={4} maxLength={80} autoComplete="username"/></div>
 <div className="space-y-1"><Label>Senha</Label><Input type="password" value={pass} onChange={e=>setPass(e.target.value)} minLength={install?14:1} required autoComplete={install?'new-password':'current-password'}/></div>
 {install&&<div className="space-y-1"><Label>Chave de instalação (config.php)</Label><Input type="password" value={key} onChange={e=>setKey(e.target.value)} required/></div>}
 <Button disabled={busy} type="submit" className="w-full">{busy?<Loader2 className="animate-spin h-4 w-4"/>:install?'Criar Superadministrador':'Entrar na plataforma'}</Button>
 <button type="button" className="text-sm text-slate-500 hover:underline" onClick={()=>{setInstall(!install);setErr('');}}>{install?'Voltar ao login':'Configuração inicial'}</button>
 </form></AuthLayout>;
}
