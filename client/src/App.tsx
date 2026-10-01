import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import RoleRoute from './components/RoleRoute.tsx';
import AppLayout from './components/AppLayout.tsx';

import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Profile from './pages/Profile.tsx';
import CustomerDashboard from './pages/dashboards/CustomerDashboard.tsx';
import StaffDashboard from './pages/dashboards/StaffDashboard.tsx';
import ManagerDashboard from './pages/dashboards/ManagerDashboard.tsx';
import AdminDashboard from './pages/dashboards/AdminDashboard.tsx';
import AdminUsers from './pages/admin/AdminUsers.tsx';
import ManagerStaff from './pages/manager/ManagerStaff.tsx';
import ArchitectureView from './pages/ArchitectureView.tsx';
import BookingWizard from './pages/BookingWizard.tsx';
import JoinQueue from './pages/JoinQueue.tsx';
import MyAppointments from './pages/MyAppointments.tsx';
import NotFound from './pages/NotFound.tsx';

// Root redirect handler
const RootRedirect: React.FC = () => {
  const { user, loading, getDashboardPath } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
};

// Prevent authenticated users from staying on /login or /register
const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading, getDashboardPath } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authenticated Layout Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Workflow Module Routes */}
              <Route path="/book" element={<BookingWizard />} />
              <Route path="/join-queue" element={<JoinQueue />} />
              <Route path="/my-appointments" element={<MyAppointments />} />

              {/* Profile and Architecture */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/architecture" element={<ArchitectureView />} />

              {/* CUSTOMER Routes */}
              <Route element={<RoleRoute allowedRoles={['CUSTOMER']} />}>
                <Route path="/customer" element={<CustomerDashboard />} />
              </Route>

              {/* STAFF Routes */}
              <Route element={<RoleRoute allowedRoles={['STAFF']} />}>
                <Route path="/staff" element={<StaffDashboard />} />
              </Route>

              {/* MANAGER Routes */}
              <Route element={<RoleRoute allowedRoles={['MANAGER']} />}>
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="/manager/staff" element={<ManagerStaff />} />
              </Route>

              {/* ADMIN Routes */}
              <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
