import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { authStore, http } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const Ctx = createContext({ counts: { notifications: 0, messages: 0 }, socket: null, refreshCounts: () => {} });

/**
 * Kết nối realtime (Socket.IO) khi đã đăng nhập:
 *  - "notification:new"  -> tăng số thông báo chưa đọc + hiện toast
 *  - "message:new"       -> các trang chat tự lắng nghe qua useRealtime().socket
 */
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
  const [socket, setSocket] = useState(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const refreshCounts = useCallback(async () => {
    try {
      const c = await http.get('/notifications/counts');
      setCounts({ notifications: c.notifications || 0, messages: c.messages || 0 });
    } catch {
      /* chưa đăng nhập hoặc backend chưa sẵn sàng */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setCounts({ notifications: 0, messages: 0 });
      return undefined;
    }
    refreshCounts();
    const s = io({ path: '/socket.io', auth: { token: authStore.token() }, transports: ['websocket', 'polling'] });
    s.on('notification:new', (n) => {
      setCounts((c) => ({ ...c, notifications: c.notifications + 1 }));
      toastRef.current.info(n.title);
    });
    s.on('message:new', (m) => {
      if (m.senderId !== user.id) setCounts((c) => ({ ...c, messages: c.messages + 1 }));
    });
    s.on('counts:refresh', refreshCounts);
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user?.id, refreshCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ counts, socket, refreshCounts, setCounts }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
