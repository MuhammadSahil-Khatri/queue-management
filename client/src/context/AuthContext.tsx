import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, Role } from '../api/auth.api.ts';
import { setAccessToken } from '../api/axios.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordPlain: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string | null }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshSession: () => Promise<void>;
  getDashboardPath: (role?: Role) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getRoleDashboardPath(role?: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'MANAGER':
      return '/manager';
    case 'STAFF':
      return '/staff';
    case 'CUSTOMER':
    default:
      return '/customer';
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via silent refresh
  const refreshSession = async () => {
    try {
      const data = await authApi.refresh();
      setUser(data.user);
    } catch {
      // Not logged in or expired session
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const handleSessionExpired = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, passwordPlain: string): Promise<User> => {
    const data = await authApi.login({ email, password: passwordPlain });
    setUser(data.user);
    return data.user;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<User> => {
    const res = await authApi.register(data);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string | null }) => {
    const res = await authApi.updateMe(data);
    setUser(res.user);
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    await authApi.changePassword(data);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshSession,
        getDashboardPath: (r) => getRoleDashboardPath(r || user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
