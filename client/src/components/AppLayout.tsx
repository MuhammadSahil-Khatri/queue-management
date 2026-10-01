import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  Building2,
  LayoutDashboard,
  UserCheck,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  BadgeCheck,
  Layers,
  Calendar,
  Ticket,
  Clock,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout, getDashboardPath } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            MANAGER
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            STAFF
          </span>
        );
      case 'CUSTOMER':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <BadgeCheck className="w-3.5 h-3.5" />
            CUSTOMER
          </span>
        );
    }
  };

  // Dynamic Navigation Items based on Role Matrix
  const navItems = [];

  if (user?.role === 'ADMIN') {
    navItems.push(
      { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
      { label: 'User Directory', path: '/admin/users', icon: Users },
      { label: 'My Profile', path: '/profile', icon: UserIcon }
    );
  } else if (user?.role === 'MANAGER') {
    navItems.push(
      { label: 'Manager Dashboard', path: '/manager', icon: LayoutDashboard },
      { label: 'Department Staff', path: '/manager/staff', icon: Users },
      { label: 'My Profile', path: '/profile', icon: UserIcon }
    );
  } else if (user?.role === 'STAFF') {
    navItems.push(
      { label: 'Staff Counter', path: '/staff', icon: LayoutDashboard },
      { label: 'My Profile', path: '/profile', icon: UserIcon }
    );
  } else {
    navItems.push(
      { label: 'Customer Portal', path: '/customer', icon: LayoutDashboard },
      { label: 'Book Visit', path: '/book', icon: Calendar },
      { label: 'Join Queue', path: '/join-queue', icon: Ticket },
      { label: 'My Appointments', path: '/my-appointments', icon: Clock },
      { label: 'My Profile', path: '/profile', icon: UserIcon }
    );
  }

  // Section 8 Architecture & Data Model accessible to all roles
  navItems.push({
    label: 'Architecture',
    path: '/architecture',
    icon: Layers,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to={getDashboardPath(user?.role)} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold">
                Q
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight leading-none block">
                  QueueCraft
                </span>
                <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                  Chunk 2 Auth &amp; RBAC
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900 leading-tight">{user?.name}</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                {user?.departmentName && (
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                    {user.departmentName} &bull;
                  </span>
                )}
                {getRoleBadge(user?.role)}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition"
              title="Sign out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
            <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <div>{getRoleBadge(user?.role)}</div>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        QueueCraft &bull; Digital Queue &amp; Appointment Management System &bull; Chunk 2: Authentication &amp; Authorization
      </footer>
    </div>
  );
};

export default AppLayout;
