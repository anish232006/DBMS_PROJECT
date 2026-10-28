import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse shadow-lg shadow-indigo-500/20">
          <Shield size={34} />
        </div>
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-indigo-500 rounded-full animate-indeterminate" />
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium tracking-wide">
          Verifying institutional administrator credentials...
        </p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/login?role=admin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
