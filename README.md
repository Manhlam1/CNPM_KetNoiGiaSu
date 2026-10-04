# TutorHub

Nền tảng trung gian kết nối học viên với gia sư. Học viên tìm gia sư theo môn, khu vực, mức giá; xem hồ sơ và đánh giá; nhắn tin; chọn khung giờ trống và thanh toán qua cổng của hệ thống. Tiền được hệ thống **giữ hộ (escrow)**, chỉ giải ngân vào ví gia sư (sau khi trừ hoa hồng) khi buổi học đã diễn ra và học viên xác nhận, hoặc tự động sau 48 giờ nếu không có khiếu nại.

Đồ án môn Công nghệ phần mềm (IT3180). Ba vai trò: **Học viên**, **Gia sư**, **Quản trị viên**.

| Thành phần | Công nghệ |
|---|---|
| Backend | NestJS 11 (TypeScript), TypeORM, MySQL 8, JWT, Socket.IO, Swagger |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, Axios |
| Thanh toán | Cổng giả lập (mặc định) hoặc VNPay sandbox |
| Test | Jest (unit) + Supertest (integration trên MySQL thật) |

Lý do chọn NestJS thay vì Spring Boot và các quyết định kỹ thuật khác: xem [docs/DECISIONS.md](docs/DECISIONS.md).

---

## 1. Chạy nhanh bằng Docker

Cần Docker Desktop (hoặc Docker Engine + Compose v2).

```bash
cp .env.example .env        # Windows: copy .env.example .env
# mở .env, đổi MYSQL_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET
docker compose up --build
```

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:5173 | Web |
| http://localhost:9090/api/docs | Swagger |
| http://localhost:5173/dev/mailbox | Hộp thư demo (xem mã OTP) |

Lần chạy đầu backend tự tạo bảng và nạp dữ liệu mẫu (khoảng 20–40 giây). MySQL trong compose mở ra ngoài ở cổng **3307** để không đụng MySQL sẵn có trên máy.

> Lệnh `docker compose up` chưa chạy thử được trong môi trường xây dựng (Docker Hub bị chặn ở đó), dù backend bản production và cấu hình nginx đã được chạy kiểm tra riêng. Nếu gặp lỗi, dùng cách chạy thủ công bên dưới — cách này đã được chạy và test đầy đủ.

## 2. Chạy thủ công (không cần Docker)

Cần **Node.js 22** và **MySQL 8**.

**Bước 1. Tạo database** (chạy trong MySQL Workbench hoặc `mysql -u root -p`):

```sql
CREATE DATABASE tutorhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE tutorhub_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;  -- cho integration test
CREATE USER 'tutorhub'@'localhost' IDENTIFIED BY 'tutorhub';
GRANT ALL PRIVILEGES ON tutorhub.* TO 'tutorhub'@'localhost';
GRANT ALL PRIVILEGES ON tutorhub_test.* TO 'tutorhub'@'localhost';
FLUSH PRIVILEGES;
```

**Bước 2. Backend** (cổng 9090):

```bash
cd backend
cp .env.example .env        # sửa DB_USER/DB_PASSWORD nếu khác, đổi JWT_SECRET
npm install
npm run start:dev
```

Database trống thì backend tự nạp dữ liệu mẫu. Muốn xóa sạch và nạp lại từ đầu: `npm run seed`.

**Bước 3. Frontend** (cổng 5173, tự chuyển `/api` và `/socket.io` sang backend):

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173.

## 3. Tài khoản mẫu

Mật khẩu của **mọi** tài khoản mẫu là `123456`. Trang đăng nhập có sẵn nút điền nhanh ba tài khoản đầu.

| Email | Vai trò | Ghi chú |
|---|---|---|
| `admin@tutorhub.vn` | Quản trị viên | |
| `giasu@tutorhub.vn` | Gia sư | Nguyễn Thu Trang, Toán + Vật lý, 250.000đ/giờ, đã có buổi học, đánh giá, số dư ví |
| `hocvien@tutorhub.vn` | Học viên | Phạm Minh Khôi, đã có lịch sử học, đang có buổi sắp tới và hội thoại |
| `giasu01` … `giasu49@tutorhub.vn` | Gia sư | 46 hồ sơ đã duyệt, 2 chờ duyệt, 1 bị từ chối, 1 bản nháp |
| `hocvien01` … `hocvien29@tutorhub.vn` | Học viên | `hocvien28` đang bị khóa |

Dữ liệu mẫu gồm 50 gia sư, 30 học viên, các buổi học trong 6 tháng gần nhất ở đủ trạng thái, đánh giá, giao dịch ví, yêu cầu rút tiền, hội thoại. Mọi khoản tiền mẫu đều đi qua `EscrowService` thật nên sổ cái luôn cân.

## 4. Kịch bản demo (khoảng 5 phút)

Luồng chính từ tìm gia sư đến giải ngân. Mở hai cửa sổ (một cửa sổ ẩn danh) để thấy chat và thông báo realtime.

1. **Học viên** đăng nhập `hocvien@tutorhub.vn` → *Tìm gia sư* → lọc môn Toán, Hà Nội → mở hồ sơ một gia sư, xem chứng chỉ, điểm đánh giá, phân bố sao.
2. Bấm **Nhắn tin cho gia sư** để hỏi trước. Ở cửa sổ kia đăng nhập gia sư đó, tin nhắn hiện ngay, chuông thông báo tăng số.
3. Học viên chọn một khung giờ trống → **Giữ chỗ và thanh toán**. Khung giờ được giữ 15 phút, có đồng hồ đếm ngược.
4. Ở cổng thanh toán giả lập bấm **Thanh toán thành công**. Buổi học chuyển *Đã xác nhận*, tiền nằm ở ví giữ hộ, gia sư nhận thông báo.
5. Đăng nhập **admin** → *Công cụ demo* → bấm **+1 ngày** / **+3 giờ** cho tới khi *Giờ hệ thống* đã qua giờ kết thúc buổi học. Buổi học chuyển *Chờ xác nhận* sau tối đa 30 giây, hoặc bấm *Chạy job ngay*.
6. Học viên mở buổi học → **Xác nhận hoàn tất** → viết đánh giá. Tiền giải ngân: gia sư nhận 90%, nền tảng giữ 10% hoa hồng.
7. Gia sư mở **Ví** thấy số dư tăng, gửi yêu cầu rút tiền; admin duyệt ở *Rút tiền*.
8. Admin mở **Dòng tiền**: dòng kiểm tra báo *Sổ sách khớp* (tổng đã thu = đang giữ + đã chi ra cho gia sư, hoa hồng, hoàn tiền; số dư từng ví khớp sổ cái).

Các nhánh nên trình diễn thêm:

- **Hủy**: hủy buổi còn hơn 24 giờ thì hoàn 100% vào ví học viên; gia sư hủy luôn hoàn 100%.
- **Hết hạn giữ chỗ**: giữ chỗ rồi không trả, tua **+30 phút** → buổi *Hết hạn*, khung giờ mở lại.
- **Khiếu nại**: sau giờ học, học viên bấm *Khiếu nại* (kèm ảnh) thay vì xác nhận → tiền bị đóng băng, tua **+48 giờ** vẫn không tự giải ngân → admin xem tin nhắn hai bên làm bằng chứng và quyết định *Chuyển tiền cho gia sư* hoặc *Hoàn tiền cho học viên*.
- **Tự giải ngân**: không xác nhận, tua thêm **+48 giờ** → hệ thống tự hoàn tất và giải ngân.
- **Đăng ký mới**: đăng ký tài khoản → lấy mã OTP ở `/dev/mailbox` → đăng nhập. Gia sư mới điền hồ sơ, tải chứng chỉ, gửi duyệt; admin duyệt ở *Duyệt gia sư*.
- **Đặt trùng**: hai học viên bấm giữ cùng một khung giờ, chỉ một người thành công (có integration test với 10 request song song).

Bấm **Về giờ thật** ở *Công cụ demo* sau khi demo xong.

## 5. Tham số nghiệp vụ

Admin sửa được ở *Cấu hình hệ thống*, mỗi lần sửa được ghi nhật ký.

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `commission.percent` | 10 | Phần trăm hoa hồng nền tảng giữ lại |
| `booking.holdMinutes` | 15 | Thời gian giữ chỗ chờ thanh toán |
| `escrow.autoReleaseHours` | 48 | Sau giờ học bao lâu thì tự giải ngân (cũng là hạn khiếu nại) |
| `cancel.fullRefundHours` | 24 | Hủy trước giờ học ít nhất bao lâu thì được hoàn 100% |
| `slots.generateWeeks` | 4 | Số tuần sinh sẵn khung giờ từ lịch lặp |

Tiền lưu bằng số nguyên đồng. Múi giờ hiển thị `Asia/Ho_Chi_Minh`, lưu trong DB theo UTC.

### Vòng đời buổi học

```
PENDING_PAYMENT ──trả tiền──▶ CONFIRMED ──hết giờ học──▶ AWAITING_CONFIRMATION ──xác nhận / 48h──▶ COMPLETED
      │                          │                               │
      ├─quá 15 phút─▶ EXPIRED    └─hủy─▶ CANCELLED               └─khiếu nại─▶ DISPUTED ──admin─▶ COMPLETED | REFUNDED
      └─hủy─▶ CANCELLED
```

Bảng chuyển trạng thái nằm ở `backend/src/modules/m3-booking/booking-state.ts`; mọi thay đổi trạng thái đều đi qua bảng này. Sơ đồ đầy đủ trong [docs/SDD.md](docs/SDD.md).

## 6. Thanh toán VNPay sandbox

Mặc định `PAYMENT_PROVIDER=mock`: cổng giả lập chạy hoàn toàn trên máy, gọi đúng hàm xử lý kết quả mà IPN của VNPay dùng.

Để dùng VNPay sandbox:

1. Đăng ký tài khoản test tại https://sandbox.vnpayment.vn/devreg/ để nhận `vnp_TmnCode` và `vnp_HashSecret`.
2. Chạy `ngrok http 9090` để có URL công khai, ví dụ `https://abcd.ngrok-free.app`.
3. Sửa `backend/.env` (hoặc `.env` ở gốc nếu dùng Docker):
   ```
   PAYMENT_PROVIDER=vnpay
   VNPAY_TMN_CODE=<mã của bạn>
   VNPAY_HASH_SECRET=<secret của bạn>
   VNPAY_RETURN_URL=https://abcd.ngrok-free.app/api/payments/vnpay/return
   VNPAY_PROCESS_ON_RETURN=false
   ```
4. Trong trang quản trị merchant sandbox, khai báo IPN URL: `https://abcd.ngrok-free.app/api/payments/vnpay/ipn`.
5. Thanh toán bằng thẻ test NCB do VNPay cung cấp trong tài liệu sandbox.

Không có ngrok thì để `VNPAY_PROCESS_ON_RETURN=true`: kết quả được xử lý ngay tại Return URL (vẫn kiểm tra chữ ký và chống xử lý hai lần). Khi chạy thật phải đặt `false` và chỉ tin IPN.

## 7. Chạy test

```bash
cd backend
npm test             # 47 unit test: trạng thái, chính sách hủy, sinh slot, hoa hồng, VNPay, Escrow, Wallet
npm run test:e2e     # 12 integration test trên database tutorhub_test (cần MySQL đang chạy)
npm run lint         # kiểm tra kiểu TypeScript
```

Integration test chạy toàn bộ ứng dụng, đi qua API thật: đặt lịch → thanh toán → xác nhận → giải ngân; hủy và hoàn tiền; hết hạn giữ chỗ; tiền tới muộn sau khi hết hạn; IPN gọi lặp; chữ ký sai; khiếu nại; 10 request đặt cùng một khung giờ. Sau mỗi test đều kiểm tra lại bất biến tiền.

Postman: import `docs/postman/TutorHub.postman_collection.json` (89 request, request đăng nhập tự lưu token vào biến `token`). Sinh lại từ Swagger khi API đổi: chạy backend rồi `python3 scripts/gen-postman.py`.

## 8. Tài liệu

| File | Nội dung |
|---|---|
| [docs/SRS.md](docs/SRS.md) | Đặc tả yêu cầu: tác nhân, use case, yêu cầu chức năng, quy tắc nghiệp vụ, phi chức năng |
| [docs/SDD.md](docs/SDD.md) | Thiết kế: kiến trúc, ERD, sơ đồ lớp, sơ đồ trạng thái, sơ đồ tuần tự, bảng API, mã lỗi |
| [docs/MODULES.md](docs/MODULES.md) | File nào thuộc module nào, ai phụ trách |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Các quyết định kỹ thuật và lý do |
| `docs/openapi.json` | Đặc tả OpenAPI xuất từ Swagger |

Sơ đồ viết bằng Mermaid, GitHub hiển thị trực tiếp.

## 9. Cấu trúc thư mục

```
tutorhub/
├── docker-compose.yml, .env.example
├── backend/
│   ├── src/
│   │   ├── main.ts, app.module.ts
│   │   ├── config/                  đọc biến môi trường
│   │   ├── common/                  ApiResponse, guard, filter, interceptor, enum, tiền, upload, mail
│   │   ├── database/                dữ liệu mẫu
│   │   └── modules/
│   │       ├── m1-account/          đăng ký, đăng nhập, người dùng, cấu hình, nhật ký, dashboard
│   │       ├── m2-tutor/            hồ sơ gia sư, tìm kiếm, đánh giá
│   │       ├── m3-booking/          lịch trống, slot, đặt lịch, trạng thái, job
│   │       ├── m4-payment/          thanh toán, escrow, ví, sổ cái, rút tiền
│   │       ├── m5-communication/    chat, thông báo, khiếu nại, Socket.IO
│   │       └── demo/                tua thời gian, hộp thư dev
│   └── test/                        integration test
├── frontend/src/
│   ├── api/                         gọi API theo module
│   ├── components/                  UI dùng chung, layout
│   ├── context/                     đăng nhập, realtime, toast
│   ├── pages/                       public, auth, app, tutor, admin, payment, dev
│   └── utils/                       định dạng tiền/giờ, nhãn tiếng Việt
├── docs/
└── scripts/
```

## 10. Quy ước API

- Mọi API có tiền tố `/api`. Nhóm theo vai trò: công khai (`/api/tutors`, `/api/meta`…), người dùng đã đăng nhập (`/api/me`, `/api/bookings`…), quản trị (`/api/admin/*`).
- Xác thực: header `Authorization: Bearer <token>` lấy từ `POST /api/auth/login`.
- Mọi phản hồi cùng một dạng:
  ```text
  { "success": true, "data": { }, "message": null, "errorCode": null }
  { "success": false, "data": null, "message": "Bạn cần đăng nhập", "errorCode": "UNAUTHORIZED" }
  ```
- Danh sách có phân trang trả `data` dạng `{ "items": [], "page": 1, "size": 10, "totalElements": 0, "totalPages": 1 }`. Tham số `?page=1&size=10` (tối đa 100), trang bắt đầu từ 1.
- Lỗi có `errorCode` để frontend xử lý, ví dụ `SLOT_TAKEN`, `INVALID_TRANSITION`, `VALIDATION_FAILED`. Bảng đầy đủ ở cuối [docs/SDD.md](docs/SDD.md).

## 11. Phân quyền

| Chức năng | Khách | Học viên | Gia sư | Admin |
|---|:-:|:-:|:-:|:-:|
| Tìm kiếm, xem hồ sơ gia sư, đánh giá | ✓ | ✓ | ✓ | ✓ |
| Nhắn tin | | ✓ | ✓ (với học viên đã đặt/nhắn trước) | |
| Đặt lịch, thanh toán, xác nhận, khiếu nại, đánh giá | | ✓ | | |
| Sửa hồ sơ dạy, mở lịch trống, đánh dấu đã dạy, ví, rút tiền, phản hồi đánh giá/khiếu nại | | | ✓ | |
| Hủy buổi học | | ✓ | ✓ | |
| Duyệt gia sư, quản lý người dùng, cấu hình, dòng tiền, duyệt rút tiền, xử lý khiếu nại, nhật ký, tua thời gian | | | | ✓ |

## 12. Phân công

| Module | Phụ trách |
|---|---|
| M1. Tài khoản & Quản trị | TV1 (nhóm trưởng) |
| M2. Hồ sơ gia sư, Tìm kiếm & Đánh giá | TV2 |
| M3. Lịch trống & Đặt lịch | TV3 |
| M4. Thanh toán, Escrow & Ví | TV4 |
| M5. Nhắn tin, Thông báo & Tranh chấp | TV5 |

Danh sách file của từng module: [docs/MODULES.md](docs/MODULES.md).

## 13. Bảo mật cấu hình

File `.env` chứa mật khẩu DB, `JWT_SECRET`, secret VNPay và đã nằm trong `.gitignore`. Repo chỉ chứa `.env.example`. Trước khi push, chạy `git status` để chắc chắn không có file `.env` nào được thêm vào.
