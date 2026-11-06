import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Wrench, Search, RotateCcw, History } from 'lucide-react';
import { api } from '@/api/http';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatNumber } from '@/lib/estoque';
import { useAuth } from '@/lib/AuthContext';
import { canViewFinancial } from '@/lib/permissions';
import { toast } from 'sonner';
const fmt = s => s ? new Date(String(s).replace(' ','T')).toLocaleDateString('pt-BR') : '—';
export default function Ferramentas(){
 const {user}=useAuth();
 const showMoney=canViewFinancial(user?.role);
 const [rows,setRows]=useState([]),[reg,setReg]=useState(''),[filter,setFilter]=useState(''),[loading,setLoading]=useState(false);
 const [returning,setReturning]=useState(null),[qty,setQty]=useState(''),[condition,setCondition]=useState('good'),[notes,setNotes]=useState(''),[saving,setSaving]=useState(false);
 const [history,setHistory]=useState(null);
 const load=async()=>{setLoading(true);try{setRows(await api('tools/assignments',{params:filter?{registration:filter}:{}}));}catch(e){toast.error(e.message);}finally{setLoading(false);}};
 useEffect(()=>{load();},[filter]);
 const total=useMemo(()=>rows.reduce((n,r)=>n+Number(r.outstanding_quantity),0),[rows]);
 const openReturn=r=>{setReturning(r);setQty(String(r.outstanding_quantity));setCondition('good');setNotes('');};
 const saveReturn=async e=>{e.preventDefault();setSaving(true);try{
   await api('tools/return',{data:{assignment_id:returning.id,quantity:Number(qty),disposition:condition,notes}});
   toast.success(condition==='good'?'Devolução registrada; saldo retornou ao almoxarifado.':'Baixa de responsabilidade registrada sem entrada no estoque.');setReturning(null);await load();
 }catch(e){toast.error(e.message);}finally{setSaving(false);}};
 const showHistory=async r=>{try{const data=await api('tools/returns',{params:{assignment_id:r.id}});setHistory({row:r,returns:data});}catch(e){toast.error(e.message);}};
 return <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
  <PageHeader title="Ferramentas" subtitle="Conta de responsabilidade por matrícula, entregas e devoluções" icon={Wrench}/>
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-end gap-3">
    <div className="flex-1"><Label className="text-xs block mb-1">Filtrar conta por matrícula</Label><Input placeholder="Digite a matrícula para consultar" value={reg} onChange={e=>setReg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setFilter(reg.trim());}}/></div>
    <Button onClick={()=>setFilter(reg.trim())}><Search className="w-4 h-4 mr-1"/>Consultar</Button><Button variant="outline" onClick={()=>{setReg('');setFilter('');}}>Ver todos</Button>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="bg-white p-4 rounded-xl border"><p className="text-sm text-slate-500">Entregas registradas</p><p className="text-2xl font-semibold">{rows.length}</p></div>
    <div className="bg-white p-4 rounded-xl border"><p className="text-sm text-slate-500">Quantidade pendente</p><p className="text-2xl font-semibold text-amber-600">{formatNumber(total)}</p></div>
    <div className="bg-white p-4 rounded-xl border"><p className="text-sm text-slate-500">Contas abertas</p><p className="text-2xl font-semibold">{rows.filter(r=>r.status==='open').length}</p></div>
  </div>
  <p className="text-sm text-slate-500">Para entregar uma ferramenta, registre uma <b>Saída</b> com motivo <b>Ferramenta</b> e matrícula. A conta é criada automaticamente.</p>
  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto"><table className="w-full min-w-[940px] text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Funcionário','Ferramenta','Almoxarifado','Entregue','Pendente',...(showMoney?['Valor da entrega']:[]),'Data','Situação','Ações'].map(s=><th key={s} className="text-left px-3 py-3">{s}</th>)}</tr></thead><tbody>
   {rows.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="p-3"><b>{r.registration}</b><br/>{r.full_name}</td><td className="p-3">{r.product_name}</td><td className="p-3">{r.warehouse_name}</td><td className="p-3">{formatNumber(r.issued_quantity)}</td><td className="p-3 font-semibold">{formatNumber(r.outstanding_quantity)}</td>{showMoney && <td className="p-3">{formatCurrency(r.issued_value)}</td>}<td className="p-3">{fmt(r.issued_at)}</td><td className="p-3"><span className={r.status==='open'?'text-amber-700':'text-emerald-700'}>{r.status==='open'?'Em posse':'Encerrada'}</span></td><td className="p-3"><div className="flex gap-2">{r.status==='open'&&['master','admin'].includes(user?.role)&&<Button size="sm" onClick={()=>openReturn(r)}><RotateCcw className="h-3.5 w-3.5 mr-1"/>Devolver</Button>}<Button size="sm" variant="outline" onClick={()=>showHistory(r)}><History className="h-3.5 w-3.5"/></Button></div></td></tr>)}
   {!loading&&rows.length===0&&<tr><td colSpan={showMoney?9:8} className="p-8 text-center text-slate-500">Nenhuma entrega de ferramentas para esta consulta.</td></tr>}
  </tbody></table></div>
  {returning&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><form onSubmit={saveReturn} className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
   <h2 className="font-semibold text-lg">Registrar devolução ou baixa</h2><p className="text-sm text-slate-600"><b>{returning.full_name}</b> · {returning.product_name}</p><p className="text-sm">Pendente: <b>{formatNumber(returning.outstanding_quantity)} {returning.product_unit}</b></p>
   <div><Label className="block text-xs mb-1">Quantidade *</Label><Input required type="number" min="0.001" step="0.001" max={returning.outstanding_quantity} value={qty} onChange={e=>setQty(e.target.value)}/></div>
   <div><Label className="block text-xs mb-1">Condição / destino *</Label><select className="w-full h-9 rounded-lg border px-3 text-sm" value={condition} onChange={e=>setCondition(e.target.value)}><option value="good">Boa — devolve ao estoque</option>{['master','admin'].includes(user?.role)&&<><option value="damaged">Danificada — baixa sem retorno ao estoque</option><option value="lost">Extraviada — baixa sem retorno ao estoque</option></>}</select></div>
   <div><Label className="block text-xs mb-1">Observação {condition==='good'?'(opcional)':'(obrigatória)'}</Label><textarea rows="3" className="w-full rounded-lg border p-2 text-sm" value={notes} onChange={e=>setNotes(e.target.value)} required={condition!=='good'}/></div>
   {condition!=='good'&&<p className="text-xs text-amber-700">A baixa encerra a responsabilidade, mas não aumenta o estoque disponível.</p>}
   <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setReturning(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando...':'Confirmar'}</Button></div>
  </form></div>}
  {history&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[80vh] overflow-auto space-y-3"><h3 className="text-lg font-semibold">Histórico — {history.row.product_name}</h3><p className="text-sm">{history.row.registration} · {history.row.full_name}</p><div className="space-y-2">{history.returns.map(t=><div key={t.id} className="border rounded-lg p-3 text-sm"><b>{formatNumber(t.quantity)}</b> · {t.disposition==='good'?'Devolvida em boas condições':t.disposition==='damaged'?'Danificada':'Extraviada'} · {fmt(t.occurred_at)}<p className="text-slate-500">Recebido por: {t.received_by}</p>{t.notes&&<p>{t.notes}</p>}</div>)}{!history.returns.length&&<p className="text-slate-500 text-sm">Sem devoluções registradas.</p>}</div><div className="text-right"><Button onClick={()=>setHistory(null)}>Fechar</Button></div></div></div>}
 </div>;
}
