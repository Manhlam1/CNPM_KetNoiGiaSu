# Tài liệu thiết kế phần mềm (SDD) — TutorHub

> Đồ án môn Nhập môn Công nghệ phần mềm — HUST. Phiên bản 1.0. Đọc kèm `SRS.md` (yêu cầu), `MODULES.md` (file theo module), `DECISIONS.md` (lý do các lựa chọn).

## 1. Kiến trúc tổng quan

```mermaid
flowchart LR
  B[Trình duyệt<br/>React + Vite + Tailwind] -- "REST /api (JWT Bearer)" --> N[NestJS API<br/>cổng 9090]
  B -- "Socket.IO /socket.io (JWT)" --> N
  N -- TypeORM --> DB[(MySQL 8)]
  N -- SMTP hoặc hộp thư demo --> M[Email]
  B -- chuyển hướng thanh toán --> V[VNPay sandbox<br/>hoặc cổng giả lập]
  V -- "IPN (server-to-server)" --> N
  V -- Return URL --> N
  N -- "uploads/ (chứng chỉ, bằng chứng)" --> F[(Ổ đĩa)]
```

- **Frontend** là SPA, gọi API cùng origin (`/api`, `/socket.io`, `/uploads` được Vite dev server hoặc nginx chuyển tiếp sang backend).
- **Backend** chia tầng như BlueMoon: `controller → service → repository (TypeORM) → entity`, DTO kiểm tra dữ liệu vào, mọi response bọc `ApiResponse<T>`.
- **Realtime**: server đẩy `notification:new`, `message:new`, `message:read` tới phòng `user:<id>`.
- **Job nền** mỗi 30 giây xử lý các mốc thời gian của buổi học.

### 1.1 Phụ thuộc giữa các module

```mermaid
flowchart BT
  C[common + config<br/>ApiResponse, guard, filter, enum, mail]
  SC[M1 SystemConfig + Clock<br/>global]
  M1[M1 Tài khoản]
  N5[M5 Notification + Realtime<br/>global]
  M2[M2 Hồ sơ, Tìm kiếm, Đánh giá]
  M4[M4 Thanh toán, Escrow, Ví]
  M3[M3 Lịch, Đặt lịch]
  M5[M5 Chat, Tranh chấp]
  D[Demo tools]
  SC --> C
  M1 --> SC
  N5 --> C
  M2 --> N5
  M4 --> N5
  M3 -- "gọi EscrowService" --> M4
  M3 --> M2
  M4 -. "sự kiện payment.succeeded" .-> M3
  M5 -- "gọi BookingsService" --> M3
  D --> M3
```

Mũi tên liền là import module (gọi service trực tiếp). M4 **không** import M3: khi thanh toán thành công, M4 phát sự kiện `payment.succeeded` kèm `EntityManager` của transaction; M3 lắng nghe và xác nhận buổi học trong cùng transaction. Nhờ vậy không có phụ thuộc vòng mà dữ liệu vẫn toàn vẹn.

## 2. Cấu trúc mã nguồn

```
tutorhub/
├── backend/                      NestJS + TypeORM
│   ├── src/
│   │   ├── main.ts, app.module.ts
│   │   ├── config/               đọc .env
│   │   ├── common/               ApiResponse, guard, filter, interceptor, enum, money, upload, mail
│   │   ├── database/             seed dữ liệu mẫu
│   │   └── modules/
│   │       ├── m1-account/       auth, users, system-config (+ clock), audit, dashboard
│   │       ├── m2-tutor/         hồ sơ, tìm kiếm, đánh giá
│   │       ├── m3-booking/       lịch trống, slot, buổi học, job
│   │       ├── m4-payment/       thanh toán, escrow, ví, rút tiền, VNPay
│   │       ├── m5-communication/ realtime, thông báo, chat, tranh chấp
│   │       └── demo/             tua thời gian, hộp thư dev
│   └── test/                     integration test (MySQL thật)
├── frontend/                     React + Vite + Tailwind
│   └── src/ api/ components/ context/ pages/{public,auth,app,tutor,admin,payment,dev}/ utils/
├── docs/                         SRS, SDD, MODULES, DECISIONS, openapi.json, Postman
└── docker-compose.yml
```

## 3. Thiết kế cơ sở dữ liệu

### 3.1 Sơ đồ thực thể quan hệ (ERD)

```mermaid
erDiagram
  users ||--o| tutor_profiles : "là gia sư"
  tutor_profiles }o--o{ subjects : "tutor_subjects"
  tutor_profiles ||--o{ tutor_certificates : "nộp"
  tutor_profiles ||--o{ availability_rules : "mở lịch"
  tutor_profiles ||--o{ slots : "có"
  availability_rules ||--o{ slots : "sinh ra"
  users ||--o{ bookings : "học viên đặt"
  tutor_profiles ||--o{ bookings : "được đặt"
  slots ||--o{ bookings : "giữ (tối đa 1 còn hiệu lực)"
  subjects |o--o{ bookings : "môn"
  bookings ||--o{ payments : "thanh toán"
  bookings ||--o| reviews : "đánh giá"
  bookings ||--o| disputes : "khiếu nại"
  users ||--o| wallets : "sở hữu"
  wallets ||--o{ wallet_transactions : "sổ cái"
  users ||--o{ withdrawals : "rút tiền"
  users ||--o{ conversations : "học viên"
  users ||--o{ conversations : "gia sư"
  conversations ||--o{ messages : "gồm"
  users ||--o{ notifications : "nhận"
  users ||--o{ audit_logs : "admin thao tác"

  users { int id PK
    varchar email UK
    varchar passwordHash
    varchar fullName
    varchar role "STUDENT|TUTOR|ADMIN"
    varchar status "PENDING_VERIFICATION|ACTIVE|LOCKED"
    datetime deletedAt "xóa mềm" }
  tutor_profiles { int id PK
    int userId FK
    varchar headline
    text bio
    bigint hourlyRate "đồng/giờ"
    varchar teachingMode
    varchar city
    varchar area
    text levels
    varchar status "DRAFT|PENDING|APPROVED|REJECTED"
    decimal ratingAvg
    int ratingCount
    int completedLessons }
  slots { int id PK
    int tutorProfileId FK
    int ruleId FK
    datetime startAt "UNIQUE cùng tutorProfileId"
    datetime endAt
    varchar status "AVAILABLE|HELD|BOOKED|CANCELLED"
    int version }
  bookings { int id PK
    varchar code "BK-000123"
    int studentId FK
    int tutorProfileId FK
    int tutorUserId
    int slotId FK
    int activeSlotKey UK "= slotId khi còn hiệu lực"
    bigint price
    varchar status
    datetime holdExpiresAt
    datetime paidAt
    datetime completedAt
    bigint refundAmount
    int version }
  payments { int id PK
    int bookingId FK
    bigint amount
    varchar provider "MOCK|VNPAY"
    varchar status "PENDING|SUCCESS|FAILED"
    varchar escrowStatus "NONE|HELD|RELEASED|REFUNDED|FROZEN"
    varchar txnRef UK
    bigint commissionAmount
    bigint tutorAmount }
  wallets { int id PK
    varchar code UK "ESCROW|PLATFORM|USER-id"
    int userId UK
    bigint balance }
  wallet_transactions { int id PK
    int walletId FK
    varchar type
    bigint amount "dương vào, âm ra"
    bigint balanceAfter
    int bookingId
    int paymentId }
  disputes { int id PK
    int bookingId UK
    varchar category
    text description
    json evidenceUrls
    text tutorResponse
    varchar status "OPEN|RESOLVED_RELEASE|RESOLVED_REFUND" }
```

Các bảng còn lại: `subjects`, `tutor_certificates`, `availability_rules`, `reviews` (UNIQUE `bookingId`), `withdrawals`, `conversations` (UNIQUE `studentId, tutorUserId`), `messages`, `notifications`, `email_otps`, `system_configs`, `audit_logs`, `dev_mails`.

### 3.2 Ràng buộc quan trọng

| Ràng buộc | Mục đích |
|---|---|
| `UNIQUE(slots.tutorProfileId, startAt)` | Sinh slot nhiều lần không bị trùng (INSERT IGNORE) |
| `UNIQUE(bookings.activeSlotKey)` | Một slot chỉ có tối đa một buổi học còn hiệu lực |
| `UNIQUE(payments.txnRef)` | Mỗi mã giao dịch gửi cổng thanh toán là duy nhất |
| `UNIQUE(reviews.bookingId)`, `UNIQUE(disputes.bookingId)` | Mỗi buổi tối đa 1 đánh giá, 1 khiếu nại |
| `UNIQUE(wallets.userId)`, `UNIQUE(wallets.code)` | Mỗi người 1 ví; 2 ví hệ thống duy nhất |
| Tiền kiểu `BIGINT` (đồng) | Không sai số làm tròn |
| `DATETIME(3)` lưu UTC | Hiển thị theo giờ Việt Nam ở frontend |

## 4. Thiết kế lớp

```mermaid
classDiagram
  class BookingsService {
    +create(student, dto) Booking
    +onPaymentSucceeded(event) PaymentSucceededResult
    +cancel(viewer, id, reason)
    +markTaught(tutor, id)
    +confirm(student, id)
    +markDisputed(manager, bookingId, studentId)
    +resolveDispute(manager, bookingId, decision)
    +expireHolds() int
    +markAwaiting() int
    +autoComplete() int
    -move(manager, booking, to, patch)
    -completeAndRelease(manager, booking, by)
  }
  class EscrowService {
    +hold(manager, payment)
    +release(manager, bookingId)
    +refund(manager, bookingId)
    +refundPayment(manager, payment)
    +freeze(manager, bookingId)
  }
  class WalletService {
    +post(manager, walletId, amount, type, description, refs)
    +userWallet(manager, userId) Wallet
    +systemWallet(manager, code) Wallet
    +summary(userId, role)
    +checkInvariants()
  }
  class PaymentsService {
    +createForBooking(studentId, bookingId, provider, ip)
    +handleGatewayResult(result) IpnCode
    +vnpayIpn(query)
    +vnpayReturn(query) url
    +mockComplete(studentId, txnRef, success)
  }
  class AvailabilityService {
    +createRule(tutorUserId, dto)
    +generateForRule(rule)
    +regenerateAll()
    +publicSlots(profileId)
  }
  class DisputesService {
    +open(student, dto, evidence)
    +respond(tutor, id, text)
    +resolve(admin, id, decision, note)
  }
  class BookingJobsService {
    +tick() "mỗi 30 giây"
    +runAll()
  }
  class ClockService {
    +now() Date
    +travel(hours)
    +reset()
  }
  class NotificationsService {
    +notify(userIds, payload, opts)
    +notifyAdmins(payload)
  }
  BookingsService --> EscrowService
  BookingsService --> ClockService
  BookingsService --> NotificationsService
  EscrowService --> WalletService
  PaymentsService --> EscrowService
  PaymentsService ..> BookingsService : sự kiện payment.succeeded
  DisputesService --> BookingsService
  BookingJobsService --> BookingsService
  BookingJobsService --> AvailabilityService
```

Các hàm thuần, không phụ thuộc DB, được unit test riêng: `booking-state.ts` (bảng chuyển trạng thái), `cancellation-policy.ts`, `slot-generator.ts`, `commission.ts`, `vnpay.util.ts`.

## 5. Vòng đời buổi học và dòng tiền

### 5.1 Trạng thái buổi học

```mermaid
stateDiagram-v2
  [*] --> PENDING_PAYMENT : học viên chọn slot (giữ 15 phút)
  PENDING_PAYMENT --> EXPIRED : quá 15 phút chưa trả (job)
  PENDING_PAYMENT --> CANCELLED : học viên hủy
  PENDING_PAYMENT --> CONFIRMED : cổng thanh toán báo thành công
  CONFIRMED --> CANCELLED : hủy trước giờ học (hoàn theo chính sách)
  CONFIRMED --> AWAITING_CONFIRMATION : hết giờ học (job)
  AWAITING_CONFIRMATION --> COMPLETED : học viên xác nhận / quá 48h (job)
  AWAITING_CONFIRMATION --> DISPUTED : học viên khiếu nại trong 48h
  DISPUTED --> COMPLETED : admin quyết giải ngân
  DISPUTED --> REFUNDED : admin quyết hoàn tiền
  EXPIRED --> [*]
  CANCELLED --> [*]
  COMPLETED --> [*]
  REFUNDED --> [*]
```

Bảng chuyển trạng thái nằm ở `booking-state.ts`; mọi thay đổi trạng thái đi qua `BookingsService.move()` nên không thể nhảy sai bước.

### 5.2 Trạng thái tiền (escrow)

```mermaid
stateDiagram-v2
  [*] --> NONE : tạo giao dịch
  NONE --> HELD : thanh toán thành công (ví ESCROW +)
  HELD --> RELEASED : xác nhận / tự giải ngân / hủy muộn
  HELD --> REFUNDED : hủy sớm / gia sư hủy / tiền tới muộn
  HELD --> FROZEN : mở khiếu nại
  FROZEN --> RELEASED : admin quyết giải ngân
  FROZEN --> REFUNDED : admin quyết hoàn tiền
```

### 5.3 Bút toán sổ cái

| Sự kiện | Ví ESCROW | Ví gia sư | Ví PLATFORM | Ví học viên |
|---|---|---|---|---|
| Thanh toán thành công (400.000đ) | +400.000 `PAYMENT_IN` | | | |
| Giải ngân (hoa hồng 10%) | −400.000 `ESCROW_OUT` | +360.000 `RELEASE_TO_TUTOR` | +40.000 `COMMISSION` | |
| Hoàn tiền | −400.000 `ESCROW_OUT` | | | +400.000 `REFUND` |
| Gia sư yêu cầu rút 300.000đ | | −300.000 `WITHDRAWAL_HOLD` | | |
| Admin từ chối rút | | +300.000 `WITHDRAWAL_REVERSAL` | | |

Bất biến được kiểm tra bởi `WalletService.checkInvariants()` (hiển thị ở trang Dòng tiền, chạy sau mỗi integration test):
1. Tổng thanh toán thành công = số dư ESCROW + tổng (`RELEASE_TO_TUTOR` + `COMMISSION` + `REFUND`).
2. Số dư ESCROW = tổng các khoản đang `HELD`/`FROZEN`.
3. Số dư mỗi ví = tổng sổ cái của ví đó.

Mỗi bút toán khóa dòng ví (`SELECT … FOR UPDATE`), tính số dư mới, chặn số dư âm và ghi `balanceAfter`. Ví ESCROW luôn được khóa trước để tránh deadlock.

## 6. Biểu đồ tuần tự

### 6.1 Đặt lịch và thanh toán qua VNPay (có IPN)

```mermaid
sequenceDiagram
  autonumber
  actor HV as Học viên
  participant FE as Frontend
  participant BC as BookingsController
  participant BS as BookingsService
  participant PS as PaymentsService
  participant ES as EscrowService
  participant DB as MySQL
  participant VN as VNPay

  HV->>FE: Chọn khung giờ, bấm "Giữ chỗ và thanh toán"
  FE->>BC: POST /api/bookings {slotId}
  BC->>BS: create()
  BS->>DB: UPDATE slots SET status='HELD' WHERE id=? AND status='AVAILABLE'
  alt affectedRows = 0
    BS-->>FE: 409 SLOT_TAKEN
  else giữ được
    BS->>DB: INSERT booking (PENDING_PAYMENT, activeSlotKey=slotId, hạn 15 phút)
    BS-->>FE: booking
  end
  FE->>PS: POST /api/payments/bookings/{id}
  PS->>DB: INSERT payment (PENDING, txnRef)
  PS-->>FE: paymentUrl (có vnp_SecureHash)
  FE->>VN: chuyển hướng trình duyệt
  HV->>VN: Thanh toán
  VN->>PS: GET /api/payments/vnpay/ipn (server-to-server)
  PS->>PS: kiểm tra chữ ký HMAC-SHA512
  rect rgb(238,235,250)
  note over PS,DB: Một transaction
  PS->>DB: SELECT payment ... FOR UPDATE
  alt payment không còn PENDING
    PS-->>VN: {RspCode: "02"} (đã xử lý, không cộng lại)
  else hợp lệ
    PS->>DB: payment = SUCCESS
    PS->>ES: hold() -> ví ESCROW +amount
    PS->>BS: sự kiện payment.succeeded (cùng manager)
    BS->>DB: booking = CONFIRMED, slot = BOOKED
    BS-->>PS: accepted = true
  end
  end
  PS-->>VN: {RspCode: "00"}
  VN->>FE: Return URL -> /payment/result
  PS-)HV: thông báo realtime + email cho gia sư
```

Với cổng giả lập, bước 13–16 thay bằng `POST /api/payments/mock/{txnRef}/complete`, đi vào cùng hàm `handleGatewayResult()`.

### 6.2 Xác nhận hoàn tất và giải ngân

```mermaid
sequenceDiagram
  autonumber
  participant JOB as BookingJobsService
  actor HV as Học viên
  participant BS as BookingsService
  participant ES as EscrowService
  participant WS as WalletService
  participant NS as NotificationsService

  JOB->>BS: markAwaiting() (endAt <= now)
  BS->>BS: CONFIRMED -> AWAITING_CONFIRMATION
  BS->>NS: nhắc học viên xác nhận (email)
  HV->>BS: POST /api/bookings/{id}/confirm
  rect rgb(238,235,250)
  note over BS,WS: Một transaction, khóa dòng booking
  BS->>ES: release(bookingId)
  ES->>WS: ESCROW −400.000
  ES->>WS: Gia sư +360.000
  ES->>WS: PLATFORM +40.000
  BS->>BS: AWAITING_CONFIRMATION -> COMPLETED
  end
  BS->>NS: báo gia sư đã nhận tiền, mời học viên đánh giá
  note over JOB,BS: Nếu sau 48h học viên không xác nhận, không khiếu nại: autoComplete() làm đúng các bước trên với completedBy = AUTO
```

### 6.3 Khiếu nại và xử lý tranh chấp

```mermaid
sequenceDiagram
  autonumber
  actor HV as Học viên
  actor GS as Gia sư
  actor AD as Admin
  participant DS as DisputesService
  participant BS as BookingsService
  participant ES as EscrowService

  HV->>DS: POST /api/disputes (lý do, mô tả, bằng chứng)
  DS->>BS: markDisputed() kiểm tra hạn 48h
  BS->>ES: freeze() HELD -> FROZEN
  BS->>BS: AWAITING_CONFIRMATION -> DISPUTED
  DS-)GS: thông báo + email
  DS-)AD: thông báo
  GS->>DS: POST /api/disputes/{id}/respond
  AD->>DS: GET /api/disputes/{id} (kèm toàn bộ tin nhắn hai bên)
  AD->>DS: POST /api/admin/disputes/{id}/resolve {REFUND|RELEASE, ghi chú}
  alt REFUND
    DS->>BS: resolveDispute -> ES.refund(), DISPUTED -> REFUNDED
  else RELEASE
    DS->>BS: resolveDispute -> ES.release(), DISPUTED -> COMPLETED
  end
  DS-)HV: kết quả + email
  DS-)GS: kết quả + email
```

## 7. Xử lý đồng thời và toàn vẹn

| Tình huống | Cách xử lý |
|---|---|
| Nhiều người đặt cùng slot | `UPDATE ... WHERE status='AVAILABLE'` (chỉ 1 dòng bị đổi) + `UNIQUE(activeSlotKey)` |
| Cổng thanh toán gọi kết quả nhiều lần | Khóa dòng payment, chỉ xử lý khi `PENDING`; lần sau trả `02` |
| Học viên bấm xác nhận đúng lúc job tự giải ngân | Cả hai khóa dòng booking và kiểm tra lại trạng thái trong transaction; người tới sau thấy `COMPLETED` và dừng; `release()` còn kiểm tra `escrowStatus` |
| Tiền tới sau khi hết hạn giữ chỗ | Listener trả `accepted=false` → hoàn tiền ngay trong cùng transaction |
| Nhiều giao dịch ví song song | Khóa dòng ví, luôn khóa ESCROW trước |

## 8. Bảo mật

- Mật khẩu, OTP băm bcrypt; JWT HS256 hạn 1 ngày; guard toàn cục nạp lại user mỗi request (tài khoản bị khóa mất quyền ngay).
- Phân quyền 2 tầng: guard theo vai trò (`@Roles`) và kiểm tra quyền sở hữu trong service (chỉ học viên/gia sư của buổi học mới xem/sửa được).
- `ValidationPipe` với `whitelist` + `forbidNonWhitelisted`: trường lạ bị từ chối (chặn tự gán `role`, `status`…).
- VNPay: kiểm tra chữ ký mọi dữ liệu trả về, so khớp số tiền, không tin tham số từ trình duyệt.
- Upload: chỉ ảnh/PDF, tối đa 5MB, tên file ngẫu nhiên.
- Bí mật (DB, JWT, VNPay, SMTP) đặt trong `.env`; repo chỉ có `.env.example`.
- Audit log mọi thao tác thay đổi dữ liệu của admin.

## 9. Thiết kế giao diện

| Nhóm | Màn hình | Đường dẫn |
|---|---|---|
| Công khai | Trang chủ (ô tìm kiếm, phiếu minh họa đường đi của tiền) | `/` |
| | Tìm gia sư (bộ lọc, danh sách) | `/tutors` |
| | Hồ sơ gia sư (giới thiệu, chứng chỉ, chọn buổi, đánh giá) | `/tutors/:id` |
| Xác thực | Đăng nhập, đăng ký, nhập OTP, quên mật khẩu | `/login`, `/register`, `/verify-otp`, `/forgot-password` |
| Thanh toán | Cổng giả lập, kết quả | `/payment/mock`, `/payment/result` |
| Học viên | Tổng quan, lịch học, chi tiết buổi, tin nhắn, thanh toán, khiếu nại, thông báo, tài khoản | `/app/...` |
| Gia sư | Tổng quan, hồ sơ, lịch trống, buổi dạy, tin nhắn, ví, khiếu nại | `/app/tutor/...`, `/app/wallet` |
| Admin | Tổng quan, duyệt gia sư, người dùng, buổi học, dòng tiền, rút tiền, tranh chấp, cấu hình, nhật ký, công cụ demo | `/app/admin/...` |

Nguyên tắc: mỗi trang một URL riêng (F5 không mất trang); trạng thái buổi học và trạng thái tiền luôn hiện bằng nhãn có chữ; các thao tác hiện theo quyền thực tế của người xem (`actions` do backend tính); đếm ngược giữ chỗ tính theo đồng hồ máy chủ.

## 10. Triển khai

```mermaid
flowchart LR
  U[Người dùng] -->|":5173"| NG[nginx<br/>frontend build]
  NG -->|"/api, /socket.io, /uploads"| API[backend<br/>node dist/main :9090]
  API --> MY[(mysql:8.0<br/>volume mysql_data)]
  API --> UP[(volume uploads)]
```

`docker compose up --build` dựng 3 container. Lần đầu khởi động, backend tự tạo bảng và nạp dữ liệu mẫu nếu database trống.

## 11. Danh sách API

Mọi response có dạng `{ success, data, message, errorCode }`. Phân trang trả `PageResponse { items, page, size, totalElements, totalPages }` (trang bắt đầu từ 1). Chi tiết tham số xem Swagger tại `http://localhost:9090/api/docs` hoặc `docs/openapi.json`; collection Postman ở `docs/postman/`.

| Nhóm | Method | Đường dẫn | Xác thực |
|---|---|---|---|
| M1 - Admin: cấu hình hệ thống | `GET` | `/api/admin/system-configs` | JWT |
| M1 - Admin: cấu hình hệ thống | `PUT` | `/api/admin/system-configs/{key}` | JWT |
| M1 - Admin: cấu hình hệ thống | `GET` | `/api/policies` | Công khai |
| M1 - Admin: người dùng | `GET` | `/api/admin/users` | JWT |
| M1 - Admin: người dùng | `DELETE` | `/api/admin/users/{id}` | JWT |
| M1 - Admin: người dùng | `PATCH` | `/api/admin/users/{id}/lock` | JWT |
| M1 - Admin: người dùng | `PATCH` | `/api/admin/users/{id}/unlock` | JWT |
| M1 - Admin: nhật ký | `GET` | `/api/admin/audit-logs` | JWT |
| M1 - Admin: nhật ký | `GET` | `/api/admin/audit-logs/actions` | JWT |
| M1 - Admin: thống kê | `GET` | `/api/admin/dashboard` | JWT |
| M1 - Hồ sơ cá nhân | `GET` | `/api/me` | JWT |
| M1 - Hồ sơ cá nhân | `PUT` | `/api/me` | JWT |
| M1 - Hồ sơ cá nhân | `POST` | `/api/me/avatar` | JWT |
| M1 - Hồ sơ cá nhân | `PUT` | `/api/me/password` | JWT |
| M1 - Xác thực | `POST` | `/api/auth/forgot-password` | Công khai |
| M1 - Xác thực | `POST` | `/api/auth/login` | Công khai |
| M1 - Xác thực | `GET` | `/api/auth/me` | JWT |
| M1 - Xác thực | `POST` | `/api/auth/register` | Công khai |
| M1 - Xác thực | `POST` | `/api/auth/resend-otp` | Công khai |
| M1 - Xác thực | `POST` | `/api/auth/reset-password` | Công khai |
| M1 - Xác thực | `POST` | `/api/auth/verify-otp` | Công khai |
| M2 - Admin: duyệt gia sư | `GET` | `/api/admin/tutors` | JWT |
| M2 - Admin: duyệt gia sư | `GET` | `/api/admin/tutors/counts` | JWT |
| M2 - Admin: duyệt gia sư | `POST` | `/api/admin/tutors/{id}/approve` | JWT |
| M2 - Admin: duyệt gia sư | `POST` | `/api/admin/tutors/{id}/reject` | JWT |
| M2 - Danh mục | `GET` | `/api/meta` | Công khai |
| M2 - Hồ sơ gia sư (của tôi) | `GET` | `/api/tutor-profile` | JWT |
| M2 - Hồ sơ gia sư (của tôi) | `PUT` | `/api/tutor-profile` | JWT |
| M2 - Hồ sơ gia sư (của tôi) | `POST` | `/api/tutor-profile/certificates` | JWT |
| M2 - Hồ sơ gia sư (của tôi) | `DELETE` | `/api/tutor-profile/certificates/{id}` | JWT |
| M2 - Hồ sơ gia sư (của tôi) | `POST` | `/api/tutor-profile/submit` | JWT |
| M2 - Tìm gia sư | `GET` | `/api/tutors` | Công khai |
| M2 - Tìm gia sư | `GET` | `/api/tutors/{id}` | Công khai |
| M2 - Đánh giá | `POST` | `/api/reviews` | JWT |
| M2 - Đánh giá | `POST` | `/api/reviews/{id}/reply` | JWT |
| M2 - Đánh giá | `GET` | `/api/tutors/{id}/reviews` | Công khai |
| M3 - Admin: buổi học | `GET` | `/api/admin/bookings` | JWT |
| M3 - Admin: buổi học | `GET` | `/api/admin/bookings/counts` | JWT |
| M3 - Buổi học | `POST` | `/api/bookings` | JWT |
| M3 - Buổi học | `GET` | `/api/bookings/me` | JWT |
| M3 - Buổi học | `GET` | `/api/bookings/me/counts` | JWT |
| M3 - Buổi học | `GET` | `/api/bookings/{id}` | JWT |
| M3 - Buổi học | `POST` | `/api/bookings/{id}/cancel` | JWT |
| M3 - Buổi học | `POST` | `/api/bookings/{id}/confirm` | JWT |
| M3 - Buổi học | `POST` | `/api/bookings/{id}/mark-taught` | JWT |
| M3 - Lịch trống | `GET` | `/api/availability/rules` | JWT |
| M3 - Lịch trống | `POST` | `/api/availability/rules` | JWT |
| M3 - Lịch trống | `DELETE` | `/api/availability/rules/{id}` | JWT |
| M3 - Lịch trống | `GET` | `/api/availability/slots` | JWT |
| M3 - Lịch trống | `DELETE` | `/api/availability/slots/{id}` | JWT |
| M3 - Lịch trống | `GET` | `/api/tutors/{id}/slots` | Công khai |
| M4 - Admin: dòng tiền | `GET` | `/api/admin/finance/summary` | JWT |
| M4 - Admin: dòng tiền | `GET` | `/api/admin/payments` | JWT |
| M4 - Admin: dòng tiền | `GET` | `/api/admin/withdrawals` | JWT |
| M4 - Admin: dòng tiền | `POST` | `/api/admin/withdrawals/{id}/approve` | JWT |
| M4 - Admin: dòng tiền | `POST` | `/api/admin/withdrawals/{id}/reject` | JWT |
| M4 - Rút tiền | `POST` | `/api/withdrawals` | JWT |
| M4 - Rút tiền | `GET` | `/api/withdrawals/me` | JWT |
| M4 - Thanh toán | `POST` | `/api/payments/bookings/{bookingId}` | JWT |
| M4 - Thanh toán | `GET` | `/api/payments/me` | JWT |
| M4 - Thanh toán | `GET` | `/api/payments/mock/{txnRef}` | JWT |
| M4 - Thanh toán | `POST` | `/api/payments/mock/{txnRef}/complete` | JWT |
| M4 - Thanh toán | `GET` | `/api/payments/providers` | Công khai |
| M4 - Thanh toán | `GET` | `/api/payments/vnpay/ipn` | Công khai |
| M4 - Thanh toán | `GET` | `/api/payments/vnpay/return` | Công khai |
| M4 - Ví | `GET` | `/api/wallets/me` | JWT |
| M4 - Ví | `GET` | `/api/wallets/me/transactions` | JWT |
| M5 - Nhắn tin | `GET` | `/api/conversations` | JWT |
| M5 - Nhắn tin | `POST` | `/api/conversations` | JWT |
| M5 - Nhắn tin | `GET` | `/api/conversations/{id}` | JWT |
| M5 - Nhắn tin | `GET` | `/api/conversations/{id}/messages` | JWT |
| M5 - Nhắn tin | `POST` | `/api/conversations/{id}/messages` | JWT |
| M5 - Nhắn tin | `POST` | `/api/conversations/{id}/read` | JWT |
| M5 - Thông báo | `GET` | `/api/notifications` | JWT |
| M5 - Thông báo | `GET` | `/api/notifications/counts` | JWT |
| M5 - Thông báo | `POST` | `/api/notifications/read-all` | JWT |
| M5 - Thông báo | `POST` | `/api/notifications/{id}/read` | JWT |
| M5 - Tranh chấp | `GET` | `/api/admin/disputes` | JWT |
| M5 - Tranh chấp | `POST` | `/api/admin/disputes/{id}/resolve` | JWT |
| M5 - Tranh chấp | `POST` | `/api/disputes` | JWT |
| M5 - Tranh chấp | `GET` | `/api/disputes/me` | JWT |
| M5 - Tranh chấp | `GET` | `/api/disputes/{id}` | JWT |
| M5 - Tranh chấp | `POST` | `/api/disputes/{id}/respond` | JWT |
| Demo | `GET` | `/api/admin/demo/clock` | JWT |
| Demo | `POST` | `/api/admin/demo/reset-clock` | JWT |
| Demo | `POST` | `/api/admin/demo/run-jobs` | JWT |
| Demo | `POST` | `/api/admin/demo/time-travel` | JWT |
| Demo | `GET` | `/api/dev/info` | Công khai |
| Demo | `GET` | `/api/dev/mails` | Công khai |

### Mã lỗi thường gặp

| HTTP | errorCode | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Dữ liệu gửi lên sai định dạng hoặc có trường lạ |
| 400 | `INVALID_TRANSITION` | Buổi học không thể chuyển sang trạng thái yêu cầu |
| 400 | `HOLD_EXPIRED` | Hết thời gian giữ chỗ |
| 400 | `CANNOT_CANCEL`, `CANNOT_CONFIRM`, `CANNOT_DISPUTE` | Thao tác không hợp lệ ở trạng thái hiện tại |
| 400 | `INSUFFICIENT_BALANCE` | Số dư ví không đủ |
| 401 | `UNAUTHORIZED`, `TOKEN_INVALID`, `INVALID_CREDENTIALS` | Chưa đăng nhập / phiên hết hạn / sai mật khẩu |
| 403 | `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED` | Không đủ quyền / chưa xác thực / bị khóa |
| 404 | `NOT_FOUND` | Không tìm thấy |
| 409 | `SLOT_TAKEN`, `EMAIL_TAKEN`, `DUPLICATE` | Xung đột dữ liệu |
| 429 | `OTP_TOO_FREQUENT` | Gửi OTP quá nhanh |
