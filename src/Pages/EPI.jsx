import React,{useEffect,useMemo,useState} from 'react';
import PageHeader from '@/components/PageHeader';
import { HardHat, Search, Download, Plus, Users } from 'lucide-react';
import { api, selectedWarehouse } from '@/api/http';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency,formatNumber,exportToCSV } from '@/lib/estoque';
import { toast } from 'sonner';
import EmployeeLookup from '@/components/EmployeeLookup';
import { useAuth } from '@/lib/AuthContext';
import { canViewFinancial } from '@/lib/permissions';
const fmt=s=>s?new Date(String(s).replace(' ','T')).toLocaleDateString('pt-BR'):'—';
export default function EPI(){
 const {user}=useAuth();
 const showMoney=canViewFinancial(user?.role);
 const [rows,setRows]=useState([]),[reg,setReg]=useState(''),[filter,setFilter]=useState(''),[loading,setLoading]=useState(false);
 const [employees,setEmployees]=useState([]),[employeeSearch,setEmployeeSearch]=useState(''),[employeesLoading,setEmployeesLoading]=useState(true);
 const [loadError,setLoadError]=useState('');
 // Os registros de EPI independem do valor financeiro e podem ser consultados pelo SSMA.
 const load=async()=>{setLoading(true);setLoadError('');try{setRows(await api('epi/deliveries',{params:filter?{registration:filter}:{}}));}catch(e){setRows([]);setLoadError(e.message);toast.error(e.message);}finally{setLoading(false);}};
 const loadEmployees=async()=>{setEmployeesLoading(true);try{const result=await api('ssma/employees');setEmployees(Array.isArray(result)?result:[]);}catch(e){setEmployees([]);toast.error('Não foi possível consultar colaboradores: '+e.message);}finally{setEmployeesLoading(false);}};
 useEffect(()=>{load();},[filter]);
 useEffect(()=>{loadEmployees();},[]);
 const visibleEmployees=useMemo(()=>{const q=employeeSearch.trim().toLowerCase();return employees.filter(e=>!q||[e.registration,e.full_name,e.job_title,e.department,e.unit_name].some(x=>String(x||'').toLowerCase().includes(q)));},[employees,employeeSearch]);
 const viewEmployee=(r)=>{setReg(r.registration);setFilter(r.registration);};
 const [showIssue,setShowIssue]=useState(false);
 const [items,setItems]=useState([]),[employee,setEmployee]=useState(null);
 const [issue,setIssue]=useState({registration:'',product_id:'',quantity:'1',ca_number:'',replacement_reason:'',notes:''});
 const [submitting,setSubmitting]=useState(false),[issueError,setIssueError]=useState('');
 const loadItems=async()=>{try{setItems(await api('ssma/products'));}catch(e){setIssueError(e.message);}};
 const openIssue=()=>{if(selectedWarehouse()==='all'){toast.error('Selecione um almoxarifado específico para registrar a entrega.');return;}setIssue({registration:'',product_id:'',quantity:'1',ca_number:'',replacement_reason:'',notes:''});setEmployee(null);setIssueError('');setShowIssue(true);loadItems();};
 const submitIssue=async(e)=>{e.preventDefault();setIssueError('');if(!employee){setIssueError('Busque e confirme a matrícula do colaborador.');return;}
  if(!issue.product_id || Number(issue.quantity)<=0){setIssueError('Selecione um produto e uma quantidade válida.');return;}
  setSubmitting(true);try{
   await api('ssma/deliver',{data:{product_id:issue.product_id,quantity:Number(issue.quantity),employee_registration:employee.registration,ca_number:issue.ca_number,replacement_reason:issue.replacement_reason,notes:issue.notes}});
   toast.success('EPI entregue. Saída do estoque e ficha individual registradas.');setShowIssue(false);setEmployee(null);await Promise.all([load(),loadEmployees()]);
  }catch(err){setIssueError(err.message);}finally{setSubmitting(false);}
 };
 const total=useMemo(()=>rows.reduce((s,r)=>s+Number(r.delivery_value),0),[rows]);
 const exportCsv=()=>{exportToCSV('ykire_ficha_epi.csv',rows.map(r=>({Matricula:r.registration,Funcionario:r.full_name,Setor:r.department,Produto:r.product_name,Quantidade:r.quantity,CA:r.ca_number,Substituicao:r.replacement_reason,Almoxarifado:r.warehouse_name,Data:r.delivered_at,...(showMoney?{Valor:r.delivery_value}:{})})));};
 return <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><PageHeader title="EPI" subtitle="Entregas, fichas e histórico por matrícula" icon={HardHat}/><Button onClick={openIssue} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-2"/> Entregar EPI</Button></div>
   <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-amber-700"/><div><h2 className="font-semibold text-slate-900">Colaboradores da unidade</h2><p className="text-xs text-slate-500">Todos os colaboradores, inclusive os que ainda não receberam EPI. Sem valores financeiros.</p></div></div>
      <span className="text-xs text-slate-500">{employeesLoading?'Carregando...':`${visibleEmployees.length} de ${employees.length} colaboradores`}</span>
    </div>
    <div className="px-4 py-3"><Input value={employeeSearch} onChange={e=>setEmployeeSearch(e.target.value)} placeholder="Buscar colaborador por nome, matrícula, função ou setor" aria-label="Buscar colaboradores"/></div>
    <div className="overflow-x-auto max-h-[360px] overflow-y-auto"><table className="w-full text-sm min-w-[720px]"><thead className="bg-slate-50 text-slate-600 sticky top-0"><tr>{['Matrícula','Colaborador','Função / setor','Unidade','Situação',''].map(t=><th key={t} className="text-left px-3 py-2">{t}</th>)}</tr></thead><tbody>
     {visibleEmployees.slice(0,250).map(e=><tr key={e.id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{e.registration}</td><td className="px-3 py-2">{e.full_name}</td><td className="px-3 py-2">{e.job_title||'—'}<div className="text-xs text-slate-500">{e.department||'—'}</div></td><td className="px-3 py-2">{e.unit_name||'—'}</td><td className="px-3 py-2">{e.status==='active'?'Ativo':'Inativo'}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={()=>viewEmployee(e)}>Ver entregas</Button></td></tr>)}
     {!employeesLoading&&!visibleEmployees.length&&<tr><td colSpan={6} className="text-center text-slate-500 px-3 py-7">Nenhum colaborador encontrado nesta unidade.</td></tr>}
    </tbody></table></div>
    {visibleEmployees.length>250&&<p className="text-xs text-slate-500 px-4 py-2 border-t">Exibindo os primeiros 250 resultados. Digite nome ou matrícula para localizar outros colaboradores.</p>}
   </div>
   <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
    <div className="flex-1"><Label className="text-xs mb-1 block">Matrícula do colaborador — histórico de entregas</Label><Input value={reg} onChange={e=>setReg(e.target.value)} placeholder="Digite a matrícula para consultar" onKeyDown={e=>{if(e.key==='Enter')setFilter(reg.trim());}}/></div>
    <Button onClick={()=>setFilter(reg.trim())}><Search className="w-4 h-4 mr-1"/>Consultar ficha</Button><Button variant="outline" onClick={()=>{setReg('');setFilter('');}}>Ver todos</Button><Button variant="outline" disabled={!rows.length} onClick={exportCsv}><Download className="w-4 h-4 mr-1"/>Exportar CSV</Button>
   </div>
   {loadError&&<div className="border border-rose-200 bg-rose-50 text-rose-700 p-3 rounded-lg text-sm" role="alert">{loadError}</div>}
   <div className="grid sm:grid-cols-3 gap-3"><div className="bg-white border rounded-xl p-4"><p className="text-slate-500 text-sm">Entregas</p><p className="text-2xl font-semibold">{rows.length}</p></div><div className="bg-white border rounded-xl p-4"><p className="text-slate-500 text-sm">Unidades entregues</p><p className="text-2xl font-semibold">{formatNumber(rows.reduce((n,r)=>n+Number(r.quantity),0))}</p></div>{showMoney && <div className="bg-white border rounded-xl p-4"><p className="text-slate-500 text-sm">Valor entregue</p><p className="text-2xl font-semibold">{formatCurrency(total)}</p></div>}</div>
   <p className="text-slate-500 text-sm">Uma entrega desconta automaticamente o saldo do almoxarifado selecionado e é registrada também no histórico do funcionário.</p>
   <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Matrícula','Funcionário / setor','EPI','Quantidade','CA','Substituição','Unidade / almoxarifado','Data',...(showMoney?['Valor']:[])].map(x=><th key={x} className="text-left px-3 py-3">{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-3 font-semibold">{r.registration}</td><td className="px-3 py-3">{r.full_name}<br/><span className="text-slate-500">{r.department}</span></td><td className="px-3 py-3">{r.product_name}</td><td className="px-3 py-3">{formatNumber(r.quantity)}</td><td className="px-3 py-3">{r.ca_number||'—'}</td><td className="px-3 py-3">{r.replacement_reason||'—'}</td><td className="px-3 py-3">{r.warehouse_name}</td><td className="px-3 py-3">{fmt(r.delivered_at)}</td>{showMoney && <td className="px-3 py-3">{formatCurrency(r.delivery_value)}</td>}</tr>)}{!loading&&!rows.length&&<tr><td colSpan={showMoney?9:8} className="text-center text-slate-500 p-8">Nenhuma entrega de EPI encontrada.</td></tr>}</tbody></table></div>
   {showIssue&&<div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-3 sm:p-5"><form onSubmit={submitIssue} className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 sm:p-7 space-y-4">
     <div className="flex justify-between items-start gap-4"><div><div className="text-xs uppercase tracking-widest font-semibold text-amber-700">SSMA / entrega</div><h3 className="text-xl font-bold mt-1">Registrar entrega de EPI</h3><p className="text-sm text-slate-500 mt-1">Registro integrado ao almoxarifado e ao custo médio.</p></div><button type="button" onClick={()=>setShowIssue(false)} className="px-3 py-1 text-slate-500 hover:text-slate-900" aria-label="Fechar">✕</button></div>
     {issueError&&<div className="border border-rose-200 bg-rose-50 text-rose-800 p-3 rounded-lg text-sm">{issueError}</div>}
     <EmployeeLookup registration={issue.registration} onRegistrationChange={v=>{setIssue(t=>({...t,registration:v}));setEmployee(null);}} employee={employee} onEmployeeChange={setEmployee} required/>
     <div><Label className="block text-xs mb-1">Produto disponível *</Label><select className="w-full border rounded-lg px-3 h-10 text-sm" required value={issue.product_id} onChange={e=>setIssue(t=>({...t,product_id:e.target.value}))}><option value="">Selecione um item do almoxarifado</option>{items.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name} ({item.current_balance} {item.unit})</option>)}</select><p className="text-xs text-slate-500 mt-1">Somente produtos com saldo positivo na unidade selecionada.</p></div>
     <div className="grid sm:grid-cols-2 gap-3"><div><Label className="block text-xs mb-1">Quantidade *</Label><Input type="number" step="0.001" min="0.001" required value={issue.quantity} onChange={e=>setIssue(t=>({...t,quantity:e.target.value}))}/></div><div><Label className="block text-xs mb-1">Certificado de Aprovação (CA)</Label><Input value={issue.ca_number} onChange={e=>setIssue(t=>({...t,ca_number:e.target.value}))}/></div></div>
     <div><Label className="block text-xs mb-1">Motivo da entrega / substituição</Label><Input value={issue.replacement_reason} placeholder="Primeira entrega, desgaste, substituição..." onChange={e=>setIssue(t=>({...t,replacement_reason:e.target.value}))}/></div>
     <div><Label className="block text-xs mb-1">Observações</Label><textarea rows="2" className="w-full rounded-lg border p-2 text-sm" value={issue.notes} onChange={e=>setIssue(t=>({...t,notes:e.target.value}))}/></div>
     <div className="text-xs rounded-lg bg-amber-50 text-amber-800 p-3">Ao confirmar, o estoque será baixado uma única vez e a entrega ficará vinculada à matrícula e ao usuário responsável.</div>
     <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setShowIssue(false)}>Cancelar</Button><Button type="submit" disabled={submitting||!employee}>{submitting?'Registrando...':'Confirmar entrega'}</Button></div>
    </form></div>}
   <p className="text-xs text-slate-500">Esta ficha é um histórico administrativo; não substitui automaticamente comprovantes assinados ou outros requisitos legais de entrega de EPI.</p>
  </div>;
}
