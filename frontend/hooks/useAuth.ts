import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';
import api, { getErrorMessage } from '@/utils/api';
import { storeTokens, clearTokens, isAuthenticated, getAccessToken } from '@/utils/auth';
import { useRouter } from 'next/router';

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<User>('/user');
      setUser(data);
    } catch {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    storeTokens(data.accessToken, data.idToken, data.refreshToken);
    setUser({ id: data.userId, email, createdAt: '' });
    // Fetch full user profile
    const profile = await api.get<User>('/user');
    setUser(profile.data);
  };

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  return createElement(AuthContext.Provider, {
    value: { user, loading, login, logout, isLoggedIn: !!user },
    children,
  });
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
