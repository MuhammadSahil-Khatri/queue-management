import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/user.api.ts';
import {
  Building2,
  Users,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [staffCount, setStaffCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await userApi.listUsers({ page: 1, limit: 1 });
        setStaffCount(res.total);
      } catch (e) {
        console.error('Error fetching manager stats:', e);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Manager Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 backdrop-blur-xs text-blue-200 mb-3 border border-blue-400/30">
            <Building2 className="w-3.5 h-3.5" />
            Department Management Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Managing{' '}
            <span className="font-semibold text-white underline decoration-blue-400">
              {user?.departmentName || 'Examination Department'}
            </span>
            . You have operational authority over your department&apos;s service staff, counters, and appointments.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/manager/staff"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition shadow-xs"
            >
              <Users className="w-4 h-4" />
              Manage Department Staff
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics & Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Department Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {staffCount !== null ? staffCount : '...'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/manager/staff" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View roster <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Department Scope</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {user?.departmentName || 'Examination Department'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            ID: <span className="font-mono text-[11px]">{user?.departmentId || 'dept-exam-001'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Counters &amp; Services</p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            Ready for Chunk 3
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Counter assignment &amp; limits
          </div>
        </div>
      </div>

      {/* Security Scope Boundaries */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          Manager Permission Matrix &amp; Department Scoping
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 mt-3">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <p className="font-semibold text-emerald-800 mb-1">Permitted Operations:</p>
            <ul className="space-y-1 list-disc list-inside text-emerald-700">
              <li>Create and onboard new STAFF in your department</li>
              <li>Edit staff shifts, service types, and duty counters</li>
              <li>Activate or deactivate staff in your department</li>
              <li>Monitor department queue length (in Chunk 5)</li>
            </ul>
          </div>

          <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-xl">
            <p className="font-semibold text-rose-800 mb-1">Strict System Restrictions:</p>
            <ul className="space-y-1 list-disc list-inside text-rose-700">
              <li>Cannot touch staff from other departments (403 Mismatch)</li>
              <li>Cannot create or edit other Managers or Admins</li>
              <li>Cannot assign roles above STAFF</li>
              <li>Cannot delete or deactivate organization departments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
