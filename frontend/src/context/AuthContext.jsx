import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('ip_token')) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('ip_token'))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback(({ token, user: nextUser }) => {
    localStorage.setItem('ip_token', token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ip_token');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, saveSession, logout, setUser }),
    [user, loading, saveSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
