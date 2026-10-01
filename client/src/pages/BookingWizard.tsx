import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Ticket,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

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
}

interface Slot {
  id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  remaining_capacity: number;
  status: 'Available' | 'Full';
}

export const BookingWizard: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1: Department, 2: Service, 3: Date & Slot, 4: Confirm, 5: Success
  const [step, setStep] = useState<number>(1);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedResult, setBookedResult] = useState<any | null>(null);

  // Load Departments on mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/departments');
        setDepartments(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, []);

  // When Department is selected, load Services
  const handleSelectDept = async (dept: Department) => {
    setSelectedDept(dept);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setError(null);
    try {
      setLoading(true);
      const res = await axios.get(`/api/departments/${dept.id}/services`);
      setServices(res.data);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load department services');
    } finally {
      setLoading(false);
    }
  };

  // When Service is selected, load available dates
  const handleSelectService = async (service: Service) => {
    setSelectedService(service);
    setSelectedDate('');
    setSelectedSlot(null);
    setError(null);
    try {
      setLoading(true);
      const res = await axios.get(`/api/services/${service.id}/available-dates`);
      setAvailableDates(res.data);
      if (res.data.length > 0) {
        setSelectedDate(res.data[0]);
        // Also fetch slots for the first date
        const slotsRes = await axios.get(`/api/services/${service.id}/slots?date=${res.data[0]}`);
        setSlots(slotsRes.data);
      } else {
        setSlots([]);
      }
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dates for this service');
    } finally {
      setLoading(false);
    }
  };

  // When Date changes, load slots for that date
  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setError(null);
    if (!selectedService) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/services/${selectedService.id}/slots?date=${dateStr}`);
      setSlots(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load slots for this date');
    } finally {
      setLoading(false);
    }
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/appointments', {
        serviceId: selectedService.id,
        slotId: selectedSlot.id,
        notes,
      });
      setBookedResult(res.data);
      setStep(5);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to complete booking. Slot may be full.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Breadcrumb Indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              1
            </span>
            <span className="hidden sm:inline">Department</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              2
            </span>
            <span className="hidden sm:inline">Service</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              3
            </span>
            <span className="hidden sm:inline">Date &amp; Slot</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              4
            </span>
            <span className="hidden sm:inline">Confirm</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Select Department */}
      {step === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 1: Select a Department</h2>
            <p className="text-sm text-slate-500 mt-1">Choose the administrative office for your visit.</p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading departments from database...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDept(dept)}
                  className="p-5 text-left border rounded-xl hover:border-indigo-600 hover:bg-indigo-50/40 transition-all group flex flex-col justify-between border-slate-200"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-indigo-600">
                    Select Department <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select Service */}
      {step === 2 && selectedDept && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 2: Select a Service</h2>
              <p className="text-sm text-slate-500 mt-1">
                Department: <strong className="text-slate-800">{selectedDept.name}</strong>
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Departments
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No active services in this department.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="p-5 text-left border rounded-xl hover:border-indigo-600 hover:bg-indigo-50/40 transition-all group flex flex-col justify-between border-slate-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-700">
                        Prefix: {svc.code_prefix}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> ~{svc.avg_duration_min} min
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{svc.description}</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-indigo-600">
                    Choose Service <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Choose Date and Slot */}
      {step === 3 && selectedService && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 3: Choose Date &amp; Time Slot</h2>
              <p className="text-sm text-slate-500 mt-1">
                Service: <strong className="text-slate-800">{selectedService.name}</strong> (~{selectedService.avg_duration_min} min)
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Services
            </button>
          </div>

          {/* Date Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Select Date</label>
            <div className="flex flex-wrap gap-2">
              {availableDates.map((dateStr) => {
                const dateObj = new Date(dateStr + 'T00:00:00');
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleSelectDate(dateStr)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Available Time Slots</label>
              <span className="text-[11px] text-slate-400">Full slots are disabled</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No slots available for this date.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot) => {
                  const isFull = slot.status === 'Full' || slot.remaining_capacity <= 0;
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      disabled={isFull}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isFull
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-sm">
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-semibold ${
                            isFull ? 'text-slate-400' : isSelected ? 'text-indigo-700' : 'text-emerald-700'
                          }`}
                        >
                          {isFull ? 'Full' : `${slot.remaining_capacity} left`}
                        </span>
                        <span className="text-[10px] text-slate-400">max {slot.max_capacity}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-1.5"
            >
              Continue to Confirmation <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Confirm */}
      {step === 4 && selectedDept && selectedService && selectedSlot && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 4: Confirm Your Appointment</h2>
              <p className="text-sm text-slate-500 mt-1">Review the details before final booking confirmation.</p>
            </div>
            <button
              onClick={() => setStep(3)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Slots
            </button>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-900">{selectedDept.name}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Service:</span>
              <span className="font-semibold text-slate-900">{selectedService.name}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Date:</span>
              <span className="font-semibold text-slate-900 font-mono">{selectedSlot.date}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Time Slot:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {selectedSlot.start_time} - {selectedSlot.end_time}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-500">Check-in Window:</span>
              <span className="font-semibold text-indigo-700">
                10 mins before to 10 mins after slot start
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Special Notes / Requests (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Degree verification batch 2024"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmBooking}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Confirming...' : 'Confirm Appointment'}
              <CheckCircle2 className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Success Screen */}
      {step === 5 && bookedResult && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Appointment Successfully Confirmed
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">You&apos;re All Set!</h2>
            <p className="text-sm text-slate-500 mt-1">
              Please present your appointment number or check in via the portal upon arrival.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="max-w-md mx-auto bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200/80 rounded-2xl p-6 text-left shadow-sm">
            <div className="text-xs uppercase font-bold text-indigo-700 tracking-wider">
              Appointment Reference
            </div>
            <div className="text-3xl font-extrabold text-indigo-950 font-mono tracking-tight mt-1">
              {bookedResult.appointment_number}
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-100 text-xs text-slate-600 space-y-1.5">
              <div>
                <span className="text-slate-400">Service:</span>{' '}
                <strong className="text-slate-800">{selectedService?.name}</strong>
              </div>
              <div>
                <span className="text-slate-400">Date &amp; Time:</span>{' '}
                <strong className="text-slate-800">
                  {selectedSlot?.date} ({selectedSlot?.start_time} - {selectedSlot?.end_time})
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Check-in Rule:</span>{' '}
                <span className="text-indigo-800 font-medium">
                  Check in between 10 minutes before and 10 minutes after start time.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/my-appointments')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              View in My Appointments <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setStep(1);
                setSelectedDept(null);
                setSelectedService(null);
                setSelectedSlot(null);
                setBookedResult(null);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingWizard;
