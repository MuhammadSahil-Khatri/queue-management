import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Ticket,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';

interface Department {
  id: string;
  name: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  code_prefix: string;
  avg_duration_min: number;
  description: string;
  department_id: string;
}

interface TokenCardData {
  token: {
    id: string;
    tokenNumber: string;
    status: string;
    serviceId: string;
    serviceName: string;
    counterNumber?: string | null;
    createdAt: string;
  };
  currentTokenNumber: string | null;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  message: string;
}

export const JoinQueue: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const [activeTokenData, setActiveTokenData] = useState<TokenCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch departments, services, and check if user already has an active token
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [deptsRes, tokenRes] = await Promise.all([
        axios.get('/api/departments'),
        axios.get('/api/tokens/me/active').catch(() => ({ data: null })),
      ]);

      setDepartments(deptsRes.data);
      if (deptsRes.data.length > 0) {
        setSelectedDeptId(deptsRes.data[0].id);
        const srvRes = await axios.get(`/api/departments/${deptsRes.data[0].id}/services`);
        setServices(srvRes.data);
        if (srvRes.data.length > 0) {
          setSelectedServiceId(srvRes.data[0].id);
        }
      }

      if (tokenRes?.data) {
        setActiveTokenData(tokenRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selected department changes, reload services
  const handleDeptChange = async (deptId: string) => {
    setSelectedDeptId(deptId);
    try {
      const res = await axios.get(`/api/departments/${deptId}/services`);
      setServices(res.data);
      if (res.data.length > 0) {
        setSelectedServiceId(res.data[0].id);
      } else {
        setSelectedServiceId('');
      }
    } catch (err: any) {
      setError('Failed to fetch services for this department');
    }
  };

  // 2. Supabase Realtime Subscription on `tokens`
  useEffect(() => {
    const channel = supabase
      .channel('public:tokens')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        (payload) => {
          // When any token updates, refresh active token state live without page refresh!
          axios
            .get('/api/tokens/me/active')
            .then((res) => {
              if (res.data) {
                setActiveTokenData(res.data);
              }
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Generate Walk-in Digital Token
  const handleGenerateToken = async () => {
    if (!selectedServiceId) return;
    try {
      setGenerating(true);
      setError(null);
      const res = await axios.post('/api/tokens/walk-in', {
        serviceId: selectedServiceId,
      });
      setActiveTokenData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to issue walk-in token');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              Mode 2: Walk-In Digital Tokens
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Supabase Realtime
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Join Queue &amp; Digital Token</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate an instant digital token and monitor your waiting position in real time.
          </p>
        </div>

        {activeTokenData && (
          <button
            onClick={() => {
              setLoading(true);
              axios.get('/api/tokens/me/active').then((res) => {
                setActiveTokenData(res.data);
                setLoading(false);
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE TOKEN CARD (Matches Example from prompt spec) */}
      {activeTokenData ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden transition-all">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 tracking-wide uppercase">
                  Active Digital Token
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {activeTokenData.token.serviceName}
                </h2>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Issued: {new Date(activeTokenData.token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="capitalize font-semibold text-emerald-300">
                  {activeTokenData.token.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Main Metrics Card (Prompt Required Output Format) */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Token Number */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 text-center">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Your Token
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-indigo-950 font-mono tracking-tight mt-1">
                  {activeTokenData.token.tokenNumber}
                </div>
                <div className="text-[11px] text-indigo-600 font-medium mt-1">Keep this ready</div>
              </div>

              {/* Current Serving Token */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Current Token
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {activeTokenData.currentTokenNumber || 'None'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Now at counter</div>
              </div>

              {/* People Ahead */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  People Ahead
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {activeTokenData.peopleAhead}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">In queue for service</div>
              </div>

              {/* Estimated Waiting Time */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 text-center">
                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated Wait
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-indigo-600 font-mono tracking-tight mt-1">
                  {activeTokenData.estimatedWaitMinutes} <span className="text-lg font-sans font-bold">min</span>
                </div>
                <div className="text-[11px] text-indigo-600 font-medium mt-1">Dynamic calculation</div>
              </div>
            </div>

            {/* Waiting Comfort Notification Message */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  No Need to Stand in Line
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {activeTokenData.message}
                </p>
              </div>
            </div>

            {/* Counter Call Indicator if Called */}
            {activeTokenData.token.status === 'called' && (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-center space-y-1 animate-pulse">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Now Calling
                </span>
                <div className="text-2xl font-bold text-amber-950">
                  Token {activeTokenData.token.tokenNumber}: Please Proceed to Counter {activeTokenData.token.counterNumber || 'Assigned'}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TOKEN GENERATOR FORM (If no active token) */
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Get a Walk-In Digital Token</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select your department and service to receive an instantaneous token.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Service
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                disabled={services.length === 0}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (~{s.avg_duration_min} min)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800">Queue Features:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Automatic alphanumeric prefix generation (A-001, B-001...).</li>
              <li>Live estimated waiting time based on active service counters.</li>
              <li>Realtime live updates via Supabase WebSockets without page reload.</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerateToken}
              disabled={generating || !selectedServiceId}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Token...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Generate Digital Token
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinQueue;
