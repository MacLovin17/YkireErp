import React, {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {api, selectedWarehouse} from '@/api/http';
import {brl, dateLabel, qtyLabel} from '@/lib/sales';
import PageHeader from '@/components/PageHeader';
import {Activity, AlertCircle, ArrowRight, CalendarDays, ClipboardList, DollarSign, LayoutDashboard, PackageCheck, RefreshCw, ShoppingCart, Users} from 'lucide-react';

const colors = {indigo:'#4f46e5', emerald:'#059669', rose:'#e11d48', slate:'#94a3b8'};
const presets = [
  {key:'today',label:'Hoje'}, {key:'7',label:'7 dias'}, {key:'30',label:'30 dias'},
  {key:'month',label:'Este mês'}, {key:'previous',label:'Mês anterior'}, {key:'custom',label:'Personalizado'},
];
function localDate(d) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function shiftDays(d,days) {return new Date(d.getFullYear(),d.getMonth(),d.getDate()+days);}
function rangeFor(preset, start, end) {
  const today = new Date();
  const lastDay=localDate(today);
  if(preset==='custom')return {start,end};
  if(preset==='today')return {start:lastDay,end:lastDay};
  if(preset==='7'||preset==='30')return {start:localDate(shiftDays(today,-Number(preset)+1)),end:lastDay};
  if(preset==='month')return {start:localDate(new Date(today.getFullYear(),today.getMonth(),1)),end:lastDay};
  return {start:localDate(new Date(today.getFullYear(),today.getMonth()-1,1)),end:localDate(new Date(today.getFullYear(),today.getMonth(),0))};
}
function dateTitle(ymd) {const [year,month,day]=ymd.split('-');return `${day}/${month}/${year}`;}
function moneyShort(value) {return new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(Number(value||0));}
function cardNumber(label, value, Icon, hint, color='indigo') {
  const styles = {indigo:'bg-indigo-50 text-indigo-700',emerald:'bg-emerald-50 text-emerald-700',rose:'bg-rose-50 text-rose-700',sky:'bg-sky-50 text-sky-700'};
  return <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 min-w-0 shadow-sm">
    <div className="flex items-start justify-between gap-3"><span className="text-xs sm:text-sm font-medium text-slate-500">{label}</span><span className={`p-2.5 rounded-xl ${styles[color]}`}><Icon className="w-5 h-5"/></span></div>
    <div className="text-[26px] sm:text-[29px] tracking-tight font-extrabold text-slate-900 mt-2 break-words">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{hint}</div>
  </div>;
}
function aggregateTrend(trend, start, end) {
  const from=new Date(`${start}T12:00:00`),to=new Date(`${end}T12:00:00`);
  const days=Math.round((to-from)/86400000)+1;
  const monthly=days>90;
  const rows=new Map((trend||[]).map(r=>[r.day,r]));
  const sums=new Map();
  for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
    const iso=localDate(d),key=monthly?iso.slice(0,7):iso;
    const entry=sums.get(key)||{key,label:monthly?`${key.slice(5)}/${key.slice(2,4)}`:`${iso.slice(8)}/${iso.slice(5,7)}`,amount:0,completed:0,cancelled:0};
    const row=rows.get(iso);
    if(row){entry.amount+=Number(row.amount||0);entry.completed+=Number(row.completed||0);entry.cancelled+=Number(row.cancelled||0);}
    sums.set(key,entry);
  }
  return {monthly,data:[...sums.values()].map(x=>({...x,amount:Math.round(x.amount*100)/100}))};
}
const statusNames={concluida:'Concluída',cancelada:'Cancelada'};
export default function VendasDashboard(){
  const [preset,setPreset]=useState('30');
  const [customFrom,setCustomFrom]=useState(localDate(shiftDays(new Date(),-29)));
  const [customTo,setCustomTo]=useState(localDate(new Date()));
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  const [metric,setMetric]=useState('amount');
  const selected=selectedWarehouse();
  const range=useMemo(()=>rangeFor(preset,customFrom,customTo),[preset,customFrom,customTo]);
  const validRange=!!range.start&&!!range.end&&range.start<=range.end;
  useEffect(()=>{
    if(!validRange){setData(null);setLoading(false);return;}
    let mounted=true;
    setLoading(true);setError('');
    api('sales/dashboard',{params:range}).then(result=>{if(mounted)setData(result);}).catch(e=>{if(mounted){setData(null);setError(e.message);}}).finally(()=>{if(mounted)setLoading(false);});
    return()=>{mounted=false;};
  },[range,revision,validRange,selected]);
  const sum=data?.summary;
  const trend=useMemo(()=>data?aggregateTrend(data.trend,data.period.start,data.period.end):{data:[],monthly:false},[data]);
  const ticket=sum?.completed_sales?sum.sales_amount/sum.completed_sales:0;
  const statusChart=sum?[{name:'Concluídas',value:sum.completed_sales,color:colors.emerald},{name:'Canceladas',value:sum.cancelled_sales,color:colors.rose}].filter(x=>x.value>0):[];
  const metricLabel=metric==='amount'?'Valor registrado (R$)':'Quantidade de vendas';
  return <div className="max-w-7xl mx-auto px-4 sm:px-7 py-6 space-y-5">
    <PageHeader title="Dashboard de Vendas" subtitle="Acompanhe as vendas registradas, produtos e desempenho por período" icon={LayoutDashboard}/>
    <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800"><CalendarDays className="w-4 h-4 text-indigo-600"/> Período de análise</div>
        <div className="text-xs text-slate-500">{selected==='all'?'Todas as unidades autorizadas':'Unidade selecionada no topo'}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map(item=><button type="button" key={item.key} onClick={()=>setPreset(item.key)} className={`text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg border transition-colors ${preset===item.key?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{item.label}</button>)}
      </div>
      {preset==='custom'&&<div className="flex flex-wrap items-end gap-3 text-sm"><label className="text-xs text-slate-600 flex flex-col gap-1">De<input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border border-slate-200 rounded-lg h-10 px-3 text-sm"/></label><label className="text-xs text-slate-600 flex flex-col gap-1">Até<input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border border-slate-200 rounded-lg h-10 px-3 text-sm"/></label></div>}
      <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-600">{validRange?`De ${dateTitle(range.start)} até ${dateTitle(range.end)}`:'Selecione datas válidas.'}</span>
        <button type="button" onClick={()=>setRevision(x=>x+1)} disabled={!validRange||loading} className="flex items-center gap-2 text-sm font-semibold text-indigo-700 disabled:opacity-50"><RefreshCw className="h-4 w-4"/> Atualizar dados</button>
      </div>
    </div>
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
      <strong>Controle comercial, sem processamento financeiro:</strong> os valores abaixo correspondem às vendas registradas e concluídas, não a pagamentos recebidos ou faturamento fiscal. Vendas canceladas não somam nos indicadores de vendas efetivas.
    </div>
    {error&&<div role="alert" className="flex gap-2 items-center bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700"><AlertCircle className="w-5 h-5 shrink-0"/>{error}</div>}
    {loading?<div className="rounded-xl border bg-white p-14 text-center text-slate-500"><Activity className="animate-pulse w-6 h-6 mx-auto mb-2 text-indigo-500"/>Carregando indicadores...</div>:sum&&<>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cardNumber('Valor total vendido',brl(sum.sales_amount),DollarSign,'Somente vendas concluídas','emerald')}
        {cardNumber('Vendas concluídas',qtyLabel(sum.completed_sales),ShoppingCart,'Pedidos registrados no período')}
        {cardNumber('Ticket médio',brl(ticket),Activity,'Valor vendido / vendas concluídas','sky')}
        {cardNumber('Unidades vendidas',qtyLabel(sum.units_sold),PackageCheck,`${qtyLabel(sum.distinct_products)} produto(s) distintos`)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] gap-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-5"><div><h2 className="font-bold text-slate-800">Evolução das vendas</h2><p className="text-xs text-slate-500 mt-1">{trend.monthly?'Agrupado por mês':'Agrupado por dia'} • Passe o mouse sobre o gráfico</p></div><div className="flex rounded-lg bg-slate-100 p-1 gap-1"><button onClick={()=>setMetric('amount')} className={`text-xs px-3 py-1.5 rounded-md ${metric==='amount'?'bg-white text-indigo-700 shadow font-bold':'text-slate-500'}`}>Valor (R$)</button><button onClick={()=>setMetric('completed')} className={`text-xs px-3 py-1.5 rounded-md ${metric==='completed'?'bg-white text-indigo-700 shadow font-bold':'text-slate-500'}`}>Nº vendas</button></div></div>
          <div className="h-[290px] w-full" aria-label={metricLabel} role="img"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.data} margin={{top:8,right:8,left:0,bottom:0}}><defs><linearGradient id="ykireSalesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.indigo} stopOpacity={0.24}/><stop offset="100%" stopColor={colors.indigo} stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#eef2f7" strokeDasharray="3 4"/><XAxis dataKey="label" tick={{fontSize:10}} tickLine={false} axisLine={false} minTickGap={20}/><YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} width={52} tickFormatter={metric==='amount'?moneyShort:undefined}/><Tooltip formatter={v=>[metric==='amount'?brl(v):qtyLabel(v),metricLabel]} labelFormatter={(label,payload)=>payload?.[0]?.payload?.key||label}/><Area type="monotone" dataKey={metric} stroke={colors.indigo} strokeWidth={2.6} fill="url(#ykireSalesArea)" dot={trend.data.length<=20?{r:2}:false} activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <h2 className="font-bold text-slate-800">Situação das vendas</h2><p className="text-xs text-slate-500 mt-1">{qtyLabel(sum.total_sales)} registro(s) no período</p>
          {statusChart.length?<div className="h-[210px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={85} paddingAngle={3}>{statusChart.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie><Tooltip formatter={(v,name)=>[qtyLabel(v),name]}/></PieChart></ResponsiveContainer></div>:<div className="h-[210px] flex items-center justify-center text-sm text-slate-400">Nenhuma venda no período.</div>}
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-emerald-700">● Concluídas</span><strong>{qtyLabel(sum.completed_sales)}</strong></div><div className="flex justify-between"><span className="text-rose-700">● Canceladas</span><strong>{qtyLabel(sum.cancelled_sales)}</strong></div><div className="flex justify-between pt-2 border-t text-slate-500"><span>Valor cancelado (não somado)</span><strong className="text-slate-700">{brl(sum.cancelled_amount)}</strong></div></div>
        </section>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm min-w-0"><div className="flex items-center gap-2 mb-4"><PackageCheck className="h-5 w-5 text-indigo-600"/><h2 className="font-bold text-slate-800">Produtos mais vendidos</h2></div>
          {data.top_products.length?<><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.top_products.slice(0,5)} layout="vertical" margin={{left:0,right:10}}><CartesianGrid stroke="#eef2f7" strokeDasharray="3 4" horizontal={false}/><YAxis dataKey="product_name" type="category" tick={{fontSize:11}} width={100} tickFormatter={v=>String(v).length>15?`${String(v).slice(0,14)}…`:v}/><XAxis type="number" tick={{fontSize:10}} tickFormatter={moneyShort}/><Tooltip formatter={v=>[brl(v),'Valor vendido']}/><Bar dataKey="amount" fill={colors.indigo} radius={[0,5,5,0]} maxBarSize={25}/></BarChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="w-full text-xs sm:text-sm"><thead><tr className="border-b text-slate-500"><th className="text-left py-2">Produto</th><th className="text-right">Qtd.</th><th className="text-right">Total</th></tr></thead><tbody>{data.top_products.map(p=><tr key={p.product_id} className="border-b last:border-none"><td className="py-2 pr-3">{p.product_name}</td><td className="text-right whitespace-nowrap">{qtyLabel(p.quantity)} {p.unit}</td><td className="text-right font-semibold whitespace-nowrap">{brl(p.amount)}</td></tr>)}</tbody></table></div></>:<div className="py-16 text-center text-slate-400 text-sm">Sem produtos vendidos no período.</div>}
        </section>
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-indigo-600"/><h2 className="font-bold text-slate-800">Desempenho por atendente</h2></div>
          {data.top_sellers.length?<div className="space-y-3">{data.top_sellers.map((seller,i)=>{const max=Math.max(1,Number(data.top_sellers[0]?.amount||0));return <div key={seller.user_id} className="space-y-1"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-slate-800">{i+1}. {seller.seller_name||'Usuário'}</span><span className="font-bold text-indigo-700">{brl(seller.amount)}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{width:`${Math.max(0,Math.min(100,Number(seller.amount)/max*100))}%`}}/></div><p className="text-xs text-slate-500">{qtyLabel(seller.orders)} venda(s)</p></div>;})}</div>:<div className="py-16 text-center text-slate-400 text-sm">Nenhuma venda concluída.</div>}
        </section>
      </div>
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-800">Últimas vendas do período</h2><p className="text-xs text-slate-500 mt-1">Inclui concluídas e canceladas</p></div><Link to="/vendas/historico" className="text-indigo-700 font-semibold text-sm flex items-center gap-1">Ver histórico <ArrowRight className="h-4 w-4"/></Link></div>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead className="bg-slate-50 text-slate-500"><tr><th className="text-left px-4 py-3">Venda</th><th className="text-left px-4 py-3">Data</th><th className="text-left px-4 py-3">Cliente / Atendente</th>{data.scope==='all'&&<th className="text-left px-4 py-3">Almoxarifado</th>}<th className="text-right px-4 py-3">Total</th><th className="text-left px-4 py-3">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recent_sales.map(s=><tr key={s.id}><td className="font-semibold px-4 py-3">{s.code}</td><td className="px-4 py-3 whitespace-nowrap">{dateLabel(s.created_at)}</td><td className="px-4 py-3"><div>{s.customer_name||'Consumidor'}</div><div className="text-xs text-slate-400">{s.seller_name||'—'}</div></td>{data.scope==='all'&&<td className="px-4 py-3">{s.warehouse_name}</td>}<td className="px-4 py-3 text-right font-bold whitespace-nowrap">{brl(s.total)}</td><td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-1 ${s.status==='concluida'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{statusNames[s.status]||s.status}</span></td></tr>)}{!data.recent_sales.length&&<tr><td colSpan={data.scope==='all'?6:5} className="text-center p-10 text-slate-500">Nenhuma venda encontrada neste período.</td></tr>}</tbody></table></div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p className="flex items-center gap-2"><ClipboardList className="w-4 h-4"/>Os indicadores são calculados pela API usando os registros do MySQL. Não incluem custos de aquisição nem lucros.</p><Link to="/vendas" className="font-semibold text-indigo-700 flex items-center gap-1">Registrar nova venda <ArrowRight className="w-4 h-4"/></Link></div>
    </>}
  </div>;
}
