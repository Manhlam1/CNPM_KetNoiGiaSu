import { useEffect, useState } from 'react';

/** Đếm ngược tới `until`, tính theo đồng hồ máy chủ (serverNow) để đúng cả khi đang tua thời gian demo */
export function useCountdown(until, serverNow) {
  const [left, setLeft] = useState(() => (until ? new Date(until) - new Date(serverNow || Date.now()) : 0));
  useEffect(() => {
    if (!until) return undefined;
    const start = Date.now();
    const base = new Date(until) - new Date(serverNow || Date.now());
    setLeft(base);
    const t = setInterval(() => setLeft(base - (Date.now() - start)), 1000);
    return () => clearInterval(t);
  }, [until, serverNow]);
  return Math.max(0, left);
}

export const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
