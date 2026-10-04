import { useState } from 'react';
import { Clock, FastForward, RotateCcw, Play } from 'lucide-react';
import { demoApi } from '../../api/bookingApi';
import { Alert, Button, PageHeader, Panel, Stat } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { dateTime } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

/**
 * Tua thời gian để trình diễn các mốc tự động khi bảo vệ đồ án:
 * hết 15 phút giữ chỗ, hết giờ học, 48 giờ tự giải ngân.
 */
export function DemoToolsPage() {
  const toast = useToast();
  const clock = useAsync(() => demoApi.clock(), []);
  const [busy, setBusy] = useState(null);
  const [last, setLast] = useState(null);

  const act = async (key, fn) => {
    setBusy(key);
    try {
      const r = await fn();
      setLast(r.jobs || (r.expired !== undefined ? r : null));
      clock.reload({ silent: true });
      toast.success('Đã cập nhật đồng hồ hệ thống');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const c = clock.data;
  return (
    <>
      <PageHeader title="Công cụ demo" description="Tua đồng hồ nghiệp vụ của hệ thống để xem các bước tự động mà không phải chờ thật. Chỉ có khi chạy ở chế độ demo." />
      {clock.error && <Alert tone="bad">{clock.error.message}</Alert>}
      {c && !c.demoMode && <Alert tone="warn">Đang tắt chế độ demo (DEMO_MODE=false).</Alert>}
      {c && (
        <Panel className="mb-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat label="Giờ hệ thống (nghiệp vụ)" value={dateTime(c.now)} />
            <Stat label="Giờ thật" value={dateTime(c.realNow)} />
            <Stat label="Đang lệch" value={`${c.offsetHours > 0 ? '+' : ''}${c.offsetHours} giờ`} />
          </div>
        </Panel>
      )}
      <Panel title="Tua thời gian">
        <div className="flex flex-wrap gap-2">
          {[
            [0.5, '+30 phút', 'Hết hạn giữ chỗ chưa thanh toán'],
            [3, '+3 giờ', 'Qua giờ học, chuyển sang chờ xác nhận'],
            [24, '+1 ngày', ''],
            [48, '+48 giờ', 'Hết hạn khiếu nại, tự giải ngân'],
          ].map(([h, l, hint]) => (
            <Button key={h} variant="secondary" loading={busy === h} onClick={() => act(h, () => demoApi.travel(h))} title={hint}>
              <FastForward className="size-4" /> {l}
            </Button>
          ))}
          <Button variant="secondary" loading={busy === 'run'} onClick={() => act('run', demoApi.runJobs)}>
            <Play className="size-4" /> Chạy job ngay
          </Button>
          <Button variant="ghost" loading={busy === 'reset'} onClick={() => act('reset', demoApi.reset)}>
            <RotateCcw className="size-4" /> Về giờ thật
          </Button>
        </div>
        {last && (
          <p className="mt-4 flex items-center gap-2 text-ink-soft">
            <Clock className="size-4" /> Job vừa chạy: {last.expired} buổi hết hạn giữ chỗ, {last.awaiting} buổi chuyển sang chờ xác nhận, {last.completed} buổi tự giải ngân.
          </p>
        )}
        <p className="mt-4 text-sm text-muted">
          Gợi ý kịch bản: đặt một buổi → thanh toán → tua +3 giờ sau giờ học → học viên xác nhận (hoặc tua +48 giờ để xem tự giải ngân) → mở Dòng tiền để thấy sổ sách khớp.
        </p>
      </Panel>
    </>
  );
}
