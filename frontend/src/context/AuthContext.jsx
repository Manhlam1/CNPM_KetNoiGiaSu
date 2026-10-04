import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authStore, http, setUnauthorizedHandler } from '../api/client';

const AuthCtx = createContext(null);

/** Trạng thái đăng nhập toàn ứng dụng */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authStore.get()?.user || null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    authStore.clear();
    setUser(null);
  }, []);

  /** Lưu kết quả đăng nhập { token, user } */
  const signIn = useCallback((result) => {
    authStore.set(result);
    setUser(result.user);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await http.get('/me');
    const stored = authStore.get();
    if (stored) authStore.set({ ...stored, user: me });
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (authStore.token()) {
      refreshMe()
        .catch(() => logout())
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, [logout, refreshMe]);

  return <AuthCtx.Provider value={{ user, initializing, signIn, logout, refreshMe, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
