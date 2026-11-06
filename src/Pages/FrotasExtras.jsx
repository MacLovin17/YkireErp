import React,{useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import {api,apiUpload,selectedWarehouse} from '@/api/http';
import {toast} from 'sonner';
import {Wrench,FileText,AlertTriangle,RefreshCw,Save,Edit3,Paperclip,BellRing,ExternalLink} from 'lucide-react';

const field='w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none';
const card='bg-white border border-slate-200 rounded-2xl shadow-sm';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);
const blanks={
 maintenance:{vehicle_id:'',kind:'preventiva',title:'',description:'',provider:'',status:'agendada',scheduled_date:'',due_odometer:'',completed_date:'',completed_odometer:'',recurrence_days:'',recurrence_km:'',total_cost:'',notes:''},
 documents:{vehicle_id:'',document_type:'crlv',description:'',reference_number:'',issue_date:'',expiry_date:'',status:'pendente',notes:''},
 fines:{vehicle_id:'',notice_number:'',occurred_date:today(),due_date:'',agency:'',driver_name:'',description:'',status:'pendente',amount:'',notes:''}
};
const title={maintenance:'Manutenções',documents:'Documentos',fines:'Multas'};
const options={
 maintenance:{kind:[['preventiva','Preventiva'],['corretiva','Corretiva']],status:[['agendada','Agendada'],['em_andamento','Em andamento'],['concluida','Concluída'],['cancelada','Cancelada']]},
 documents:{document_type:[['crlv','CRLV / Licenciamento'],['seguro','Seguro'],['antt','ANTT'],['tacografo','Tacógrafo'],['inspecao','Inspeção'],['outro','Outro']],status:[['regular','Regular (informado)'],['pendente','Pendente'],['irregular','Irregular (informado)'],['dispensado','Dispensado']]},
 fines:{status:[['pendente','Pendente'],['recurso','Em recurso'],['paga','Paga'],['cancelada','Cancelada']]}
};
const labelType=(section,key,value)=>options[section]?.[key]?.find(([v])=>v===value)?.[1]||value||'—';
const inputDefs={
 maintenance:[
 ['vehicle_id','Veículo *','vehicle'],['kind','Tipo','select'],['title','Serviço / título *','text'],
 ['description','Descrição','textarea'],['provider','Oficina / fornecedor','text'],['status','Situação','select'],
 ['scheduled_date','Data prevista','date'],['due_odometer','Revisão prevista (km)','number'],
 ['completed_date','Data da execução','date'],['completed_odometer','Hodômetro da execução (km)','number'],
 ['recurrence_days','Periodicidade (dias)','number'],['recurrence_km','Periodicidade (km)','number'],
 ['total_cost','Custo total (R$)','money'],['notes','Observações','textarea']
 ],
 documents:[
 ['vehicle_id','Veículo *','vehicle'],['document_type','Tipo','select'],['description','Descrição','text'],
 ['reference_number','Número / referência','text'],['issue_date','Emissão','date'],['expiry_date','Validade / vencimento','date'],
 ['status','Situação informada','select'],['notes','Observações','textarea']
 ],
 fines:[
 ['vehicle_id','Veículo *','vehicle'],['notice_number','Auto / identificação *','text'],['occurred_date','Data da infração *','date'],
 ['due_date','Data de pagamento / recurso','date'],['agency','Órgão autuador','text'],['driver_name','Condutor','text'],
 ['description','Descrição','textarea'],['status','Situação','select'],['amount','Valor da multa (R$)','money'],['notes','Observações','textarea']
 ]
};
function FormField({name,label,type,value,onChange,section,vehicles,locked}){
 const change=e=>onChange(name,e.target.value);
 const control=type==='select'?<select className={field} value={value??''} onChange={change}>{options[section][name].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select>:
 type==='vehicle'?<select className={field} value={value??''} onChange={change} required disabled={locked}><option value="">Selecione o veículo</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}</select>:
 type==='textarea'?<textarea className={`${field} h-20 py-2`} value={value??''} onChange={change} maxLength={6000}/>:
 <input className={field} type={type==='money'||type==='number'?'number':type} value={value??''} onChange={change} step={type==='money'?'0.01':type==='number'?'0.1':undefined} min={type==='money'||type==='number'?'0':undefined} required={label.includes('*')}/>;
 return <label className={`block ${type==='textarea'?'sm:col-span-2':''}`}><span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>{control}</label>;
}
function humanDate(s){return s?String(s).slice(0,10).split('-').reverse().join('/'): '—';}
function Status({children,warning}){return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${warning?'bg-amber-50 text-amber-800':'bg-slate-100 text-slate-700'}`}>{children}</span>;}
export default function FrotasExtras({view='maintenance'}){
 const {user}=useAuth(); const admin=['master','admin'].includes(user?.role);const scope=selectedWarehouse();const all=scope==='all';
 const [data,setData]=useState([]),[vehicles,setVehicles]=useState([]),[alerts,setAlerts]=useState(null);
 const [form,setForm]=useState({...blanks[view]}),[search,setSearch]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [file,setFile]=useState(null),[rev,setRev]=useState(0);
 const change=(k,v)=>setForm(old=>({...old,[k]:v}));
 useEffect(()=>{let mounted=true;setLoading(true);setError('');Promise.all([api('fleet/vehicles'),api('fleet/'+view),api('fleet/alerts')]).then(([v,rows,al])=>{if(mounted){setVehicles(v);setData(rows);setAlerts(al);}}).catch(e=>{if(mounted)setError(e.message);}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[view,rev,scope]);
 useEffect(()=>{setForm({...blanks[view]});setSearch('');setFile(null);},[view]);
 const filtered=useMemo(()=>data.filter(r=>`${r.plate} ${r.title||''} ${r.description||''} ${r.notice_number||''} ${r.reference_number||''} ${r.provider||''}`.toLowerCase().includes(search.toLowerCase())),[data,search]);
 const edit=r=>{setForm({...blanks[view],...r});setFile(null);window.scrollTo({top:0,behavior:'smooth'});};
 const reset=()=>{setForm({...blanks[view]});setFile(null);};
 const save=async e=>{
  e.preventDefault();if(busy)return;
  if(all&&!form.id){toast.error('Selecione uma unidade para cadastrar.');return;}
  setBusy(true);
  try{
   const payload={...form};Object.keys(payload).forEach(k=>{if(payload[k]==='')payload[k]=null;});
   const r=await api('fleet/'+view+'/save',{data:payload});
   if(view==='documents'&&file){const fd=new FormData();fd.append('id',r.id);fd.append('document',file);if(scope)fd.append('warehouse_id',scope);await apiUpload('fleet/documents/upload',fd);}
   toast.success('Registro salvo com sucesso.');reset();setRev(v=>v+1);
  }catch(ex){toast.error(ex.message);}finally{setBusy(false);}
 };
 const attach=async r=>{if(!file){toast.error('Selecione um arquivo primeiro.');return;}setBusy(true);try{const fd=new FormData();fd.append('id',r.id);fd.append('document',file);if(scope)fd.append('warehouse_id',scope);await apiUpload('fleet/documents/upload',fd);toast.success('Documento anexado.');setFile(null);setRev(v=>v+1);}catch(e){toast.error(e.message);}finally{setBusy(false);}};
 const docDownload=r=>{const args=new URLSearchParams({route:'fleet/documents/download',id:r.id});if(scope)args.set('warehouse_id',scope);window.location.href=`${import.meta.env.BASE_URL}api/index.php?${args}`;};
 const currentAlerts=alerts?{maintenance:alerts.maintenance,documents:alerts.documents,fines:alerts.fines}[view]:[];
 const icon={maintenance:Wrench,documents:FileText,fines:AlertTriangle}[view];const Icon=icon;
 return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Icon size={20}/></div><div><h1 className="font-extrabold text-slate-900 text-xl">{title[view]}</h1><p className="text-sm text-slate-500">Registros e acompanhamento por veículo e unidade</p></div></div><button onClick={()=>setRev(x=>x+1)} className="text-sm flex items-center gap-2 border px-3 py-2 rounded-lg bg-white"><RefreshCw size={16}/> Atualizar</button></div>
  <div className="flex flex-wrap gap-2 text-sm">{[['/frotas','Dashboard'],['/frotas/veiculos','Veículos'],['/frotas/postos','Postos'],['/frotas/abastecimentos','Abastecimentos'],['/frotas/manutencoes','Manutenções'],['/frotas/documentos','Documentos'],['/frotas/multas','Multas']].map(([to,name])=><Link className={`rounded-lg border px-3 py-2 ${to===({maintenance:'/frotas/manutencoes',documents:'/frotas/documentos',fines:'/frotas/multas'}[view])?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-700'}`} key={to} to={to}>{name}</Link>)}</div>
  {!!currentAlerts?.length&&<div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-3 items-start text-amber-900 text-sm"><BellRing size={18} className="shrink-0"/><div><strong>{currentAlerts.length} alerta(s) de {title[view].toLowerCase()}.</strong><p className="text-xs mt-1">{view==='documents'?'Pendências e documentos com vencimento em até 30 dias.':view==='maintenance'?'Serviços programados para os próximos 15 dias ou 500 km.':'Multas pendentes ou em recurso.'}</p></div></div>}
  {error&&<div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}. Confira se a migração 014 foi executada no banco desta empresa.</div>}
  <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] gap-4 items-start">
   <section className={`${card} p-4 sm:p-5`}><div className="flex justify-between gap-3 items-center"><h2 className="font-bold text-slate-900">{title[view]} cadastradas(os) ({filtered.length})</h2><Status>{data.length} registros</Status></div><input className={`${field} mt-4`} placeholder="Buscar placa, descrição, número ou oficina" value={search} onChange={e=>setSearch(e.target.value)}/>
    {loading?<p className="text-sm text-slate-400 p-8 text-center">Carregando...</p>:<div className="space-y-2 mt-4 max-h-[790px] overflow-y-auto">{filtered.map(r=>{
      const isExpired=view==='documents'&&r.expiry_date&&r.expiry_date<today();
      return <div key={r.id} className="border rounded-xl p-3 text-sm space-y-1">
       <div className="flex items-center justify-between gap-2"><strong className="text-slate-900">{r.plate} • {view==='maintenance'?r.title:view==='documents'?labelType(view,'document_type',r.document_type):`Auto ${r.notice_number}`}</strong>{admin&&<button type="button" className="text-indigo-600 p-1" title="Editar registro" onClick={()=>edit(r)}><Edit3 size={16}/></button>}</div>
       {view==='maintenance'&&<><div className="text-xs text-slate-600">{labelType(view,'kind',r.kind)} · {r.provider||'Oficina não informada'} · {labelType(view,'status',r.status)}</div><div className="text-xs text-slate-500">Prevista: {humanDate(r.scheduled_date)} / {r.due_odometer?`${Number(r.due_odometer).toLocaleString('pt-BR')} km`:'km não informado'} · Realizada: {humanDate(r.completed_date)}</div>{r.recurrence_days||r.recurrence_km?<div className="text-xs text-indigo-700">Periodicidade: {r.recurrence_days?`${r.recurrence_days} dias `:''}{r.recurrence_km?` ${r.recurrence_km} km`:''}</div>:null}{admin&&r.total_cost!=null&&<div className="text-xs">Custo: {money(r.total_cost)}</div>}</>}
       {view==='documents'&&<><div className="text-xs text-slate-600">Referência: {r.reference_number||'—'} · <Status warning={isExpired||r.status!=='regular'}>{isExpired?'Vencido':labelType(view,'status',r.status)}</Status></div><div className="text-xs text-slate-500">Emissão {humanDate(r.issue_date)} • Vencimento {humanDate(r.expiry_date)}</div>{admin&&<div className="flex items-center gap-2 mt-2">{r.has_attachment&&<button type="button" className="inline-flex items-center gap-1 text-xs text-indigo-700 underline" onClick={()=>docDownload(r)}><Paperclip size={13}/> Baixar anexo</button>}</div>}</>}
       {view==='fines'&&<><div className="text-xs text-slate-600">{r.agency||'Órgão não informado'} • {labelType(view,'status',r.status)}</div><div className="text-xs text-slate-500">Infração: {humanDate(r.occurred_date)} • Vencimento: {humanDate(r.due_date)}</div>{admin&&r.amount!=null&&<div className="text-xs">Valor: {money(r.amount)}</div>}</>}
       {r.notes&&<p className="text-xs text-slate-500 line-clamp-2">{r.notes}</p>}
      </div>;
     })}{filtered.length===0&&<p className="text-center p-9 text-sm text-slate-400">Nenhum registro encontrado.</p>}</div>}
   </section>
   {admin?<form onSubmit={save} className={`${card} p-4 sm:p-5 space-y-3`}><div className="flex items-center justify-between"><h2 className="font-bold">{form.id?'Editar registro':'Novo registro'}</h2><button type="button" className="text-indigo-600 text-xs font-semibold" onClick={reset}>+ Novo</button></div>
    {all&&!form.id&&<p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">Selecione uma unidade específica para cadastrar.</p>}
    <div className="grid sm:grid-cols-2 gap-3">{inputDefs[view].map(([name,label,type])=><FormField key={name} name={name} label={label} type={type} value={form[name]} onChange={change} section={view} vehicles={vehicles} locked={!!form.id}/>)}</div>
    {view==='documents'&&<label className="block text-xs font-semibold text-slate-600">Anexo (PDF, JPG, PNG ou WebP, máximo 8 MB)<input className="block w-full mt-2 text-xs" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>}
    <button disabled={busy||all&&!form.id} type="submit" className="h-10 px-4 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"><Save size={17}/>{busy?'Salvando...':'Salvar registro'}</button>
    <p className="text-xs text-slate-500">{view==='documents'?'O anexo é armazenado fora da pasta pública. A situação é informada pela empresa e não equivale a consulta ao órgão oficial.':view==='maintenance'?'A programação é por data ou hodômetro. Concluir uma OS exige informar a data e o hodômetro da execução.':'As multas são registradas manualmente. Não há consulta automática à autoridade de trânsito.'}</p>
   </form>:<div className={`${card} p-5 text-sm text-slate-600`}>Consulta operacional disponível. Cadastro, edição, anexos e valores financeiros são restritos ao Master/Administrador.</div>}
  </div>
 </div>;
}

export function FleetAlertSummary(){
 const [alerts,setAlerts]=useState(null);
 useEffect(()=>{let active=true;api('fleet/alerts').then(r=>{if(active)setAlerts(r);}).catch(()=>{});return()=>{active=false;};},[]);
 if(!alerts)return null;
 const cats=[['Manutenções',alerts.maintenance?.length||0,'/frotas/manutencoes'],['Documentos',alerts.documents?.length||0,'/frotas/documentos'],['Multas',alerts.fines?.length||0,'/frotas/multas']];
 if(!cats.some(([,n])=>n>0))return <div className="text-sm bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3">Nenhum alerta de manutenção, documentação ou multa registrado.</div>;
 return <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><strong className="inline-flex items-center gap-2 text-sm text-amber-900"><BellRing size={18}/> Atenção à frota</strong><div className="flex gap-2 flex-wrap mt-3">{cats.filter(([,n])=>n>0).map(([label,n,to])=><Link key={to} to={to} className="bg-white border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-amber-100">{label}: {n} alerta(s)</Link>)}</div></div>;
}
