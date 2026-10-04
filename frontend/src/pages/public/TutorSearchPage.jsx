import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { tutorApi } from '../../api/tutorApi';
import { TutorRow } from '../../components/TutorRow';
import { Alert, Button, EmptyState, Field, Input, Pagination, Select, Spinner, cx } from '../../components/ui';
import { useAsync } from '../../utils/useAsync';
import { useMeta } from '../../utils/useMeta';

const SORTS = [
  ['rating', 'Điểm đánh giá cao'],
  ['price_asc', 'Học phí thấp đến cao'],
  ['price_desc', 'Học phí cao đến thấp'],
  ['newest', 'Mới tham gia'],
];
const FILTER_KEYS = ['subjectId', 'level', 'city', 'area', 'mode', 'minPrice', 'maxPrice', 'minRating', 'q', 'sort', 'page'];

export function TutorSearchPage() {
  const [params, setParams] = useSearchParams();
  const { data: meta } = useMeta();
  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState(params.get('q') || '');

  const query = useMemo(() => {
    const q = { size: 10 };
    FILTER_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) q[k] = v;
    });
    return q;
  }, [params]);

  const { data, loading, error } = useAsync(() => tutorApi.search(query), [JSON.stringify(query)]);

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v === '' || v === null || v === undefined) next.delete(k);
    else next.set(k, v);
    if (k !== 'page') next.delete('page');
    if (k === 'city') next.delete('area');
    setParams(next);
  };
  const areas = meta?.cities.find((c) => c.name === params.get('city'))?.areas || [];
  const activeCount = FILTER_KEYS.filter((k) => !['sort', 'page', 'q'].includes(k) && params.get(k)).length;

  const filters = (
    <div className="flex flex-col gap-4">
      <Field label="Môn học" htmlFor="f-subject">
        <Select id="f-subject" value={params.get('subjectId') || ''} onChange={(e) => set('subjectId', e.target.value)}>
          <option value="">Tất cả môn</option>
          {meta?.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cấp học" htmlFor="f-level">
        <Select id="f-level" value={params.get('level') || ''} onChange={(e) => set('level', e.target.value)}>
          <option value="">Mọi cấp học</option>
          {meta?.levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
      </Field>
      <Field label="Thành phố" htmlFor="f-city">
        <Select id="f-city" value={params.get('city') || ''} onChange={(e) => set('city', e.target.value)}>
          <option value="">Mọi nơi</option>
          {meta?.cities.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </Select>
      </Field>
      {areas.length > 0 && (
        <Field label="Khu vực" htmlFor="f-area">
          <Select id="f-area" value={params.get('area') || ''} onChange={(e) => set('area', e.target.value)}>
            <option value="">Mọi khu vực</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      )}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-soft">Hình thức học</legend>
        <div className="flex gap-2">
          {[
            ['', 'Tất cả'],
            ['ONLINE', 'Online'],
            ['OFFLINE', 'Tại nhà'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => set('mode', v)}
              className={cx(
                'flex-1 rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm',
                (params.get('mode') || '') === v ? 'border-violet bg-violet-tint font-medium text-violet' : 'border-line bg-white text-ink-soft',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-soft">Học phí mỗi giờ (đồng)</legend>
        <div className="flex items-center gap-2">
          <Input type="number" step={10000} min={0} placeholder="Từ" aria-label="Học phí từ" defaultValue={params.get('minPrice') || ''} onBlur={(e) => set('minPrice', e.target.value)} />
          <span className="text-muted">–</span>
          <Input type="number" step={10000} min={0} placeholder="Đến" aria-label="Học phí đến" defaultValue={params.get('maxPrice') || ''} onBlur={(e) => set('maxPrice', e.target.value)} />
        </div>
      </fieldset>
      <Field label="Điểm đánh giá" htmlFor="f-rating">
        <Select id="f-rating" value={params.get('minRating') || ''} onChange={(e) => set('minRating', e.target.value)}>
          <option value="">Bất kỳ</option>
          <option value="4.5">Từ 4,5 trở lên</option>
          <option value="4">Từ 4,0 trở lên</option>
          <option value="3">Từ 3,0 trở lên</option>
        </Select>
      </Field>
      {activeCount > 0 && (
        <Button variant="ghost" onClick={() => setParams(new URLSearchParams(params.get('sort') ? { sort: params.get('sort') } : {}))}>
          <X className="size-4" /> Xóa bộ lọc
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-[28px] font-bold">Tìm gia sư</h1>
          <p className="text-ink-soft">{data ? `${data.totalElements} gia sư phù hợp` : 'Đang tìm…'}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set('q', keyword.trim());
          }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <Input placeholder="Tên gia sư hoặc từ khóa" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="sm:w-64" aria-label="Từ khóa" />
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
        </form>
        <Select className="w-full sm:w-56" value={params.get('sort') || 'rating'} onChange={(e) => set('sort', e.target.value)} aria-label="Sắp xếp">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal className="size-4" /> Bộ lọc{activeCount ? ` (${activeCount})` : ''}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={cx('rounded-[var(--radius-md)] border border-line bg-white p-5 lg:block', showFilters ? 'block' : 'hidden')}>{filters}</aside>
        <div>
          {error && <Alert tone="bad">{error.message}</Alert>}
          {loading && !data && (
            <div className="grid h-40 place-items-center">
              <Spinner />
            </div>
          )}
          {data && data.items.length === 0 && (
            <EmptyState title="Chưa có gia sư khớp bộ lọc">Thử bỏ bớt điều kiện, chọn thành phố khác hoặc tăng mức học phí.</EmptyState>
          )}
          {data && data.items.length > 0 && (
            <div className={cx('rounded-[var(--radius-md)] border border-line bg-white', loading && 'opacity-60')}>
              {data.items.map((t) => (
                <TutorRow key={t.id} t={t} />
              ))}
            </div>
          )}
          <Pagination page={Number(params.get('page') || 1)} totalPages={data?.totalPages} onChange={(p) => set('page', p)} />
        </div>
      </div>
    </div>
  );
}
