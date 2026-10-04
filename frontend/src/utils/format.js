// Định dạng tiền và thời gian theo Việt Nam (Asia/Ho_Chi_Minh)
const TZ = 'Asia/Ho_Chi_Minh';
const nf = new Intl.NumberFormat('vi-VN');

export const money = (n) => (n === null || n === undefined ? '—' : `${nf.format(Math.round(n))}đ`);
export const number = (n) => (n === null || n === undefined ? '—' : nf.format(n));

const dtf = (opts) => new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opts });

export const dateTime = (d) =>
  d ? dtf({ hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—';
export const date = (d) => (d ? dtf({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—');
export const time = (d) => (d ? dtf({ hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—');
export const weekday = (d) => (d ? dtf({ weekday: 'long' }).format(new Date(d)) : '—');
export const shortDay = (d) => (d ? dtf({ weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(d)) : '—');

/** "Thứ Hai, 06/10 · 19:00–21:00" */
export const lessonTime = (start, end) => {
  if (!start) return '—';
  const s = new Date(start);
  const day = dtf({ weekday: 'long', day: '2-digit', month: '2-digit' }).format(s);
  return `${day[0].toUpperCase()}${day.slice(1)}, ${time(start)}–${time(end)}`;
};

/** Khóa ngày theo giờ VN: "2026-10-06" */
export const vnDateKey = (d) => {
  const parts = dtf({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(d));
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const relative = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return date(d);
};

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
