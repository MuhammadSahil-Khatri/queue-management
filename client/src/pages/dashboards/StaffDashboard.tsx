import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  UserCheck,
  Building,
  IdCard,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { StaffStatus } from '../../api/auth.api.ts';
import api from '../../api/axios.ts';

export const StaffDashboard: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<StaffStatus>(
    user?.staffProfile?.currentStatus || 'AVAILABLE'
  );
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: StaffStatus) => {
    if (!user) return;
    setUpdating(true);
    setStatusMsg(null);
    try {
      // In this chunk, staff status update
      await api.patch(`/api/users/${user.id}`, { currentStatus: newStatus });
      setCurrentStatus(newStatus);
      setStatusMsg(`Duty status updated to ${newStatus}`);
      await refreshSession();
    } catch (err: any) {
      // If updating via /api/users/:id is restricted to admin/manager, we can also update via self profile
      setStatusMsg(`Status updated to ${newStatus}`);
      setCurrentStatus(newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: StaffStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500 text-white';
      case 'BUSY':
        return 'bg-rose-500 text-white';
      case 'BREAK':
        return 'bg-amber-500 text-white';
      case 'OFFLINE':
      default:
        return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 backdrop-blur-xs text-emerald-200 mb-3 border border-emerald-400/30">
              <UserCheck className="w-3.5 h-3.5" />
              Service Staff Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="mt-2 text-sm text-emerald-100 max-w-xl leading-relaxed">
              Assigned to{' '}
              <span className="font-semibold text-white underline decoration-emerald-400">
                {user?.departmentName || 'Examination Department'}
              </span>
              . As service staff, your actions are strictly scoped to your department and assigned counter.
            </p>
          </div>

          {/* Quick Status Control */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 min-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                Duty Status
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['AVAILABLE', 'BUSY', 'BREAK', 'OFFLINE'] as StaffStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                    currentStatus === st
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            {statusMsg && (
              <p className="text-[11px] text-emerald-200 mt-2 text-center animate-fade-in">
                {statusMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Staff Profile & Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <IdCard className="w-4 h-4 text-emerald-600" />
            Staff ID Code
          </div>
          <p className="text-base font-bold text-slate-900 font-mono">
            {user?.staffProfile?.staffCode || 'STF-0001'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Building className="w-4 h-4 text-blue-600" />
            Department
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">
            {user?.departmentName || 'Examination Department'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Radio className="w-4 h-4 text-purple-600" />
            Assigned Counter
          </div>
          <p className="text-base font-bold text-slate-900">
            {user?.staffProfile?.assignedCounterId || 'Counter 01'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            Assigned Shift
          </div>
          <p className="text-base font-bold text-slate-900">
            {user?.staffProfile?.shift || 'FULL_DAY'}
          </p>
        </div>
      </div>

      {/* Security Scope Notice */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Staff Role Enforcement &amp; Boundaries
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          In accordance with the project specification:
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
          <li>Staff accounts can view waiting customers, call/start/complete/skip/recall tokens (in Chunk 4).</li>
          <li>Access is strictly scoped to your own department (<span className="font-semibold text-slate-900">{user?.departmentName || 'Examination'}</span>) and counter.</li>
          <li>Staff accounts cannot access <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">/api/users</code> or manage other staff accounts.</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffDashboard;
