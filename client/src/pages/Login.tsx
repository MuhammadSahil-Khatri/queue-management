import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      // Redirect to the role's appropriate dashboard or original destination
      const from = (location.state as any)?.from?.pathname;
      const target = from || getDashboardPath(user.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid email or password';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoAccount = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-xl">
            Q
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          QueueCraft
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Digital Queue &amp; Appointment System &bull; Secure Portal Sign In
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New customer?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Roles Quick Selector for Seamless Hackathon Evaluation */}
        <div className="mt-6 bg-slate-100/80 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Quick Demo Login (1-Click Fill)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('admin@queuecraft.local', 'AdminPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-purple-700">Admin</div>
              <div className="text-[10px] text-slate-400 truncate">admin@queuecraft...</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('manager@queuecraft.local', 'ManagerPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-blue-700">Manager</div>
              <div className="text-[10px] text-slate-400 truncate">manager@queuecraft...</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('staff1@queuecraft.local', 'StaffPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-emerald-700">Staff 1</div>
              <div className="text-[10px] text-slate-400 truncate">staff1@queuecraft...</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('staff2@queuecraft.local', 'StaffPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-teal-200 hover:border-teal-400 hover:bg-teal-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-teal-700">Staff 2</div>
              <div className="text-[10px] text-slate-400 truncate">staff2@queuecraft...</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('customer1@queuecraft.local', 'CustomerPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-amber-700">Customer 1</div>
              <div className="text-[10px] text-slate-400 truncate">customer1@queuecraft...</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('customer2@queuecraft.local', 'CustomerPass123!')}
              className="text-left p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="font-semibold text-amber-700">Customer 2</div>
              <div className="text-[10px] text-slate-400 truncate">customer2@queuecraft...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
