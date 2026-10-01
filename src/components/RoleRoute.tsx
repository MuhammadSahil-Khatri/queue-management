import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Role } from '../api/auth.api.ts';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleRouteProps {
  allowedRoles: Role[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { user, getDashboardPath } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">403 - Not Authorized</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Your current role <span className="font-semibold text-rose-600 px-2 py-0.5 bg-rose-50 rounded-md border border-rose-200">{user.role}</span> does not have permission to access this section.
          </p>
          <div className="space-y-3">
            <Link
              to={getDashboardPath(user.role)}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Your Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleRoute;
