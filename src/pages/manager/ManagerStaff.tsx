import React, { useState, useEffect } from 'react';
import { userApi, User } from '../../api/user.api.ts';
import { Shift, StaffStatus } from '../../api/auth.api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Users,
  UserPlus,
  Edit2,
  Power,
  Building,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Radio,
  Clock,
  IdCard,
} from 'lucide-react';

export const ManagerStaff: React.FC = () => {
  const { user: currentManager } = useAuth();

  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shift: 'FULL_DAY' as Shift,
    serviceType: '',
    assignedCounterId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.listUsers({
        role: 'STAFF',
        departmentId: currentManager?.departmentId || undefined,
        limit: 50,
      });
      setStaffList(res.users);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load department staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentManager?.departmentId]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      shift: 'FULL_DAY',
      serviceType: '',
      assignedCounterId: '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (staff: User) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      shift: staff.staffProfile?.shift || 'FULL_DAY',
      serviceType: staff.staffProfile?.serviceType || '',
      assignedCounterId: staff.staffProfile?.assignedCounterId || '',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await userApi.createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        role: 'STAFF', // Strictly fixed to STAFF for managers
        departmentId: currentManager?.departmentId,
        shift: formData.shift,
        serviceType: formData.serviceType || undefined,
        assignedCounterId: formData.assignedCounterId || undefined,
      });
      setShowCreateModal(false);
      setActionSuccess(`Staff member ${formData.name} added to your department`);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to onboard staff member');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError(null);
    setFormSubmitting(true);
    try {
      await userApi.updateUser(editingStaff.id, {
        name: formData.name,
        phone: formData.phone || null,
        shift: formData.shift,
        serviceType: formData.serviceType || null,
        assignedCounterId: formData.assignedCounterId || null,
      });
      setShowEditModal(false);
      setActionSuccess(`Staff profile for ${formData.name} updated`);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to update staff');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: User) => {
    const actionName = staff.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} staff member "${staff.name}"?`)) {
      return;
    }
    try {
      await userApi.updateStatus(staff.id, !staff.isActive);
      setActionSuccess(`Staff status updated to ${!staff.isActive ? 'Active' : 'Deactivated'}`);
      fetchStaff();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || `Failed to ${actionName} staff`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
            <Building className="w-4 h-4" />
            <span>{currentManager?.departmentName || 'Examination Department'}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 font-mono">{currentManager?.departmentId || 'dept-exam-001'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Department Staff Roster</h1>
          <p className="text-sm text-slate-500">
            Onboard, assign service counters, set working shifts, and manage staff active status in your department.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Onboard New Staff
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Staff Code</th>
                <th className="py-3.5 px-4">Shift &amp; Counter</th>
                <th className="py-3.5 px-4">Specialization</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading department staff...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff members registered in your department yet.
                  </td>
                </tr>
              ) : (
                staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{st.name}</div>
                          <div className="text-[11px] text-slate-400">{st.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {st.staffProfile?.staffCode || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {st.staffProfile?.shift || 'FULL_DAY'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Counter: {st.staffProfile?.assignedCounterId || 'Unassigned'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {st.staffProfile?.serviceType || 'General Inquiries'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          st.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {st.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(st)}
                          className={`p-1.5 rounded-lg transition ${
                            st.isActive
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={st.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Onboard Department Staff
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-xs">
                Department: <span className="font-bold">{currentManager?.departmentName || 'Examination Department'}</span> (Locked) &bull; Role: <span className="font-bold">STAFF</span> (Locked)
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@queuecraft.local"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="MORNING">MORNING</option>
                    <option value="EVENING">EVENING</option>
                    <option value="FULL_DAY">FULL_DAY</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Counter Number</label>
                  <input
                    type="text"
                    placeholder="e.g. CTR-03"
                    value={formData.assignedCounterId}
                    onChange={(e) => setFormData({ ...formData, assignedCounterId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Specialization / Service Type</label>
                <input
                  type="text"
                  placeholder="e.g. Verification &amp; Document Release"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Onboard Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Staff &bull; {editingStaff.name}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="MORNING">MORNING</option>
                    <option value="EVENING">EVENING</option>
                    <option value="FULL_DAY">FULL_DAY</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Counter Number</label>
                  <input
                    type="text"
                    value={formData.assignedCounterId}
                    onChange={(e) => setFormData({ ...formData, assignedCounterId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Service Type</label>
                <input
                  type="text"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaff;
