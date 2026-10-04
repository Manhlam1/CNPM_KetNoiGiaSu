// Dữ liệu nguồn cho bộ seed (tên, mô tả, nhận xét...). Toàn bộ là nhân vật hư cấu.

/** PRNG có seed cố định -> mỗi lần seed ra cùng một bộ dữ liệu */
export function rng(seed = 20261004) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(xs: T[]): T => xs[Math.floor(next() * xs.length)],
    sample: <T>(xs: T[], n: number): T[] => {
      const copy = [...xs];
      const out: T[] = [];
      while (out.length < n && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      return out;
    },
    chance: (p: number) => next() < p,
  };
}

export const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
export const DEM = ['Văn', 'Thị', 'Minh', 'Thu', 'Ngọc', 'Quang', 'Đức', 'Thanh', 'Hoài', 'Gia', 'Bảo', 'Hải', 'Khánh', 'Phương', 'Tuấn', 'Thùy'];
export const TEN = [
  'An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Huy', 'Hương', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Minh',
  'Nam', 'Ngân', 'Nhung', 'Phong', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Trung', 'Tú', 'Tuấn', 'Vy', 'Yến', 'Đạt', 'Khang',
];

export const EDUCATION: Record<string, string[]> = {
  'Phổ thông': [
    'Cử nhân Sư phạm Toán - ĐH Sư phạm Hà Nội',
    'Sinh viên năm 4 ngành Kỹ thuật - ĐH Bách khoa Hà Nội',
    'Thạc sĩ Vật lý - ĐH Khoa học Tự nhiên',
    'Cử nhân Sư phạm Hóa học - ĐH Sư phạm TP.HCM',
    'Cử nhân Văn học - ĐH Khoa học Xã hội và Nhân văn',
    'Giáo viên THPT, 8 năm đứng lớp',
    'Sinh viên năm 3 ngành Y đa khoa',
  ],
  'Ngoại ngữ': [
    'Thạc sĩ Ngôn ngữ Anh - ĐH Ngoại ngữ, ĐHQG Hà Nội',
    'IELTS 8.0, cử nhân Sư phạm Tiếng Anh',
    'Cử nhân Ngôn ngữ Nhật, JLPT N1',
    'Cử nhân Ngôn ngữ Hàn, TOPIK 6',
    'HSK 6, du học sinh Trung Quốc 4 năm',
    'TOEIC 950, biên dịch viên',
  ],
  'Tin học': [
    'Kỹ sư Công nghệ thông tin - ĐH Bách khoa TP.HCM',
    'Sinh viên năm 4 ngành Khoa học máy tính',
    'Lập trình viên backend 5 năm kinh nghiệm',
  ],
  'Năng khiếu': ['Tốt nghiệp Nhạc viện Hà Nội', 'Cử nhân Mỹ thuật ứng dụng', 'Giảng viên trung tâm âm nhạc 6 năm'],
};

export const METHODS = [
  'Mỗi buổi đều có phiếu bài tập và nhận xét gửi phụ huynh.',
  'Dạy theo lộ trình riêng sau buổi kiểm tra đầu vào.',
  'Chú trọng hiểu bản chất thay vì học thuộc công thức.',
  'Có bộ đề luyện tập theo từng chuyên đề, chữa bài chi tiết.',
  'Kết hợp ví dụ thực tế để học viên dễ nhớ lâu.',
  'Học online qua Google Meet, có bảng vẽ chung.',
];

export const RESULTS = [
  'Nhiều học viên tăng từ 5 lên 8 điểm sau một học kỳ.',
  'Đã đồng hành cùng hơn 40 học viên ôn thi vào lớp 10.',
  'Học viên đạt giải học sinh giỏi cấp quận.',
  'Học viên đạt band 7.0 sau 3 tháng luyện thi.',
  'Nhiều học viên tự làm được dự án nhỏ sau khóa học.',
];

export const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Thầy/cô giảng rất dễ hiểu, em đã nắm chắc phần mình yếu.',
    'Đúng giờ, chuẩn bị bài kỹ, có bài tập về nhà rõ ràng.',
    'Con tôi tiến bộ rõ sau vài buổi, rất hài lòng.',
    'Buổi học vui, không áp lực mà vẫn hiệu quả.',
    'Giải thích kiên nhẫn, chữa bài từng bước một.',
  ],
  4: ['Dạy tốt, đôi lúc hơi nhanh nhưng hỏi lại thì giảng kỹ.', 'Nhiệt tình, tài liệu đầy đủ.', 'Buổi học ổn, mong có thêm bài luyện tập.'],
  3: ['Kiến thức tốt nhưng phần giải thích hơi khó theo kịp.', 'Bắt đầu muộn vài phút, nội dung thì ổn.'],
  2: ['Buổi học chưa đúng trọng tâm em cần.'],
};

export const CHAT_SCRIPT: [boolean, string][] = [
  [true, 'Chào cô, em đang học lớp 12, muốn ôn lại phần hàm số và đạo hàm ạ.'],
  [false, 'Chào em. Cô có lịch trống tối thứ Ba, thứ Năm và sáng thứ Bảy. Em định học mấy buổi một tuần?'],
  [true, 'Dạ em muốn học 2 buổi một tuần, buổi đầu em đặt tối thứ Ba được không ạ?'],
  [false, 'Được em. Em đặt trên TutorHub là cô nhận được, nhớ mang theo đề kiểm tra gần nhất để cô xem em hổng phần nào nhé.'],
  [true, 'Dạ vâng, em cảm ơn cô ạ.'],
];
