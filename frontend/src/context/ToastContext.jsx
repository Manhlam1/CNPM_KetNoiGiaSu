import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

/** Thông báo nhỏ góc màn hình: toast.success('Đã lưu') */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove],
  );
  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };
  const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
  const TONE = { success: 'border-ok/30 text-ok', error: 'border-redpen/30 text-redpen', info: 'border-violet/30 text-violet' };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] border bg-white px-4 py-3 shadow-lg ${TONE[t.type]}`}>
              <Icon className="mt-0.5 size-5 shrink-0" />
              <p className="flex-1 text-[15px] text-ink">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-muted hover:text-ink" aria-label="Đóng thông báo">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
