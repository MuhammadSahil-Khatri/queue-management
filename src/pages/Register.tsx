import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock, Mail, User, Phone, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    phone: z.string().trim().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include at least one letter')
      .regex(/\d/, 'Password must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;

export const Register: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await registerAuth({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });
      navigate('/customer', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
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
          Create Account
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Self sign-up for visitor queue appointments &amp; live tickets
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
                Full Name
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  {...register('name')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.name
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
            </div>

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
                  placeholder="jane@example.com"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...register('phone')}
                  className="block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
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
                  placeholder="Min. 8 chars, 1 letter, 1 number"
                  {...register('password')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  {...register('confirmPassword')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 sm:text-sm rounded-xl border bg-white focus:outline-none transition ${
                    errors.confirmPassword
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
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
                  Creating account...
                </>
              ) : (
                <>
                  Register as Customer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
