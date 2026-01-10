import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react';
import { authAPI, setAuthHandlers } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = useCallback((token, nextUser) => {
    if (token) localStorage.setItem('token', token);
    if (nextUser) localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser || null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // trigger cross-tab sync
    localStorage.setItem('logout_sync', String(Date.now()));
  }, []);

  const logout = useCallback(() => {
    clearSession();
    // optional: window.location.assign('/auth');
  }, [clearSession]);

  const register = useCallback(async ({ name, email, password }) => {
    const res = await authAPI.register({ name, email, password });
    const token =
      res?.data?.data?.token ?? res?.data?.token ?? res?.data?.accessToken;
    const nextUser =
      res?.data?.data?.user ?? res?.data?.user ?? res?.data?.profile;

    if (!token || !nextUser) throw new Error('Unexpected register response');
    saveSession(token, nextUser);
    return nextUser;
  }, [saveSession]);

  const login = useCallback(async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    const token =
      res?.data?.data?.token ?? res?.data?.token ?? res?.data?.accessToken;
    const nextUser =
      res?.data?.data?.user ?? res?.data?.user ?? res?.data?.profile;

    if (!token || !nextUser) throw new Error('Invalid email or password');
    saveSession(token, nextUser);
    return nextUser;
  }, [saveSession]);

  // Verify token once on app load
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await authAPI.getProfile();
        const nextUser =
          res?.data?.data?.user ?? res?.data?.user ?? res?.data?.data ?? null;

        if (nextUser) {
          saveSession(token, nextUser);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [saveSession, clearSession]);

  // Cross-tab logout/token removal
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) setUser(null);
      if (e.key === 'logout_sync') setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Allow axios interceptor to trigger logout on 401
  useEffect(() => {
    setAuthHandlers({ onLogout: logout });
  }, [logout]);

  const value = useMemo(
    () => ({ user, setUser, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}