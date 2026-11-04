import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { refreshSession, setAccessToken } from '../utils/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the HttpOnly refresh cookie.
  useEffect(() => {
    let alive = true;
    refreshSession()
      .then((d) => alive && setUser(d.user))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    const onOut = () => setUser(null);
    window.addEventListener('ff:signed-out', onOut);
    return () => { alive = false; window.removeEventListener('ff:signed-out', onOut); };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/users/login/', { email, password });
    setAccessToken(data.access);
    setUser(data.user);
  }, []);

  const register = useCallback((username, email, password) =>
    api.post('/users/register/', { username, email, password }), []);

  const logout = useCallback(async () => {
    try { await api.post('/users/logout/'); } catch { /* cookie is cleared server-side when reachable */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const reloadUser = useCallback(async () => {
    const { data } = await api.get('/users/profile/');
    setUser(data);
    return data;
  }, []);

  const value = useMemo(() => ({ user, setUser, ready, login, register, logout, reloadUser }),
    [user, ready, login, register, logout, reloadUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
