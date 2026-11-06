import { UsersRound, Boxes, ShieldCheck, Settings2, ShoppingCart, Truck } from 'lucide-react';
export const MODULES = [
  { key: 'rh', title: 'Recursos Humanos', short: 'RH', icon: UsersRound, path: '/rh', description: 'Colaboradores, matrículas e fichas funcionais', accent: 'sky', gradient: 'from-sky-500 to-blue-700', kicker: 'Pessoas & desenvolvimento', links: [{to:'/rh',label:'Visão geral'}, {to:'/rh/funcionarios',label:'Funcionários'}] },
  { key: 'estoque', title: 'Estoque', short: 'ESTOQUE', icon: Boxes, path: '/estoque', description: 'Materiais, ferramentas, custos e movimentações', accent: 'emerald', gradient: 'from-emerald-500 to-teal-700', kicker: 'Logística & suprimentos', links: [{to:'/estoque',label:'Dashboard'}, {to:'/estoque/produtos',label:'Produtos'}, {to:'/estoque/entrada',label:'Entrada'}, {to:'/estoque/saida',label:'Saída'}, {to:'/estoque/ferramentas',label:'Ferramentas'}, {to:'/estoque/transferencias',label:'Transferências'}, {to:'/estoque/inventario',label:'Inventário'}, {to:'/estoque/relatorios',label:'Relatórios'}] },
  { key: 'ssma', title: 'SSMA', short: 'SSMA', icon: ShieldCheck, path: '/ssma', description: 'Entregas de EPI, certificados e segurança', accent: 'amber', gradient: 'from-orange-400 to-amber-600', kicker: 'Saúde, segurança & meio ambiente', links: [{to:'/ssma',label:'Visão geral'}, {to:'/ssma/epi',label:'Controle de EPI'}, {to:'/ssma/certificados',label:'Certificados'}, {to:'/ssma/aso',label:'Controle de ASO'}] },
  { key: 'vendas', title: 'Vendas', short: 'VENDAS', icon: ShoppingCart, path: '/vendas', description: 'PDV, clientes, tabela de preços e vendas integradas ao estoque', accent: 'rose', gradient: 'from-fuchsia-500 to-rose-700', kicker: 'Atendimento & comercial', links: [{to:'/vendas',label:'Nova venda'}, {to:'/vendas/historico',label:'Histórico'}, {to:'/vendas/clientes',label:'Clientes'}, {to:'/vendas/recompras',label:'Recompras e alertas'}, {to:'/vendas/vasilhames',label:'Vasilhames e validades'}, {to:'/vendas/precos',label:'Preços'}] },
  { key: 'frotas', title: 'Frotas', short: 'FROTAS', icon: Truck, path: '/frotas', description: 'Veículos, manutenção, abastecimentos, documentos e multas', accent: 'cyan', gradient: 'from-cyan-500 to-blue-700', kicker: 'Logística & mobilidade', links: [{to:'/frotas',label:'Dashboard'}, {to:'/frotas/veiculos',label:'Veículos'}, {to:'/frotas/postos',label:'Postos'}, {to:'/frotas/abastecimentos',label:'Abastecimentos'}, {to:'/frotas/manutencoes',label:'Manutenções'}, {to:'/frotas/documentos',label:'Documentos'}, {to:'/frotas/multas',label:'Multas'}] },
  { key: 'adm', title: 'Administração', short: 'ADM', icon: Settings2, path: '/adm', description: 'Usuários, permissões, obras e auditoria', accent: 'violet', gradient: 'from-violet-500 to-indigo-700', kicker: 'Configurações & governança', links: [{to:'/adm',label:'Visão geral'}, {to:'/adm/usuarios',label:'Usuários'}, {to:'/adm/unidades',label:'Sede e obras'}, {to:'/adm/auditoria',label:'Auditoria'}] },
];
export const MODULE_LABELS = Object.fromEntries(MODULES.map(({key,short})=>[key,short]));
export function userModules(user) {
  if (!user) return [];
  return user.role === 'master' ? MODULES.map(m=>m.key) : MODULES.filter(m=>(user.module_keys||[]).includes(m.key) && (m.key!=='adm'||user.role==='admin')).map(m=>m.key);
}
export const moduleEnabled=(user, module)=>userModules(user).includes(module);
export function moduleStart(user) {
  const keys=userModules(user);
  return keys.length===1 ? MODULES.find(m=>m.key===keys[0]).path : '/modulos';
}
