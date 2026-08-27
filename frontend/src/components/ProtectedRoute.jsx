import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Interception logic: Force password change if flag is true and user is not on /change-password
  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // If user does not need to change password, redirect away from /change-password
  if (!user?.must_change_password && location.pathname === '/change-password') {
    if (user?.role === 'TRAINEE') {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/hr/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not allowed, send Trainee to welcome, otherwise send to dashboard
    if (user.role === 'TRAINEE') {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/hr/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
