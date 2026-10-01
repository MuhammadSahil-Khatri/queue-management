import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ticket,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';

interface AppointmentItem {
  id: string;
  appointmentNumber: string;
  status:
    | 'booked'
    | 'confirmed'
    | 'checked_in'
    | 'waiting'
    | 'in_service'
    | 'completed'
    | 'cancelled'
    | 'missed'
    | 'rescheduled'
    | 'delayed';
  checkInTime: string | null;
  notes?: string | null;
  createdAt: string;
  service: {
    id: string;
    name: string;
    codePrefix: string;
    avgDurationMin: number;
    departmentName: string;
  };
  slot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  token?: {
    id: string;
    tokenNumber: string;
    status: string;
    queuePosition: number;
    estimatedWaitMin: number;
  } | null;
}

export const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<AppointmentItem | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<string[]>([]);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [rescheduleSelectedSlotId, setRescheduleSelectedSlotId] = useState<string>('');
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);

  // Fetch user appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/appointments/me');
      setAppointments(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Supabase Realtime Subscription on `appointments`
  useEffect(() => {
    const channel = supabase
      .channel('public:appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check-In Window Calculation
  // Allowed between 10 minutes before and 10 minutes after slot start
  const getCheckInStatus = (slotDate: string, startTime: string) => {
    const now = new Date();
    const apptStart = new Date(`${slotDate}T${startTime}:00`);

    const diffMs = now.getTime() - apptStart.getTime();
    const diffMin = diffMs / (1000 * 60);

    const windowMin = 10;

    if (diffMin < -windowMin) {
      const waitMin = Math.ceil(-diffMin - windowMin);
      return {
        allowed: false,
        badgeText: `Opens in ${waitMin} min`,
        reason: 'Window not open yet',
      };
    } else if (diffMin > windowMin) {
      return {
        allowed: false,
        badgeText: 'Window expired',
        reason: 'Check-in time passed',
      };
    } else {
      return {
        allowed: true,
        badgeText: 'Check-in Open',
        reason: 'Ready for arrival',
      };
    }
  };

  // Perform Check-in
  const handleCheckIn = async (appointmentId: string) => {
    try {
      setActionLoadingId(appointmentId);
      setError(null);
      await axios.post(`/api/appointments/${appointmentId}/check-in`);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to check in');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Perform Cancel
  const handleCancel = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This slot will be released.')) {
      return;
    }
    try {
      setActionLoadingId(appointmentId);
      setError(null);
      await axios.patch(`/api/appointments/${appointmentId}/cancel`);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to cancel appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = async (appt: AppointmentItem) => {
    setRescheduleModalAppt(appt);
    setRescheduleSelectedSlotId('');
    try {
      setRescheduleLoading(true);
      const datesRes = await axios.get(`/api/services/${appt.service.id}/available-dates`);
      setRescheduleDates(datesRes.data);
      if (datesRes.data.length > 0) {
        setRescheduleSelectedDate(datesRes.data[0]);
        const slotsRes = await axios.get(
          `/api/services/${appt.service.id}/slots?date=${datesRes.data[0]}`
        );
        setRescheduleSlots(slotsRes.data);
      } else {
        setRescheduleSlots([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Reschedule Date Change
  const handleRescheduleDateChange = async (dateStr: string) => {
    setRescheduleSelectedDate(dateStr);
    setRescheduleSelectedSlotId('');
    if (!rescheduleModalAppt) return;
    try {
      setRescheduleLoading(true);
      const res = await axios.get(
        `/api/services/${rescheduleModalAppt.service.id}/slots?date=${dateStr}`
      );
      setRescheduleSlots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalAppt || !rescheduleSelectedSlotId) return;
    try {
      setRescheduleLoading(true);
      await axios.patch(`/api/appointments/${rescheduleModalAppt.id}/reschedule`, {
        slotId: rescheduleSelectedSlotId,
      });
      setRescheduleModalAppt(null);
      await fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Confirmed
          </span>
        );
      case 'checked_in':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3" /> Checked In
          </span>
        );
      case 'waiting':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            In Queue
          </span>
        );
      case 'in_service':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 animate-pulse">
            In Service
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
      case 'missed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Missed (No-Show)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your scheduled visits, check in on arrival, or reschedule slots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAppointments()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/book"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Book New Appointment
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Appointment Cards List */}
      {loading ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
          Loading your appointments from database...
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-900">No appointments scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don&apos;t have any active appointments. Use the booking wizard to pick a service and reserve your slot.
          </p>
          <div className="pt-2">
            <Link
              to="/book"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Book an Appointment <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const checkInCheck = getCheckInStatus(appt.slot.date, appt.slot.startTime);
            const isActionable = ['booked', 'confirmed'].includes(appt.status);

            return (
              <div
                key={appt.id}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left: Info */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-base text-indigo-900">
                      {appt.appointmentNumber}
                    </span>
                    {getStatusBadge(appt.status)}
                    <span className="text-xs text-slate-400 font-medium">
                      {appt.service.departmentName}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{appt.service.name}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {appt.slot.date}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {appt.slot.startTime} - {appt.slot.endTime}
                    </span>
                    <span className="text-slate-400">
                      Duration: ~{appt.service.avgDurationMin} min
                    </span>
                  </div>

                  {/* Linked Priority Token if checked in */}
                  {appt.token && (
                    <div className="mt-2 inline-flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
                      <Ticket className="w-4 h-4 text-indigo-600" />
                      <span>
                        Queue Token:{' '}
                        <strong className="text-indigo-950 font-mono text-sm">
                          {appt.token.tokenNumber}
                        </strong>
                      </span>
                      <span className="text-indigo-600 font-medium">
                        (Estimated Wait: {appt.token.estimatedWaitMin} min)
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  {/* CHECK-IN BUTTON: Only enabled within check-in window */}
                  {isActionable && (
                    <div className="flex flex-col items-center">
                      <button
                        disabled={!checkInCheck.allowed || actionLoadingId === appt.id}
                        onClick={() => handleCheckIn(appt.id)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                          checkInCheck.allowed
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {actionLoadingId === appt.id ? 'Checking in...' : 'Check In Now'}
                      </button>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {checkInCheck.badgeText}
                      </span>
                    </div>
                  )}

                  {/* Reschedule Button */}
                  {isActionable && (
                    <button
                      onClick={() => openRescheduleModal(appt)}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reschedule
                    </button>
                  )}

                  {/* Cancel Button */}
                  {isActionable && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={actionLoadingId === appt.id}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reschedule Appointment</h3>
              <p className="text-xs text-slate-500 mt-1">
                Moving #{rescheduleModalAppt.appointmentNumber} ({rescheduleModalAppt.service.name}) to a new slot.
              </p>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Available Dates
              </label>
              <div className="flex flex-wrap gap-1.5">
                {rescheduleDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => handleRescheduleDateChange(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      rescheduleSelectedDate === d
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select New Time Slot
              </label>
              {rescheduleLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading slots...</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {rescheduleSlots.map((slot) => {
                    const isFull = slot.status === 'Full';
                    const isSelected = rescheduleSelectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        disabled={isFull}
                        onClick={() => setRescheduleSelectedSlotId(slot.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs ${
                          isFull
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-50 font-bold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          {slot.start_time} - {slot.end_time}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {isFull ? 'Full' : `${slot.remaining_capacity} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!rescheduleSelectedSlotId || rescheduleLoading}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
