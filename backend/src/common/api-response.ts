// ============================================================
//  ApiResponse<T> / PageResponse<T> — định dạng response chuẩn (giống BlueMoon)
//  { success, data, message, errorCode }
// ============================================================
export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public data: T | null,
    public message: string | null = null,
    public errorCode: string | null = null,
  ) {}

  static ok<T>(data: T, message: string | null = null): ApiResponse<T> {
    return new ApiResponse<T>(true, data, message, null);
  }

  static fail(message: string, errorCode: string): ApiResponse<null> {
    return new ApiResponse<null>(false, null, message, errorCode);
  }
}

export interface PageResponse<T> {
  items: T[];
  page: number; // bắt đầu từ 1
  size: number;
  totalElements: number;
  totalPages: number;
}

export function toPage<T>(items: T[], total: number, page: number, size: number): PageResponse<T> {
  return {
    items,
    page,
    size,
    totalElements: total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}
