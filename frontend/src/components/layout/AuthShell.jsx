import { Logo } from '../Logo';

/** Khung trang đăng nhập/đăng ký: bên trái là trang vở ô ly với lời nhắn viết tay */
export function AuthShell({ title, subtitle, children, note }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <aside className="oly-paper relative hidden flex-col justify-between border-r border-line p-10 pl-20 lg:flex">
        <Logo />
        <div className="max-w-md">
          <p className="font-[family-name:var(--font-hand)] text-[34px] leading-[1.25] text-ink">
            {note || 'Học xong buổi nào, bạn bấm xác nhận buổi đó. Lúc ấy gia sư mới nhận tiền.'}
          </p>
          <p className="mt-6 text-ink-soft">
            Học phí bạn trả được TutorHub giữ hộ. Có vấn đề với buổi học, bạn mở khiếu nại trong 48 giờ và tiền được đóng băng cho tới khi xử lý xong.
          </p>
        </div>
        <p className="text-sm text-muted">Đồ án môn Nhập môn Công nghệ phần mềm — HUST</p>
      </aside>
      <main className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <h1 className="text-[28px] font-bold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-soft">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </main>
    </div>
  );
}
