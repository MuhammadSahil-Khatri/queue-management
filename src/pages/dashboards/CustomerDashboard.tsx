import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import {
  Ticket,
  CalendarCheck,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Building,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Visitor &amp; Customer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            You are signed in as a <span className="font-semibold text-white">CUSTOMER</span>. In this system, customer accounts are protected so you can only ever access and view your own records and bookings.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition shadow-xs"
            >
              <User className="w-4 h-4" />
              Manage My Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Ticket className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Active Queue Tokens</h3>
          <p className="text-xs text-slate-500 mt-1">
            Coming in Chunk 4: Real-time ticket dispensing, live queue position, and SMS/push notifications.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Status: Queue Module Ready</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Scheduled Appointments</h3>
          <p className="text-xs text-slate-500 mt-1">
            Coming in Chunk 4: Department appointment booking with duplicate prevention and daily limits.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Status: Appointment Ready</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Permission Boundary</h3>
          <p className="text-xs text-slate-500 mt-1">
            As a CUSTOMER, you cannot access administrative or staff rosters (<code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">/api/users</code> is 403 Forbidden).
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-medium">
            <span>Security: Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
