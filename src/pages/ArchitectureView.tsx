import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Database,
  Layers,
  Server,
  Smartphone,
  Cpu,
  Clock,
  CheckCircle2,
  Users,
  Ticket,
  Calendar,
  MonitorCheck,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [dataModel, setDataModel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'datamodel' | 'queueFormula'>('architecture');
  const [activeEntity, setActiveEntity] = useState<'serviceData' | 'counterData' | 'appointmentData' | 'tokenData' | 'userData'>('serviceData');
  const [loading, setLoading] = useState(true);

  // Queue Calculator Simulator
  const [calcAhead, setCalcAhead] = useState(6);
  const [calcDuration, setCalcDuration] = useState(10);
  const [calcCounters, setCalcCounters] = useState(2);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/data-model/overview');
      setDataModel(res.data);
    } catch (err) {
      console.error('Error fetching data model:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelData();
  }, []);

  const estimatedWait = Math.round((calcAhead * calcDuration) / Math.max(1, calcCounters));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Section 8 Implemented
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Supabase PostgreSQL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Section 8: Data Model & System Architecture</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete database relational schema, system component flows, and active Supabase database records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchModelData()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Supabase State
          </button>
          <a
            href="https://supabase.com/dashboard/project/hxkvffuebtvjjxcynxky"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Supabase Console
          </a>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'architecture'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Recommended Architecture
        </button>

        <button
          onClick={() => setActiveTab('datamodel')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'datamodel'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Section 8 Data Model (5 Core Tables)
        </button>

        <button
          onClick={() => setActiveTab('queueFormula')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'queueFormula'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Smart Wait Time Simulator (Section 4)
        </button>
      </div>

      {/* Tab 1: System Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Architecture Flow Box */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-md border border-slate-800">
            <h2 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Section 8 End-to-End Architectural Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Recommended: Web/Mobile Application &rarr; Backend API &rarr; Appointment Manager &rarr; Queue & Token Manager &rarr; Database &rarr; Staff / Admin Dashboard
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-6">
              {/* Step 1 */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-indigo-500/20 text-indigo-300 mb-2">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">1. Client Layer</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Vite React SPA, Customer Portal, Self-Service Kiosks, and Public TV Display.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-indigo-300">
                  HTTP/JSON + SSE
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-blue-500/20 text-blue-300 mb-2">
                    <Server className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">2. Backend API</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Express API, JWT Auth & Cookie Rotation, RBAC Gatekeeper, Dept Scoping, Rate Limiting.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-blue-300">
                  /api/auth & /api/users
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-purple-500/20 text-purple-300 mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">3. Appointment Mgr</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Time-slot allocation, capacity management, &plusmn;10m check-in window, and no-show marking.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-purple-300">
                  Capacity Guard
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-amber-500/20 text-amber-300 mb-2">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">4. Queue Manager</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sequential token generator (A-027), dynamic wait-time calculator, FIFO & priority queue.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-amber-300">
                  Real-time Engine
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="p-2 w-fit rounded-lg bg-emerald-500/20 text-emerald-300 mb-2">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">5. Database Layer</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Supabase PostgreSQL: Transaction pooler (Port 6543) and direct connection (Port 5432).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] text-emerald-300">
                  Live Supabase DB
                </div>
              </div>
            </div>
          </div>

          {/* Subsystems Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Appointment Manager Subsystem
              </h3>
              <p className="text-sm text-slate-600">
                Implements the rules from Section 3, 5, and 7:
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li><strong className="text-slate-800">Dynamic Slot Division:</strong> Divides department operating hours into configurable intervals (e.g. 09:00 - 09:30).</li>
                <li><strong className="text-slate-800">Capacity Limiting:</strong> Enforces maximum appointments per slot (e.g., max 6 appointments per half-hour).</li>
                <li><strong className="text-slate-800">Check-In Window Guard:</strong> Customers can check in between 10 minutes before and 10 minutes after scheduled time.</li>
                <li><strong className="text-slate-800">Auto-Expiry:</strong> Marks absent visitors as <code className="text-rose-600 font-mono">MISSED</code> and re-releases slot capacity.</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-600" />
                Queue & Token Manager Subsystem
              </h3>
              <p className="text-sm text-slate-600">
                Implements the rules from Section 3, 4, 6, and 7:
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li><strong className="text-slate-800">Alphanumeric Token Dispenser:</strong> Generates formatted codes like <code className="text-indigo-600 font-mono">A-027</code> per service prefix.</li>
                <li><strong className="text-slate-800">FIFO + Priority Sequencing:</strong> Elderly, disability, or pre-checked appointments receive priority weighting.</li>
                <li><strong className="text-slate-800">Counter Dispatcher:</strong> Coordinates staff actions (<code className="text-slate-800">Call Next</code>, <code className="text-slate-800">Start</code>, <code className="text-slate-800">Complete</code>, <code className="text-slate-800">Skip</code>, <code className="text-slate-800">Recall</code>).</li>
                <li><strong className="text-slate-800">Auto-Redistribution:</strong> When a counter transitions to <code className="text-amber-600 font-mono">BREAK</code> or <code className="text-rose-600 font-mono">CLOSED</code>, pending tokens redistribute automatically.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Section 8 Data Model */}
      {activeTab === 'datamodel' && (
        <div className="space-y-6">
          {/* Sub-tabs for the 5 Section 8 Entities */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'serviceData', label: '1. Service Data', count: dataModel?.schemaEntities?.serviceData?.count ?? 0, icon: Layers },
              { key: 'counterData', label: '2. Counter Data', count: dataModel?.schemaEntities?.counterData?.count ?? 0, icon: MonitorCheck },
              { key: 'appointmentData', label: '3. Appointment Data', count: dataModel?.schemaEntities?.appointmentData?.count ?? 0, icon: Calendar },
              { key: 'tokenData', label: '4. Token Data', count: dataModel?.schemaEntities?.tokenData?.count ?? 0, icon: Ticket },
              { key: 'userData', label: '5. User Data', count: dataModel?.schemaEntities?.userData?.count ?? 0, icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveEntity(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeEntity === tab.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeEntity === tab.key ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Entity Card */}
          {dataModel && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Table: &quot;{dataModel.schemaEntities[activeEntity]?.tableName}&quot; (PostgreSQL in Supabase)
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-xs text-slate-500 font-medium">Section 8 Fields:</span>
                    {dataModel.schemaEntities[activeEntity]?.section8Fields.map((field: string) => (
                      <span key={field} className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-200 text-slate-700">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Total rows: <strong className="text-slate-800 font-mono">{dataModel.schemaEntities[activeEntity]?.count}</strong>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      {dataModel.schemaEntities[activeEntity]?.records[0] ? (
                        Object.keys(dataModel.schemaEntities[activeEntity]?.records[0]).map((key) => (
                          <th key={key} className="px-4 py-3 font-semibold">
                            {key}
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3">No records found</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataModel.schemaEntities[activeEntity]?.records.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {Object.values(row).map((val: any, cIdx: number) => (
                          <td key={cIdx} className="px-4 py-3 text-slate-700 font-mono text-[11px] max-w-xs truncate">
                            {typeof val === 'boolean' ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                                  val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {val ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : val === null || val === undefined ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : typeof val === 'object' ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Queue Formula Simulator */}
      {activeTab === 'queueFormula' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Smart Waiting Time Calculation Engine (Section 4)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Live mathematical simulation of dynamic queue wait times and real-time counter redistribution.
            </p>
          </div>

          {/* Formula Display Box */}
          <div className="bg-indigo-50/70 border border-indigo-100 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Formula Defined in Section 4</div>
              <div className="text-base md:text-lg font-mono font-bold text-indigo-950 mt-1">
                Estimated Wait Time = (People Ahead &times; Average Service Duration) &divide; Active Counters
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-indigo-700 font-medium">Calculated Estimated Wait</div>
              <div className="text-3xl font-extrabold text-indigo-600 font-mono">{estimatedWait} min</div>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                People Ahead in Line: <span className="font-mono text-indigo-600 text-sm">{calcAhead}</span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={calcAhead}
                onChange={(e) => setCalcAhead(parseInt(e.target.value, 10))}
                className="w-full mt-3 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Example: 6 people ahead</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Average Duration per Visitor: <span className="font-mono text-indigo-600 text-sm">{calcDuration} min</span>
              </label>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={calcDuration}
                onChange={(e) => setCalcDuration(parseInt(e.target.value, 10))}
                className="w-full mt-3 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Configured per Service (5m, 10m, 20m)</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Active Service Counters: <span className="font-mono text-indigo-600 text-sm">{calcCounters}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={calcCounters}
                onChange={(e) => setCalcCounters(parseInt(e.target.value, 10))}
                className="w-full mt-3 accent-indigo-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Status = AVAILABLE (excludes Break/Closed)</span>
            </div>
          </div>

          {/* Real-world test case matching Section 4 */}
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <strong>Section 4 Benchmark Verification:</strong>
            <p>
              When <strong>People Ahead = 5</strong>, <strong>Average Service Time = 4 Minutes</strong>, and <strong>Active Counters = 2</strong>:
            </p>
            <p className="font-mono text-indigo-700">
              (5 ahead &times; 4 min) &divide; 2 active counters = <strong>10 Minutes</strong> (Exact match with Section 4 specification example).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectureView;
