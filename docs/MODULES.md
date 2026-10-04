# Phân chia mã nguồn theo module

Mỗi thành viên nhận trọn một module, gồm backend, frontend, tài liệu và test của module đó. Các bảng dưới đây liệt kê file thuộc từng module để mỗi người biết mình cần đọc và trả lời vấn đáp phần nào.

| Module | Người phụ trách | Việc chung kiêm nhiệm |
|---|---|---|
| M1. Tài khoản & Quản trị | TV1 (nhóm trưởng) | Quản lý repo, ghép báo cáo |
| M2. Hồ sơ gia sư, Tìm kiếm & Đánh giá | TV2 | UI/UX, component dùng chung |
| M3. Lịch trống & Đặt lịch | TV3 | Thiết kế CSDL, dữ liệu mẫu |
| M4. Thanh toán, Escrow & Ví | TV4 | Docker, deploy, biến môi trường |
| M5. Nhắn tin, Thông báo & Tranh chấp | TV5 | Kiểm thử |

Đường dẫn backend tính từ `backend/src/`, frontend tính từ `frontend/src/`.

## Dùng chung (cả nhóm cần nắm)

| Backend | Vai trò |
|---|---|
| `main.ts`, `app.module.ts` | Khởi động app, đăng ký module, Swagger, CORS, ValidationPipe |
| `config/configuration.ts` | Đọc biến môi trường (`.env`) |
| `common/api-response.ts` | `ApiResponse<T>`, `PageResponse<T>` |
| `common/filters/all-exceptions.filter.ts` | Bắt mọi lỗi, trả về `ApiResponse` thống nhất |
| `common/interceptors/response.interceptor.ts` | Tự bọc kết quả controller |
| `common/guards/jwt-auth.guard.ts`, `roles.guard.ts` | Xác thực JWT, kiểm tra vai trò |
| `common/decorators.ts` | `@Public`, `@Roles`, `@Audit`, `@CurrentUser`, `@RawResponse` |
| `common/enums.ts` | Tất cả enum trạng thái |
| `common/events.ts` | Sự kiện `payment.succeeded` giữa M4 và M3 |
| `common/money.ts` | Lưu tiền bằng số nguyên đồng |
| `common/timestamped.ts` | `createdAt`/`updatedAt` theo giờ UTC |
| `common/upload.ts` | Cấu hình upload ảnh/PDF |
| `common/mail/*` | Gửi email (console hoặc SMTP), hộp thư demo |
| `database/seed*.ts` | Dữ liệu mẫu |

| Frontend | Vai trò |
|---|---|
| `main.jsx`, `App.jsx` | Router, provider |
| `api/client.js` | Axios + JWT + chuẩn hóa lỗi |
| `components/ui.jsx` | Button, Input, Modal, Table, Badge, GradeMark… (TV2) |
| `components/layout/*` | Khung trang công khai, khung sau đăng nhập, menu theo vai trò |
| `context/AuthContext.jsx`, `ToastContext.jsx` | Trạng thái đăng nhập, thông báo nhỏ |
| `utils/format.js`, `labels.js`, `useAsync.js` | Định dạng tiền/giờ VN, nhãn tiếng Việt, gọi API |

## M1. Tài khoản & Quản trị (TV1)

| Backend | Nội dung |
|---|---|
| `modules/m1-account/account.module.ts` | Khai báo module, đăng ký guard + audit interceptor toàn cục |
| `modules/m1-account/entities/user.entity.ts` | Người dùng (xóa mềm bằng `deletedAt`) |
| `modules/m1-account/entities/email-otp.entity.ts` | Mã OTP (lưu dạng băm) |
| `modules/m1-account/auth/auth.service.ts`, `otp.service.ts`, `auth.controller.ts`, `auth.dto.ts` | Đăng ký, OTP, đăng nhập, quên/đổi mật khẩu, hồ sơ cá nhân |
| `modules/m1-account/users/*` | Admin khóa/mở/xóa mềm người dùng |
| `modules/m1-account/system-config/*` | Cấu hình hệ thống, **đồng hồ nghiệp vụ** (`clock.service.ts`) |
| `modules/m1-account/audit/*`, `common/interceptors/audit.interceptor.ts` | Nhật ký thao tác admin |
| `modules/m1-account/dashboard/*` | Số liệu tổng quan cho admin |
| `modules/demo/*` | Công cụ demo: tua thời gian, hộp thư dev |

| Frontend | Nội dung |
|---|---|
| `pages/auth/*` | Đăng nhập, đăng ký, OTP, quên mật khẩu |
| `pages/app/ProfilePage.jsx` | Tài khoản cá nhân, đổi mật khẩu, ảnh đại diện |
| `pages/app/DashboardPage.jsx` | Tổng quan theo vai trò |
| `pages/admin/UsersPage.jsx`, `ConfigsPage.jsx`, `AuditLogsPage.jsx`, `DemoToolsPage.jsx` | Trang admin |
| `pages/dev/MailboxPage.jsx`, `components/DevMailHint.jsx` | Hộp thư demo |
| `components/RequireAuth.jsx`, `context/AuthContext.jsx` | Bảo vệ route |
| `api/accountApi.js` | Gọi API M1 |

## M2. Hồ sơ gia sư, Tìm kiếm & Đánh giá (TV2)

| Backend | Nội dung |
|---|---|
| `modules/m2-tutor/entities/*` | `TutorProfile`, `Subject`, `TutorCertificate`, `Review` |
| `modules/m2-tutor/catalog.ts` | Danh mục môn, cấp học, thành phố |
| `modules/m2-tutor/tutors.service.ts`, `tutors.controller.ts`, `tutor.dto.ts` | Hồ sơ, gửi duyệt, admin duyệt, tìm kiếm, chi tiết |
| `modules/m2-tutor/reviews.service.ts`, `reviews.controller.ts` | Đánh giá + phản hồi, tính điểm trung bình |

| Frontend | Nội dung |
|---|---|
| `pages/public/HomePage.jsx`, `TutorSearchPage.jsx`, `TutorDetailPage.jsx` | Trang chủ, tìm kiếm, chi tiết gia sư |
| `pages/tutor/TutorProfilePage.jsx` | Gia sư sửa hồ sơ, tải chứng chỉ, gửi duyệt |
| `pages/admin/TutorApplicationsPage.jsx` | Admin duyệt hồ sơ |
| `components/TutorRow.jsx`, `ReviewList.jsx` | Dòng gia sư, danh sách đánh giá |
| `utils/useMeta.js`, `api/tutorApi.js` | Danh mục, gọi API M2 |

## M3. Lịch trống & Đặt lịch (TV3)

| Backend | Nội dung |
|---|---|
| `modules/m3-booking/entities/*` | `AvailabilityRule`, `Slot`, `Booking` |
| `modules/m3-booking/booking-state.ts` | **Bảng chuyển trạng thái** buổi học |
| `modules/m3-booking/cancellation-policy.ts` | Chính sách hủy (hàm thuần) |
| `modules/m3-booking/slot-generator.ts` | Sinh slot từ lịch lặp, xử lý giờ VN |
| `modules/m3-booking/availability.service.ts` | Lịch trống, chống trùng giờ |
| `modules/m3-booking/bookings.service.ts` | Đặt lịch (chống đặt trùng 2 lớp), hủy, đã dạy, xác nhận, tranh chấp, job |
| `modules/m3-booking/booking-jobs.service.ts` | Job 30 giây tự chuyển trạng thái |
| `modules/m3-booking/bookings.controller.ts`, `booking.dto.ts` | API |

| Frontend | Nội dung |
|---|---|
| `components/SlotPicker.jsx` | Học viên chọn khung giờ, giữ chỗ |
| `pages/tutor/SchedulePage.jsx` | Gia sư mở lịch trống, xem lịch tuần |
| `pages/app/BookingsPage.jsx`, `BookingDetailPage.jsx` | Lịch học, chi tiết + thao tác |
| `pages/admin/AdminBookingsPage.jsx` | Admin xem buổi học |
| `components/booking.jsx`, `Countdown.jsx` | Dòng buổi học, tiến trình, đếm ngược giữ chỗ |
| `api/bookingApi.js` | Gọi API M3 |

## M4. Thanh toán, Escrow & Ví (TV4)

| Backend | Nội dung |
|---|---|
| `modules/m4-payment/entities/*` | `Payment`, `Wallet`, `WalletTransaction` (sổ cái), `Withdrawal` |
| `modules/m4-payment/escrow.service.ts` | **Giữ / giải ngân / hoàn / đóng băng** tiền |
| `modules/m4-payment/wallet.service.ts` | Ghi sổ cái có khóa dòng, kiểm tra bất biến tiền |
| `modules/m4-payment/payments.service.ts` | Tạo thanh toán, cổng giả lập, VNPay Return/IPN, idempotent |
| `modules/m4-payment/vnpay.util.ts` | Ký và kiểm tra chữ ký HMAC-SHA512 |
| `modules/m4-payment/commission.ts` | Tính hoa hồng bằng số nguyên |
| `modules/m4-payment/withdrawals.service.ts` | Rút tiền, admin duyệt |
| `modules/m4-payment/payments.controller.ts`, `payment.dto.ts` | API |
| `../Dockerfile`, `../../docker-compose.yml`, `../../frontend/nginx.conf` | Đóng gói và chạy |

| Frontend | Nội dung |
|---|---|
| `pages/payment/MockGatewayPage.jsx`, `PaymentResultPage.jsx` | Cổng giả lập, kết quả thanh toán |
| `pages/app/WalletPage.jsx` | Ví gia sư, rút tiền |
| `pages/app/PaymentsPage.jsx` | Lịch sử thanh toán của học viên |
| `pages/admin/FinancePage.jsx`, `WithdrawalsPage.jsx` | Dòng tiền, duyệt rút tiền |
| `api/paymentApi.js` | Gọi API M4 |

## M5. Nhắn tin, Thông báo & Tranh chấp (TV5)

| Backend | Nội dung |
|---|---|
| `modules/m5-communication/realtime.gateway.ts` | Socket.IO, xác thực JWT khi kết nối |
| `modules/m5-communication/notifications.service.ts`, `notifications.controller.ts`, `notification.module.ts` | Thông báo dùng chung (DB + realtime + email) |
| `modules/m5-communication/chat.service.ts`, `chat.controller.ts` | Hội thoại, tin nhắn, đã đọc |
| `modules/m5-communication/disputes.service.ts`, `disputes.controller.ts` | Khiếu nại, phản hồi, admin xử lý |
| `modules/m5-communication/entities/*` | `Notification`, `Conversation`, `Message`, `Dispute` |
| `../test/*` | Integration test (TV5 phụ trách gom và chạy) |

| Frontend | Nội dung |
|---|---|
| `context/RealtimeContext.jsx`, `components/NotificationBell.jsx` | Kết nối realtime, số chưa đọc |
| `pages/app/MessagesPage.jsx` | Chat |
| `pages/app/NotificationsPage.jsx` | Thông báo |
| `pages/app/DisputesPage.jsx`, `DisputeNewPage.jsx`, `DisputeDetailPage.jsx` | Khiếu nại |
| `pages/admin/AdminDisputesPage.jsx` | Admin xử lý tranh chấp |
| `api/chatApi.js`, `api/disputeApi.js` | Gọi API M5 |

## Test theo module

| File | Module |
|---|---|
| `backend/src/modules/m3-booking/*.spec.ts` | M3: trạng thái, chính sách hủy, sinh slot |
| `backend/src/modules/m4-payment/*.spec.ts` | M4: hoa hồng, VNPay, EscrowService, WalletService |
| `backend/test/booking-escrow.e2e-spec.ts` | Cả nhóm: luồng chính + các nhánh, chạy trên MySQL thật |
