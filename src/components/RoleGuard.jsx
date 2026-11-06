import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleGuard({ allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Navigate to="/modulos" replace state={{ from: location.pathname }} />
    );
  }
  return <Outlet />;
}
