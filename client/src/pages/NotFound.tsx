import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { user, getDashboardPath } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center antialiased">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">404 - Page Not Found</h1>
        <p className="text-slate-500 text-sm mb-6">
          The destination page does not exist or has been relocated.
        </p>
        <Link
          to={user ? getDashboardPath(user.role) : '/login'}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {user ? 'Return to Dashboard' : 'Back to Sign In'}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
