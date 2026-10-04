// Danh mục dùng chung: môn học, cấp học, khu vực (TP + khu vực quen gọi)

export const SUBJECT_SEED: { name: string; slug: string; groupName: string }[] = [
  { name: 'Toán', slug: 'toan', groupName: 'Phổ thông' },
  { name: 'Ngữ văn', slug: 'ngu-van', groupName: 'Phổ thông' },
  { name: 'Tiếng Anh', slug: 'tieng-anh', groupName: 'Phổ thông' },
  { name: 'Vật lý', slug: 'vat-ly', groupName: 'Phổ thông' },
  { name: 'Hóa học', slug: 'hoa-hoc', groupName: 'Phổ thông' },
  { name: 'Sinh học', slug: 'sinh-hoc', groupName: 'Phổ thông' },
  { name: 'Lịch sử', slug: 'lich-su', groupName: 'Phổ thông' },
  { name: 'Địa lý', slug: 'dia-ly', groupName: 'Phổ thông' },
  { name: 'IELTS', slug: 'ielts', groupName: 'Ngoại ngữ' },
  { name: 'TOEIC', slug: 'toeic', groupName: 'Ngoại ngữ' },
  { name: 'Tiếng Nhật', slug: 'tieng-nhat', groupName: 'Ngoại ngữ' },
  { name: 'Tiếng Hàn', slug: 'tieng-han', groupName: 'Ngoại ngữ' },
  { name: 'Tiếng Trung', slug: 'tieng-trung', groupName: 'Ngoại ngữ' },
  { name: 'Tin học', slug: 'tin-hoc', groupName: 'Tin học' },
  { name: 'Lập trình Python', slug: 'lap-trinh-python', groupName: 'Tin học' },
  { name: 'Lập trình C/C++', slug: 'lap-trinh-c', groupName: 'Tin học' },
  { name: 'Piano', slug: 'piano', groupName: 'Năng khiếu' },
  { name: 'Guitar', slug: 'guitar', groupName: 'Năng khiếu' },
  { name: 'Vẽ', slug: 've', groupName: 'Năng khiếu' },
];

export const LEVELS = ['Tiểu học', 'THCS', 'THPT', 'Luyện thi đại học', 'Đại học', 'Người đi làm'];

export const CITIES: Record<string, string[]> = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Tây Hồ', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hà Đông'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Quận 10', 'Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Tân Bình', 'Thủ Đức'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu'],
  'Hải Phòng': ['Lê Chân', 'Ngô Quyền', 'Hồng Bàng', 'Kiến An'],
};

export const MIN_HOURLY_RATE = 50_000;
export const MAX_HOURLY_RATE = 2_000_000;
