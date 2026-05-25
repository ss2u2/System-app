import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSplash from './LoadingSplash';

export function AuthGuard() {
  const { user } = useAuth();

  if (user === undefined) {
    return <LoadingSplash />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
