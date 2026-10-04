import { useState } from 'react';
import { adminAccountApi } from '../../api/accountApi';
import { Alert, Button, Input, PageHeader, PageLoader, Panel } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { dateTime } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

const UNITS = {
  'commission.percent': '%',
  'booking.holdMinutes': 'phút',
  'escrow.autoReleaseHours': 'giờ',
  'cancel.fullRefundHours': 'giờ',
  'slots.generateWeeks': 'tuần',
};

export function ConfigsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminAccountApi.configs(), []);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);

  const save = async (key) => {
    setSaving(key);
    try {
      await adminAccountApi.updateConfig(key, edits[key]);
      toast.success('Đã lưu cấu hình');
      setEdits((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHeader title="Cấu hình hệ thống" description="Các thông số áp dụng cho buổi học mới. Mọi thay đổi đều được ghi vào nhật ký." />
      {loading && <PageLoader />}
      {error && <Alert tone="bad">{error.message}</Alert>}
      <Panel padded={false}>
        <ul>
          {data?.map((c) => {
            const v = edits[c.key] ?? c.value;
            const dirty = edits[c.key] !== undefined && edits[c.key] !== c.value;
            return (
              <li key={c.key} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.description}</div>
                  <div className="text-sm text-muted">
                    Khóa <code>{c.key}</code> · từ {c.min} đến {c.max} · cập nhật {dateTime(c.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24 text-right tabular"
                    value={v}
                    min={c.min}
                    max={c.max}
                    onChange={(e) => setEdits({ ...edits, [c.key]: e.target.value })}
                    aria-label={c.description}
                  />
                  <span className="w-10 text-sm text-ink-soft">{UNITS[c.key]}</span>
                  <Button size="sm" disabled={!dirty} loading={saving === c.key} onClick={() => save(c.key)}>
                    Lưu
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
