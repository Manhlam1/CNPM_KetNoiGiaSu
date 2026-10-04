import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { chatApi } from '../../api/chatApi';
import { Avatar, Button, EmptyState, PageHeader, Spinner, cx } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { date, relative, time, vnDateKey } from '../../utils/format';
import { ROLE } from '../../utils/labels';

/** Khung chat của một hội thoại */
function Thread({ conv, onSent }) {
  const { user } = useAuth();
  const { socket, refreshCounts } = useRealtime();
  const toast = useToast();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);

  const markRead = useCallback(() => chatApi.markRead(conv.id).then(refreshCounts).catch(() => {}), [conv.id, refreshCounts]);

  useEffect(() => {
    let alive = true;
    setMessages(null);
    chatApi.messages(conv.id, { limit: 60 }).then((m) => alive && setMessages(m));
    markRead();
    return () => {
      alive = false;
    };
  }, [conv.id, markRead]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (m) => {
      if (m.conversationId !== conv.id) return;
      setMessages((xs) => (xs && !xs.some((x) => x.id === m.id) ? [...xs, m] : xs));
      if (m.senderId !== user.id) markRead();
    };
    const onRead = (e) => {
      if (e.conversationId === conv.id) setMessages((xs) => xs?.map((m) => (m.senderId === user.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)));
    };
    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
    };
  }, [socket, conv.id, user.id, markRead]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const m = await chatApi.send(conv.id, content);
      setMessages((xs) => (xs && !xs.some((x) => x.id === m.id) ? [...xs, m] : xs));
      setText('');
      onSent?.(conv.id, m);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  let lastDay = null;
  const lastMine = messages ? [...messages].reverse().find((m) => m.senderId === user.id) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/app/messages" className="rounded p-1 text-ink-soft hover:bg-wash md:hidden" aria-label="Quay lại danh sách">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={conv.other?.fullName} url={conv.other?.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{conv.other?.fullName}</div>
          <div className="text-xs text-muted">{ROLE[conv.other?.role]}</div>
        </div>
      </div>
      <div className="flex items-start gap-2 border-b border-line bg-violet-tint/40 px-4 py-2 text-[13px] text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet" />
        Đặt lịch và thanh toán qua TutorHub để học phí được giữ an toàn. Giao dịch ngoài nền tảng không được hỗ trợ khi có tranh chấp.
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!messages && <Spinner />}
        {messages?.length === 0 && <p className="py-10 text-center text-ink-soft">Chưa có tin nhắn. Hãy chào {conv.other?.fullName}.</p>}
        <div className="flex flex-col gap-1.5">
          {messages?.map((m) => {
            const mine = m.senderId === user.id;
            const day = vnDateKey(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && <div className="my-3 text-center text-xs text-muted">{date(m.createdAt)}</div>}
                <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug', mine ? 'rounded-br-md bg-violet text-white' : 'rounded-bl-md bg-wash text-ink')}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <div className={cx('mt-0.5 text-right text-[11px]', mine ? 'text-white/70' : 'text-muted')}>{time(m.createdAt)}</div>
                  </div>
                </div>
                {mine && lastMine?.id === m.id && <div className="mt-0.5 text-right text-[11px] text-muted">{m.readAt ? 'Đã xem' : 'Đã gửi'}</div>}
              </div>
            );
          })}
        </div>
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          rows={1}
          maxLength={2000}
          placeholder="Nhập tin nhắn, Enter để gửi"
          aria-label="Nội dung tin nhắn"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-[var(--radius-sm)] border border-line px-3 py-2 text-[15px] focus:border-violet focus:outline-none"
        />
        <Button type="submit" loading={sending} disabled={!text.trim()} aria-label="Gửi">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useRealtime();
  const [convs, setConvs] = useState(null);

  const load = useCallback(() => chatApi.list().then(setConvs).catch(() => setConvs([])), []);
  useEffect(() => {
    load();
  }, [load]);

  // Cập nhật danh sách khi có tin mới
  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (m) => {
      setConvs((cs) => {
        if (!cs) return cs;
        const found = cs.find((c) => c.id === m.conversationId);
        if (!found) {
          load();
          return cs;
        }
        const updated = { ...found, lastMessageAt: m.createdAt, lastMessagePreview: m.content, unread: m.senderId !== user.id && String(m.conversationId) !== id ? found.unread + 1 : found.unread };
        return [updated, ...cs.filter((c) => c.id !== m.conversationId)];
      });
    };
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [socket, id, user.id, load]);

  useEffect(() => {
    if (id) setConvs((cs) => cs?.map((c) => (String(c.id) === id ? { ...c, unread: 0 } : c)));
  }, [id]);

  const current = convs?.find((c) => String(c.id) === id);
  useEffect(() => {
    // Hội thoại vừa tạo chưa có trong danh sách
    if (id && convs && !current) load();
  }, [id, convs, current, load]);

  if (convs && convs.length === 0 && !id) {
    return (
      <>
        <PageHeader title="Tin nhắn" />
        <EmptyState title="Chưa có cuộc trò chuyện nào" action={user.role === 'STUDENT' && <Button to="/tutors">Tìm gia sư để nhắn tin</Button>}>
          {user.role === 'STUDENT' ? 'Mở hồ sơ một gia sư và bấm “Nhắn tin cho gia sư”.' : 'Học viên nhắn cho bạn sẽ hiện ở đây.'}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Tin nhắn" />
      <div className="grid h-[calc(100vh-13rem)] min-h-[480px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-white md:grid-cols-[300px_1fr]">
        <aside className={cx('thin-scroll min-h-0 overflow-y-auto border-r border-line', id && 'hidden md:block')}>
          {!convs && (
            <div className="p-4">
              <Spinner />
            </div>
          )}
          {convs?.map((c) => ({ ...c, unread: String(c.id) === id ? 0 : c.unread })).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/app/messages/${c.id}`)}
              className={cx('flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-wash', String(c.id) === id && 'bg-violet-tint/50')}
            >
              <Avatar name={c.other?.fullName} url={c.other?.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cx('truncate', c.unread ? 'font-bold' : 'font-medium')}>{c.other?.fullName}</span>
                  <span className="shrink-0 text-xs text-muted">{relative(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cx('truncate text-sm', c.unread ? 'text-ink' : 'text-muted')}>{c.lastMessagePreview || 'Chưa có tin nhắn'}</span>
                  {c.unread > 0 && <span className="tabular ml-auto rounded-full bg-redpen px-1.5 text-xs font-semibold text-white">{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </aside>
        <section className={cx('min-h-0', !id && 'hidden md:block')}>
          {current ? (
            <Thread conv={current} onSent={() => {}} />
          ) : (
            <div className="grid h-full place-items-center p-6 text-ink-soft">{id ? <Spinner /> : 'Chọn một cuộc trò chuyện'}</div>
          )}
        </section>
      </div>
    </>
  );
}
