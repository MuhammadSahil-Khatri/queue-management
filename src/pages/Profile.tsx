import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  Building,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  Clock,
  IdCard,
} from 'lucide-react';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().optional(),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export const Profile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onUpdateProfile = async (data: ProfileFormData) => {
    setProfileSuccess(null);
    setProfileError(null);
    setProfileSaving(true);
    try {
      await updateProfile({
        name: data.name,
        phone: data.phone || null,
      });
      setProfileSuccess('Profile details updated successfully');
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordChangeFormData) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess('Password changed successfully. Your active sessions were secured.');
      resetPasswordForm();
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account &amp; Security</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information, view assigned role credentials, and update password.
        </p>
      </div>

      {/* Role & System Badges Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white tracking-wide">
              {user?.role}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${user?.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {user?.isActive ? 'Active Account' : 'Deactivated'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Department
            </div>
            <p className="font-semibold text-slate-800">
              {user?.departmentName || 'Not assigned / Global'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <IdCard className="w-3.5 h-3.5 text-slate-400" />
              Staff Code
            </div>
            <p className="font-semibold text-slate-800 font-mono">
              {user?.staffProfile?.staffCode || 'N/A (Visitor)'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last Signed In
            </div>
            <p className="font-semibold text-slate-800 text-xs truncate">
              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Current Session'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Info Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Personal Information</h3>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                {profileError}
              </div>
            )}

            <form id="profile-form" className="space-y-4" onSubmit={handleProfileSubmit(onUpdateProfile)}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  {...registerProfile('name')}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none transition ${
                    profileErrors.name
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {profileErrors.name && (
                  <p className="mt-1 text-xs text-rose-600">{profileErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email (Immutable)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400">Email changes require admin support</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...registerProfile('phone')}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              type="submit"
              form="profile-form"
              disabled={profileSaving}
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Profile Changes
            </button>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Change Password</h3>
            </div>

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                {passwordError}
              </div>
            )}

            <form id="password-form" className="space-y-4" onSubmit={handlePasswordSubmit(onChangePassword)}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('currentPassword')}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none transition ${
                    passwordErrors.currentPassword
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs text-rose-600">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  {...registerPassword('newPassword')}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none transition ${
                    passwordErrors.newPassword
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs text-rose-600">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  {...registerPassword('confirmPassword')}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none transition ${
                    passwordErrors.confirmPassword
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              type="submit"
              form="password-form"
              disabled={passwordSaving}
              className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
