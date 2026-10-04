import { useState } from 'react';
import { tutorApi } from '../api/tutorApi';
import { useAsync } from '../utils/useAsync';
import { date } from '../utils/format';
import { Avatar, Button } from './ui';

/** Phân bố điểm + danh sách đánh giá (kèm phản hồi của gia sư) */
export function ReviewList({ tutorId, distribution, total }) {
  const [size, setSize] = useState(5);
  const { data } = useAsync(() => tutorApi.reviews(tutorId, { page: 1, size }), [tutorId, size]);
  if (!total) return <p className="text-ink-soft">Chưa có đánh giá nào. Học viên chỉ đánh giá được sau khi buổi học hoàn tất.</p>;
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <ul className="flex flex-col gap-1.5" aria-label="Phân bố điểm">
        {[5, 4, 3, 2, 1].map((s) => {
          const n = distribution?.[s] || 0;
          return (
            <li key={s} className="flex items-center gap-2 text-sm">
              <span className="w-3 font-[family-name:var(--font-hand)] text-base text-redpen">{s}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-wash">
                <span className="block h-full rounded-full bg-redpen/70" style={{ width: `${(n / total) * 100}%` }} />
              </span>
              <span className="tabular w-6 text-right text-muted">{n}</span>
            </li>
          );
        })}
      </ul>
      <ul className="flex flex-col gap-5">
        {data?.items.map((r) => (
          <li key={r.id} className="flex gap-3">
            <Avatar name={r.student.fullName} url={r.student.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{r.student.fullName}</span>
                <span className="font-[family-name:var(--font-hand)] text-lg text-redpen">{r.rating}/5</span>
                <span className="text-sm text-muted">{date(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-0.5 text-ink-soft">{r.comment}</p>}
              {r.tutorReply && <p className="mt-2 border-l-2 border-violet pl-3 text-sm text-ink-soft">Gia sư phản hồi: {r.tutorReply}</p>}
            </div>
          </li>
        ))}
        {data && data.totalElements > data.items.length && (
          <li>
            <Button variant="secondary" size="sm" onClick={() => setSize((s) => s + 10)}>
              Xem thêm đánh giá
            </Button>
          </li>
        )}
      </ul>
    </div>
  );
}
