import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isStudentAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 mb-4 animate-pulse">
          <GraduationCap size={36} />
        </div>
        <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-blue-600 rounded-full animate-indeterminate" />
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium">Verifying student credentials...</p>
      </div>
    );
  }

  if (!isStudentAuthenticated) {
    return <Navigate to="/login?role=student" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
