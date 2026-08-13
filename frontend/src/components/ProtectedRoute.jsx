import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not allowed, send Trainee to welcome, otherwise send to dashboard
    if (user.role === 'TRAINEE') {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/hr/dashboard" replace />;
  }

  return <Outlet />;
}
