import { useEffect, useRef, useState } from 'react';

/**
 * Biểu đồ cột một chuỗi (SVG thuần):
 *  - cột tối đa 24px, bo 4px ở đầu, mọc từ một đường đáy
 *  - lưới mảnh, nhãn trục bằng màu chữ (không dùng màu dữ liệu cho chữ)
 *  - chỉ ghi số trên cột cao nhất và cột cuối; giá trị còn lại xem khi rê chuột/focus hoặc ở bảng số liệu
 */
const niceStep = (max, ticks = 4) => {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
};

const roundedTop = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

export function ColumnChart({ data, format = (v) => v, compact = format, height = 200, label }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!wrap.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const m = { top: 22, right: 8, bottom: 26, left: 60 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const step = niceStep(max);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v) => m.top + innerH - (v / top) * innerH;
  const band = innerW / data.length;
  const bw = Math.min(24, band * 0.55);
  const maxIdx = data.findIndex((d) => d.value === max && max > 0);
  const labelled = new Set([maxIdx, data.length - 1].filter((i) => i >= 0 && data[i].value > 0));

  return (
    <div ref={wrap} className="relative">
      <svg width={width} height={height} role="img" aria-label={label} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)" className="tabular">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = m.left + band * i + band / 2;
          const h = Math.max(0, y(0) - y(d.value));
          const active = hover === i;
          return (
            <g key={d.label}>
              {h > 0 && <path d={roundedTop(cx - bw / 2, y(d.value), bw, h, 4)} fill="var(--color-violet)" opacity={hover === null || active ? 1 : 0.55} />}
              {labelled.has(i) && (
                <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-ink)">
                  {compact(d.value)}
                </text>
              )}
              <text x={cx} y={height - 8} textAnchor="middle" fontSize="12" fill="var(--color-ink-soft)">
                {d.label}
              </text>
              <rect
                x={m.left + band * i}
                y={m.top}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.label}: ${format(d.value)}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: 'none' }}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[var(--radius-sm)] border border-line bg-white px-3 py-1.5 text-sm shadow-md"
          style={{ left: m.left + band * hover + band / 2, top: Math.max(0, y(data[hover].value) - 52) }}
        >
          <div className="tabular font-semibold text-ink">{format(data[hover].value)}</div>
          <div className="text-muted">{data[hover].label}</div>
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-soft">Xem bảng số liệu</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-line/70">
                <td className="py-1 text-ink-soft">{d.label}</td>
                <td className="tabular py-1 text-right">{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
