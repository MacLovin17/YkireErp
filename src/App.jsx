import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';
import ModuleGuard from '@/components/ModuleGuard';
import {moduleStart} from '@/lib/modules';
import Modulos from '@/Pages/Modulos';
import ModuleOverview from '@/Pages/ModuleOverview';
import Dashboard from '@/Pages/Dashboard';
import Produtos from '@/Pages/Produtos';
import Entrada from '@/Pages/Entrada';
import Saida from '@/Pages/Saida';
import Ajustes from '@/Pages/Ajustes';
import Inventario from '@/Pages/Inventario';
import Historico from '@/Pages/Historico';
import Categorias from '@/Pages/Categorias';
import Fornecedores from '@/Pages/Fornecedores';
import Alertas from '@/Pages/Alertas';
import Relatorios from '@/Pages/Relatorios';
import Login from '@/Pages/Login';
import Usuarios from '@/Pages/Usuarios';
import Unidades from '@/Pages/Unidades';
import Transferencias from '@/Pages/Transferencias';
import Auditoria from '@/Pages/Auditoria';
import Instalar from '@/Pages/Instalar';
import Funcionarios from '@/Pages/Funcionarios';
import FuncoesRH from '@/Pages/FuncoesRH';
import DepartamentosRH from '@/Pages/DepartamentosRH';
import EmpresasRH from '@/Pages/EmpresasRH';
import FichaFuncionario from '@/Pages/FichaFuncionario';
import Ferramentas from '@/Pages/Ferramentas';
import EPI from '@/Pages/EPI';
import Certificados from '@/Pages/Certificados';
import EmpresasMinistrantes from '@/Pages/EmpresasMinistrantes';
import AsoControle from '@/Pages/AsoControle';
import PgrStudio from '@/Pages/PgrStudio';
import PgrHomologacao from '@/Pages/PgrHomologacao';
import PageNotFound from '@/lib/PageNotFound';
import PlataformaLogin from '@/Pages/PlataformaLogin';
import PlataformaEmpresas from '@/Pages/PlataformaEmpresas';
import Vendas from '@/Pages/Vendas';
import Retornaveis from '@/Pages/Retornaveis';
import VendasDashboard from '@/Pages/VendasDashboard';
import Recompras from '@/Pages/Recompras';
import ClientesVendas from '@/Pages/ClientesVendas';
import PrecosVendas from '@/Pages/PrecosVendas';
import Frotas from '@/Pages/Frotas';
import FrotasExtras from '@/Pages/FrotasExtras';

function StartRoute(){const {user}=useAuth();return <Navigate to={moduleStart(user)} replace/>;}
function LegacyFichaRedirect(){const {registration}=useParams();return <Navigate to={`/rh/funcionarios/${encodeURIComponent(registration)}/ficha`} replace/>;}
const legacy = {
 '/produtos':'/estoque/produtos', '/entrada':'/estoque/entrada', '/saida':'/estoque/saida',
 '/ajustes':'/estoque/ajustes', '/inventario':'/estoque/inventario', '/historico':'/estoque/historico',
 '/categorias':'/estoque/categorias', '/fornecedores':'/estoque/fornecedores', '/alertas':'/estoque/alertas',
 '/relatorios':'/estoque/relatorios', '/transferencias':'/estoque/transferencias',
 '/ferramentas':'/estoque/ferramentas','/epi':'/ssma/epi','/funcionarios':'/rh/funcionarios',
 '/usuarios':'/adm/usuarios','/unidades':'/adm/unidades','/auditoria':'/adm/auditoria',
};
function AuthenticatedApp() {
 const {isLoadingAuth}=useAuth();
 if(isLoadingAuth)return <div className="fixed inset-0 flex items-center justify-center"><div className="w-9 h-9 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"/></div>;
 return <Routes>
   <Route path="/login" element={<Login/>}/><Route path="/instalar" element={<Instalar/>}/>
   <Route path="/plataforma/login" element={<PlataformaLogin/>}/>
   <Route path="/plataforma/empresas" element={<PlataformaEmpresas/>}/>
   <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace/>}/> }>
    <Route path="/" element={<StartRoute/>}/>
    <Route path="/modulos" element={<Modulos/>}/>
    <Route element={<ModuleGuard module="rh"/>}><Route element={<Layout/>}>
      <Route path="/rh" element={<ModuleOverview module="rh"/>}/>
      <Route path="/rh/funcionarios" element={<Funcionarios/>}/>
      <Route element={<RoleGuard allowedRoles={['master','admin']}/> }>
        <Route path="/rh/funcoes" element={<FuncoesRH/>}/>
        <Route path="/rh/departamentos" element={<DepartamentosRH/>}/>
        <Route path="/rh/empresas" element={<EmpresasRH/>}/>
      </Route>
      <Route path="/rh/funcionarios/:registration/ficha" element={<FichaFuncionario/>}/>
    </Route></Route>
    <Route element={<ModuleGuard module="estoque"/>}><Route element={<Layout/>}>
      <Route path="/estoque" element={<Dashboard/>}/>
      <Route path="/estoque/inventario" element={<Inventario/>}/><Route path="/estoque/produtos" element={<Produtos/>}/><Route path="/estoque/entrada" element={<Entrada/>}/><Route path="/estoque/saida" element={<Saida/>}/><Route path="/estoque/fornecedores" element={<Fornecedores/>}/>
      <Route element={<RoleGuard allowedRoles={['master','admin']}/> }>
        <Route path="/estoque/ajustes" element={<Ajustes/>}/>
        <Route path="/estoque/historico" element={<Historico/>}/><Route path="/estoque/categorias" element={<Categorias/>}/>
        <Route path="/estoque/alertas" element={<Alertas/>}/><Route path="/estoque/relatorios" element={<Relatorios/>}/>
        <Route path="/estoque/transferencias" element={<Transferencias/>}/><Route path="/estoque/ferramentas" element={<Ferramentas/>}/>
      </Route>
    </Route></Route>
    <Route element={<ModuleGuard module="ssma"/>}><Route element={<Layout/>}>
      <Route path="/ssma" element={<ModuleOverview module="ssma"/>}/>
      <Route path="/ssma/epi" element={<EPI/>}/><Route path="/ssma/certificados" element={<Certificados/>}/><Route path="/ssma/pgr/homologacao" element={<PgrHomologacao/>}/>
      <Route element={<RoleGuard allowedRoles={['master','admin']}/> }><Route path="/ssma/empresas-ministrantes" element={<EmpresasMinistrantes/>}/><Route path="/ssma/aso" element={<AsoControle/>}/><Route path="/ssma/pgr" element={<PgrStudio/>}/></Route>
    </Route></Route>
    <Route element={<ModuleGuard module="vendas"/>}><Route element={<Layout/>}>
      <Route path="/vendas/dashboard" element={<VendasDashboard/>}/>
      <Route path="/vendas/recompras" element={<Recompras/>}/>
      <Route path="/vendas/vasilhames" element={<Retornaveis/>}/>
      <Route path="/vendas" element={<Vendas/>}/>
      <Route path="/vendas/historico" element={<Vendas historico/>}/>
      <Route path="/vendas/clientes" element={<ClientesVendas/>}/>
      <Route element={<RoleGuard allowedRoles={['master','admin']}/> }><Route path="/vendas/precos" element={<PrecosVendas/>}/></Route>
    </Route></Route>
    <Route element={<ModuleGuard module="frotas"/>}><Route element={<Layout/>}>
      <Route path="/frotas" element={<Frotas view="dashboard"/>}/>
      <Route path="/frotas/veiculos" element={<Frotas view="vehicles"/>}/>
      <Route path="/frotas/postos" element={<Frotas view="stations"/>}/>
      <Route path="/frotas/abastecimentos" element={<Frotas view="fuelings"/>}/>
      <Route path="/frotas/manutencoes" element={<FrotasExtras view="maintenance"/>}/>
      <Route path="/frotas/documentos" element={<FrotasExtras view="documents"/>}/>
      <Route path="/frotas/multas" element={<FrotasExtras view="fines"/>}/>
    </Route></Route>
    <Route element={<ModuleGuard module="adm"/>}><Route element={<Layout/>}>
      <Route path="/adm" element={<ModuleOverview module="adm"/>}/>
      <Route element={<RoleGuard allowedRoles={['master','admin']}/> }><Route path="/adm/auditoria" element={<Auditoria/>}/></Route>
      <Route element={<RoleGuard allowedRoles={['master']}/> }><Route path="/adm/usuarios" element={<Usuarios/>}/><Route path="/adm/unidades" element={<Unidades/>}/></Route>
    </Route></Route>
    {Object.entries(legacy).map(([from,to])=><Route key={from} path={from} element={<Navigate to={to} replace/>}/>)}
    <Route path="/funcionarios/:registration/ficha" element={<LegacyFichaRedirect/>}/>
   </Route>
   <Route path="*" element={<PageNotFound/>}/>
 </Routes>;
}
export default function App(){return <AuthProvider><QueryClientProvider client={queryClientInstance}><Router basename={import.meta.env.BASE_URL}><ScrollToTop/><AuthenticatedApp/></Router><Toaster/></QueryClientProvider></AuthProvider>;}
