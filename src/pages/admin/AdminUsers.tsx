import React, { useState, useEffect } from 'react';
import { userApi, User, Department, AuditLog } from '../../api/user.api.ts';
import { Role, Shift, StaffStatus } from '../../api/auth.api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit2,
  Power,
  Trash2,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building,
  KeyRound,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search, filter & pagination state
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER' as Role,
    departmentId: '',
    shift: 'FULL_DAY' as Shift,
    serviceType: '',
    assignedCounterId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.listUsers({
        search: search.trim() || undefined,
        role: selectedRole !== 'ALL' ? (selectedRole as Role) : undefined,
        departmentId: selectedDept !== 'ALL' ? selectedDept : undefined,
        isActive: selectedStatus === 'ALL' ? undefined : selectedStatus === 'ACTIVE',
        page,
        limit: 10,
      });
      setUsers(res.users);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await userApi.listDepartments();
      setDepartments(res.departments);
    } catch (e) {
      console.error('Error fetching departments:', e);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole, selectedDept, selectedStatus, page]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CUSTOMER',
      departmentId: departments[0]?.id || '',
      shift: 'FULL_DAY',
      serviceType: '',
      assignedCounterId: '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (target: User) => {
    setEditingUser(target);
    setFormData({
      name: target.name,
      email: target.email,
      phone: target.phone || '',
      password: '',
      role: target.role,
      departmentId: target.departmentId || departments[0]?.id || '',
      shift: target.staffProfile?.shift || 'FULL_DAY',
      serviceType: target.staffProfile?.serviceType || '',
      assignedCounterId: target.staffProfile?.assignedCounterId || '',
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
        role: formData.role,
        departmentId:
          formData.role === 'STAFF' || formData.role === 'MANAGER'
            ? formData.departmentId
            : undefined,
        shift: formData.shift,
        serviceType: formData.serviceType || undefined,
        assignedCounterId: formData.assignedCounterId || undefined,
      });
      setShowCreateModal(false);
      setActionSuccess(`User ${formData.name} created successfully`);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);
    setFormSubmitting(true);
    try {
      await userApi.updateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        departmentId:
          formData.role === 'STAFF' || formData.role === 'MANAGER'
            ? formData.departmentId
            : null,
        shift: formData.shift,
        serviceType: formData.serviceType || null,
        assignedCounterId: formData.assignedCounterId || null,
      });
      setShowEditModal(false);
      setActionSuccess(`User ${formData.name} updated successfully`);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to update user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const actionName = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} account "${user.name}"?`)) {
      return;
    }
    try {
      await userApi.updateStatus(user.id, !user.isActive);
      setActionSuccess(`User status changed to ${!user.isActive ? 'Active' : 'Deactivated'}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || `Failed to ${actionName} user`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${user.name}"?`)) {
      return;
    }
    try {
      await userApi.deleteUser(user.id);
      setActionSuccess(`User "${user.name}" was removed successfully`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const handleOpenAuditLogs = async () => {
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const res = await userApi.listAuditLogs();
      setAuditLogs(res.logs);
    } catch (e) {
      console.error('Audit log fetch error:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Directory &amp; RBAC</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administer accounts, roles, department assignments, and security audits across the organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAuditLogs}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            Audit Logs
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-700 text-white hover:bg-purple-800 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create User
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-purple-600 transition"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="STAFF">STAFF</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-purple-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department &amp; Staff ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No users matching the filters found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : u.role === 'STAFF'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {u.departmentName || '—'}
                        </div>
                        {u.staffProfile && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            ID: {u.staffProfile.staffCode} &bull; {u.staffProfile.shift}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                : u.isActive
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={
                              isCurrent
                                ? 'Cannot deactivate yourself'
                                : u.isActive
                                ? 'Deactivate User'
                                : 'Activate User'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleDeleteUser(u)}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isCurrent ? 'Cannot delete yourself' : 'Delete User'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total: <strong>{totalCount}</strong> users (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-700" />
                Create New User Account
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
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  >
                    <option value="CUSTOMER">CUSTOMER (Visitor)</option>
                    <option value="STAFF">STAFF (Service Staff)</option>
                    <option value="MANAGER">MANAGER (Dept Manager)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                  </select>
                </div>

                {(formData.role === 'STAFF' || formData.role === 'MANAGER') && (
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Department</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {(formData.role === 'STAFF' || formData.role === 'MANAGER') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase">
                    Staff Profile Configuration
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Assigned Shift</label>
                      <select
                        value={formData.shift}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="MORNING">MORNING</option>
                        <option value="EVENING">EVENING</option>
                        <option value="FULL_DAY">FULL_DAY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Counter ID</label>
                      <input
                        type="text"
                        placeholder="e.g. CTR-01"
                        value={formData.assignedCounterId}
                        onChange={(e) => setFormData({ ...formData, assignedCounterId: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Service Type</label>
                    <input
                      type="text"
                      placeholder="e.g. Identity Verification &amp; Passports"
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

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
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit User &bull; {editingUser.name}
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
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    disabled={editingUser.id === currentAdmin?.id}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {editingUser.id === currentAdmin?.id && (
                    <span className="text-[10px] text-amber-600 block mt-1">
                      Admins cannot demote their own account
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600"
                  >
                    <option value="">None / Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(formData.role === 'STAFF' || formData.role === 'MANAGER') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase">
                    Staff Assignment Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Shift</label>
                      <select
                        value={formData.shift}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="MORNING">MORNING</option>
                        <option value="EVENING">EVENING</option>
                        <option value="FULL_DAY">FULL_DAY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Counter ID</label>
                      <input
                        type="text"
                        value={formData.assignedCounterId}
                        onChange={(e) => setFormData({ ...formData, assignedCounterId: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Service Type</label>
                    <input
                      type="text"
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

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

      {/* AUDIT LOGS MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-700" />
                Security &amp; Activity Audit Log
              </h2>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {loadingAudit ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                  Loading audit events...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No security events recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 font-mono text-[11px] px-2 py-0.5 bg-slate-100 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Target: <span className="font-medium">{log.targetType}</span>{' '}
                      {log.targetId && (
                        <span className="font-mono text-[10px] text-slate-400">
                          ({log.targetId})
                        </span>
                      )}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="p-2 bg-slate-50 rounded text-[10px] font-mono text-slate-600 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
