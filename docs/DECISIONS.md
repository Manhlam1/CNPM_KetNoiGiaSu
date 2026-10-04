# Các quyết định kỹ thuật

Ghi lại các lựa chọn đã chốt trong lúc xây dựng, kèm lý do, để nhóm trả lời được khi giảng viên hỏi "tại sao làm vậy".

| # | Quyết định | Lý do |
|---|---|---|
| 1 | **Backend dùng NestJS + TypeScript** thay cho Spring Boot như dự kiến ban đầu | Môi trường xây dựng bị chặn Maven Central nên không build/test được Java. NestJS có cấu trúc tương đương Spring: module, controller, service, repository, guard (giống `@PreAuthorize`), interceptor (giống AOP), DTO + class-validator (giống `@Valid`). Nhóm đã đồng ý đổi. |
| 2 | ORM là **TypeORM**, MySQL 8 | Gần với JPA/Hibernate: entity có decorator, repository, transaction, `@VersionColumn`, khóa dòng `pessimistic_write`. |
| 3 | `DB_SYNC=true` tự tạo bảng theo entity | Giống `ddl-auto=update` của BlueMoon, phù hợp đồ án. Triển khai thật nên chuyển sang migration. |
| 4 | **Tiền lưu số nguyên đồng (BIGINT)**, không dùng số thực | VND không có phần lẻ; số nguyên không bị sai số làm tròn (vai trò như `BigDecimal`). Hoa hồng tính bằng phần vạn và luôn bảo đảm `hoa hồng + gia sư nhận = học phí`. |
| 5 | **Sổ cái** (`wallet_transactions`): mọi biến động số dư là một dòng, không sửa thẳng số dư | Truy vết được từng đồng; kiểm tra bất biến "tiền vào = đang giữ + đã chi ra" và "số dư ví = tổng sổ cái". Màn hình Dòng tiền của admin hiển thị kết quả kiểm tra này. |
| 6 | Có ví hệ thống `ESCROW` (giữ hộ) và `PLATFORM` (hoa hồng) | Tiền học viên trả nằm ở ví giữ hộ cho tới khi buổi học kết thúc, không đi thẳng vào ví gia sư. |
| 7 | Khi khóa nhiều ví trong một giao dịch, **luôn khóa ví ESCROW trước** | Thứ tự khóa cố định nên không xảy ra deadlock giữa các lần giải ngân/hoàn tiền chạy song song. |
| 8 | **Chống đặt trùng 2 lớp**: `UPDATE slots ... WHERE status='AVAILABLE'` và `UNIQUE(activeSlotKey)` trên bookings | Lớp 1 chỉ cho 1 request thắng; lớp 2 là chốt chặn ở DB nếu code có lỗi. `activeSlotKey` = slotId khi buổi còn hiệu lực, `NULL` khi hết hạn/hủy (MySQL cho nhiều NULL trong cột UNIQUE). Test 10 request song song: đúng 1 thành công. |
| 9 | **M4 báo M3 qua sự kiện** `payment.succeeded` (EventEmitter, chạy chung transaction) | Tránh phụ thuộc vòng M3 ↔ M4: M3 gọi M4 để giải ngân/hoàn tiền, còn M4 chỉ phát sự kiện. Listener trả về `accepted`; nếu buổi học đã hết hạn giữ chỗ thì M4 hoàn tiền ngay trong cùng transaction. |
| 10 | Xử lý kết quả thanh toán **idempotent** (khóa dòng payment, chỉ xử lý khi còn `PENDING`) | VNPay có thể gọi IPN nhiều lần. Lần sau trả mã `02` và không cộng tiền lần nữa. |
| 11 | **Hai cổng thanh toán**: `mock` (mặc định) và `vnpay` (sandbox) | Demo chạy được trên máy bất kỳ mà không cần tài khoản VNPay hay URL công khai. Cổng giả lập đi qua đúng hàm xử lý kết quả như IPN thật. |
| 12 | `VNPAY_PROCESS_ON_RETURN=true` khi test local | IPN cần URL công khai (ngrok). Nếu không có, xử lý luôn ở Return URL (vẫn kiểm tra chữ ký, vẫn idempotent). Chạy thật nên đặt `false` và chỉ tin IPN. |
| 13 | **Đồng hồ nghiệp vụ** (`ClockService`) có thể tua, lưu độ lệch trong `system_configs` | Mọi mốc nghiệp vụ (giữ chỗ 15 phút, hết giờ học, tự giải ngân 48h) lấy từ đây nên lúc bảo vệ có thể trình diễn các bước tự động trong vài giây. JWT, OTP vẫn dùng giờ thật. Chỉ bật khi `DEMO_MODE=true`. |
| 14 | Job nền chạy **mỗi 30 giây** (`@Interval`) | Đủ nhanh cho giữ chỗ 15 phút; mỗi buổi học được xử lý trong transaction riêng, khóa dòng và kiểm tra lại trạng thái để không đụng với thao tác của người dùng. |
| 15 | Chat dùng **Socket.IO** thay cho STOMP | NestJS hỗ trợ sẵn Socket.IO (`@nestjs/platform-socket.io`), có tự kết nối lại. Tin nhắn gửi qua REST (dễ test, có validate), server đẩy realtime tới cả hai bên. |
| 16 | Gia sư chỉ nhắn được học viên đã đặt lịch hoặc đã nhắn trước | Chống gia sư spam học viên. |
| 17 | Hồ sơ gia sư cần **ít nhất 1 chứng chỉ** mới gửi duyệt; công khai chỉ hiện tên chứng chỉ | Admin có căn cứ để duyệt; file gốc không lộ ra ngoài. |
| 18 | Email có 2 chế độ: `console` (lưu vào hộp thư demo `/dev/mailbox`) và `smtp` | Demo OTP không cần SMTP. Đổi sang Mailtrap chỉ cần sửa `.env`. |
| 19 | OTP 6 số, **băm bcrypt**, hết hạn 10 phút, tối đa 5 lần nhập sai, gửi lại cách nhau 30 giây | Không lưu mã gốc; chống dò mã. Quên mật khẩu luôn trả cùng một thông báo để không lộ email nào có tồn tại. |
| 20 | Tiền hoàn cho học viên được ghi vào **ví học viên** (mô phỏng) | Sandbox không hoàn tiền thật về thẻ. Bản thật sẽ gọi API hoàn tiền của cổng thanh toán. |
| 21 | Rút tiền: **trừ ví ngay khi gửi yêu cầu**, admin duyệt thì coi như đã chuyển khoản (mô phỏng), từ chối thì cộng lại | Không thể rút cùng một khoản hai lần trong lúc chờ duyệt. Tối thiểu 100.000đ. |
| 22 | Chính sách mặc định: hoa hồng 10%, giữ chỗ 15 phút, tự giải ngân và hạn khiếu nại 48h, hủy trước 24h hoàn 100%, trả theo từng buổi | Theo đặc tả. Admin sửa được ở trang Cấu hình; mỗi lần sửa được ghi nhật ký. |
| 23 | Học viên hủy muộn (dưới 24h): **không hoàn**, học phí giải ngân cho gia sư; gia sư hủy: **luôn hoàn 100%** | Bảo vệ thời gian của gia sư nhưng không để gia sư hủy tùy tiện mà vẫn có tiền. |
| 24 | Tranh chấp chỉ mở được khi buổi đã kết thúc và còn trong hạn 48h; khi có tranh chấp, job **không tự giải ngân** | Tiền bị đóng băng cho tới khi admin quyết. Admin xem toàn bộ tin nhắn giữa hai bên làm bằng chứng. |
| 25 | Thời gian lưu **UTC** trong DB, hiển thị theo `Asia/Ho_Chi_Minh` ở frontend; giờ lịch học quy đổi theo +07:00 | Việt Nam không có giờ mùa hè nên quy đổi cố định là an toàn. `createdAt` do ứng dụng gán, không dùng `CURRENT_TIMESTAMP` của MySQL để tránh lệch múi giờ máy chủ. |
| 26 | Phân trang bắt đầu từ **trang 1** | Thân thiện với giao diện; khác Spring (bắt đầu từ 0). |
| 27 | Frontend gọi API **cùng origin** (`/api` qua proxy của Vite/nginx) | Không phải xử lý CORS và cookie khác domain; cấu hình deploy đơn giản. |
| 28 | Giao diện tự thiết kế: nền giấy, mực tím, "điểm bút đỏ" cho đánh giá, họa tiết vở ô ly | Gợi không khí học tập ở Việt Nam, khác giao diện mẫu thường thấy. Font Be Vietnam Pro và Patrick Hand đóng gói kèm (không phụ thuộc Google Fonts). |
| 29 | Docker Compose viết sẵn, **chưa chạy `docker compose up`** trong môi trường xây dựng | Docker Hub bị chặn ở môi trường xây dựng. Đã kiểm tra từng phần tương đương: backend chạy đúng như stage cuối của Dockerfile (`npm ci --omit=dev` + `node dist/main`) trên database trống, tự tạo bảng và nạp dữ liệu mẫu; frontend build được phục vụ bằng đúng file `nginx.conf` (nginx 1.24), proxy `/api` và `/socket.io` hoạt động. |
