import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { moduleEnabled } from '@/lib/modules';
export default function ModuleGuard({ module, roles }) {
  const { user } = useAuth();
  return user &&
    moduleEnabled(user, module) &&
    (!roles || roles.includes(user.role)) ? (
    <Outlet />
  ) : (
    <Navigate to="/modulos" replace />
  );
}
