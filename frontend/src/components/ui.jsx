// ============================================================
//  Bộ component giao diện dùng chung (TV2 phụ trách)
// ============================================================
import { forwardRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { initials, money } from '../utils/format';

const cx = (...c) => c.filter(Boolean).join(' ');
export { cx };

const BTN = {
  primary: 'bg-violet text-white hover:bg-violet-dark disabled:bg-violet/50',
  secondary: 'bg-white text-ink border border-line hover:border-ink-soft/40 hover:bg-wash disabled:text-muted',
  ghost: 'text-ink-soft hover:bg-wash hover:text-ink disabled:text-muted',
  danger: 'bg-redpen text-white hover:bg-[#b33320] disabled:bg-redpen/50',
  ok: 'bg-ok text-white hover:bg-[#186540] disabled:bg-ok/50',
};
const SIZE = { sm: 'h-8 px-3 text-sm gap-1.5', md: 'h-10 px-4 text-[15px] gap-2', lg: 'h-12 px-5 text-base gap-2' };

export function Button({ variant = 'primary', size = 'md', loading, disabled, to, className, children, type = 'button', ...rest }) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed',
    BTN[variant],
    SIZE[size],
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className, htmlFor }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-sm text-redpen">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  'w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15 disabled:bg-wash';

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputCls, 'h-10', className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(inputCls, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(inputCls, 'py-2 leading-relaxed', className)} {...rest} />;
});

const TONE = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn',
  bad: 'bg-redpen-tint text-redpen',
  info: 'bg-info-tint text-info',
  violet: 'bg-violet-tint text-violet',
  neutral: 'bg-wash text-muted',
};

export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap', TONE[tone], className)}>
      {children}
    </span>
  );
}

/** Hiển thị trạng thái từ bảng nhãn [label, tone] */
export function StatusBadge({ map, value, className }) {
  const [label, tone] = map[value] || [value, 'neutral'];
  return (
    <Badge tone={tone} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </Badge>
  );
}

export function Money({ value, className }) {
  return <span className={cx('tabular font-semibold', className)}>{money(value)}</span>;
}

/**
 * "Điểm bút đỏ": điểm đánh giá trung bình viết tay trong vòng tròn đỏ,
 * như cô giáo chấm điểm. Là chi tiết nhận diện của TutorHub.
 */
export function GradeMark({ score, count, size = 'md', animate = false }) {
  const has = count > 0 && score;
  const dims = size === 'lg' ? 'size-[72px] text-[34px]' : size === 'sm' ? 'size-10 text-[19px]' : 'size-14 text-[26px]';
  return (
    <div className="flex items-center gap-2">
      <div
        className={cx(
          'grid place-items-center rounded-full border-2 font-[family-name:var(--font-hand)] leading-none',
          has ? 'border-redpen text-redpen' : 'border-line text-muted',
          animate && has && 'stamp-in',
          dims,
        )}
        style={{ transform: 'rotate(-8deg)' }}
        aria-label={has ? `Điểm đánh giá ${score} trên 5` : 'Chưa có đánh giá'}
      >
        {has ? Number(score).toFixed(1) : '–'}
      </div>
      {count !== undefined && (
        <div className="text-sm leading-tight text-muted">
          {has ? (
            <>
              <span className="text-ink-soft">/5</span>
              <br />
              {count} đánh giá
            </>
          ) : (
            'Chưa có đánh giá'
          )}
        </div>
      )}
    </div>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cx('size-5 animate-spin text-violet', className)} aria-label="Đang tải" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-7" />
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="oly-paper rounded-[var(--radius-md)] border border-line px-6 py-10 pl-16">
      <p className="font-[family-name:var(--font-hand)] text-2xl text-ink">{title}</p>
      {children && <div className="mt-1 max-w-prose text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', children, className }) {
  return <div className={cx('rounded-[var(--radius-sm)] px-4 py-3 text-[15px]', TONE[tone], className)}>{children}</div>;
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('w-full rounded-[var(--radius-md)] bg-white shadow-xl', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="rounded p-1 text-muted hover:bg-wash hover:text-ink" onClick={onClose} aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-end gap-2 text-sm" aria-label="Phân trang">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="tabular px-2 text-ink-soft">
        Trang {page} / {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Trang sau">
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

export function Avatar({ name, url, size = 40, className }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (url) return <img src={url} alt={name} style={style} className={cx('rounded-full object-cover', className)} />;
  return (
    <span style={style} className={cx('grid shrink-0 place-items-center rounded-full bg-violet-tint font-semibold text-violet', className)} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, padded = true }) {
  return (
    <section className={cx('rounded-[var(--radius-md)] border border-line bg-white', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            '-mb-px border-b-2 px-3 py-2 text-[15px] transition-colors',
            value === t.value ? 'border-violet font-semibold text-violet' : 'border-transparent text-ink-soft hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 tabular text-sm text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Bảng dữ liệu đơn giản, cuộn ngang trên màn hình nhỏ */
export function Table({ columns, rows, empty = 'Chưa có dữ liệu', rowKey = 'id', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[14.5px]">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            {columns.map((c) => (
              <th key={c.key} className={cx('px-4 py-2.5 font-medium', c.className)}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={r[rowKey]}
              className={cx('border-b border-line/70 last:border-0', onRowClick && 'cursor-pointer hover:bg-wash')}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 py-3 align-middle', c.className)}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular mt-0.5 text-2xl font-bold">{value}</div>
      {sub && <div className="text-sm text-ink-soft">{sub}</div>}
    </div>
  );
}
