// ============================================================
//  HTTP client dùng chung
//  - Tự gắn JWT (Authorization: Bearer ...)
//  - Backend luôn trả ApiResponse { success, data, message, errorCode }
//  - http.get/post/... trả về `data`, lỗi thì ném ApiError(message, errorCode, status)
// ============================================================
import axios from 'axios';

const AUTH_KEY = 'tutorhub_auth';

export class ApiError extends Error {
  constructor(message, errorCode, status) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}

export const authStore = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    } catch {
      /* trình duyệt chặn localStorage: phiên chỉ sống trong bộ nhớ */
    }
  },
  clear() {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  },
  token() {
    return this.get()?.token || null;
  },
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
});

instance.interceptors.request.use((config) => {
  const token = authStore.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function toError(err) {
  if (err.response) {
    const p = err.response.data || {};
    const e = new ApiError(p.message || `Lỗi máy chủ (${err.response.status})`, p.errorCode || null, err.response.status);
    if (err.response.status === 401 && authStore.token() && onUnauthorized) onUnauthorized();
    return e;
  }
  if (err.code === 'ECONNABORTED') return new ApiError('Máy chủ phản hồi quá lâu, thử lại sau', 'TIMEOUT', 0);
  return new ApiError('Không kết nối được máy chủ. Kiểm tra backend (cổng 9090) đã chạy chưa.', 'NETWORK_ERROR', 0);
}

async function request(method, url, { params, data, headers } = {}) {
  try {
    const res = await instance.request({ method, url: `/api${url}`, params, data, headers });
    const body = res.data;
    return body && typeof body === 'object' && 'success' in body ? body.data : body;
  } catch (err) {
    throw toError(err);
  }
}

/** Gọi API, trả về cả message (cho các thao tác cần hiện thông báo của backend) */
export async function requestWithMessage(method, url, data) {
  try {
    const res = await instance.request({ method, url: `/api${url}`, data });
    return { data: res.data?.data, message: res.data?.message };
  } catch (err) {
    throw toError(err);
  }
}

export const http = {
  get: (url, params) => request('get', url, { params }),
  post: (url, data) => request('post', url, { data }),
  put: (url, data) => request('put', url, { data }),
  patch: (url, data) => request('patch', url, { data }),
  delete: (url) => request('delete', url),
  upload: (url, formData) => request('post', url, { data: formData, headers: { 'Content-Type': 'multipart/form-data' } }),
};
