import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/user.api.ts';
import {
  ShieldCheck,
  Users,
  Building,
  History,
  ArrowRight,
  UserPlus,
  Shield,
  CheckCircle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: number;
    departmentsCount: number;
    auditLogsCount: number;
  }>({
    totalUsers: 0,
    departmentsCount: 0,
    auditLogsCount: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, deptsRes, auditRes] = await Promise.all([
          userApi.listUsers({ page: 1, limit: 1 }),
          userApi.listDepartments(),
          userApi.listAuditLogs(),
        ]);
        setStats({
          totalUsers: usersRes.total,
          departmentsCount: deptsRes.departments.length,
          auditLogsCount: auditRes.logs.length,
        });
      } catch (e) {
        console.error('Error fetching admin dashboard stats:', e);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Hero Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 backdrop-blur-xs text-purple-200 mb-3 border border-purple-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Global Administration Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Administration
          </h1>
          <p className="mt-2 text-sm text-purple-100 leading-relaxed">
            Full root privileges across all departments, users, security policies, and audit logs.
            Safety protections are active: admins cannot demote or deactivate themselves, and the last active administrator cannot be removed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-800 font-semibold text-sm hover:bg-purple-50 transition shadow-xs"
            >
              <Users className="w-4 h-4" />
              Manage All Users &amp; Roles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* High-level system stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Registered Accounts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/admin/users" className="text-purple-700 font-semibold hover:underline flex items-center gap-1">
              Open Directory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <Building className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Active Departments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.departmentsCount}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Examination Department (Primary)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
            <History className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Audit Log Events</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.auditLogsCount}</p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Logins, role changes, creations
          </div>
        </div>
      </div>

      {/* Safety Policy & RBAC Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
          <Shield className="w-4 h-4 text-purple-700" />
          Active Security Invariants (Enforced in UserService)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
            <p className="font-semibold text-purple-900 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
              Self-Demotion Guard
            </p>
            <p className="text-purple-800">
              An administrator cannot change their own role to lower privilege or deactivate their own active account.
            </p>
          </div>

          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
            <p className="font-semibold text-purple-900 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
              Last Admin Protection
            </p>
            <p className="text-purple-800">
              The system prevents deleting, deactivating, or demoting the last remaining active Administrator in the organization.
            </p>
          </div>

          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
            <p className="font-semibold text-purple-900 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
              Privilege Escalation Lock
            </p>
            <p className="text-purple-800">
              Public registration strictly provisions CUSTOMER roles. Only ADMINs can create ADMINs or assign arbitrary departments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
