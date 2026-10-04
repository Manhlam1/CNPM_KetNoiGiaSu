// M1 - Tài khoản & Quản trị
import { http, requestWithMessage } from './client';

export const authApi = {
  register: (body) => requestWithMessage('post', '/auth/register', body),
  verifyOtp: (email, code) => http.post('/auth/verify-otp', { email, code }),
  resendOtp: (email) => requestWithMessage('post', '/auth/resend-otp', { email }),
  login: (email, password) => http.post('/auth/login', { email, password }),
  forgotPassword: (email) => requestWithMessage('post', '/auth/forgot-password', { email }),
  resetPassword: (body) => requestWithMessage('post', '/auth/reset-password', body),
};

export const profileApi = {
  me: () => http.get('/me'),
  update: (body) => http.put('/me', body),
  changePassword: (body) => requestWithMessage('put', '/me/password', body),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.upload('/me/avatar', fd);
  },
};

export const adminAccountApi = {
  users: (params) => http.get('/admin/users', params),
  lock: (id) => http.patch(`/admin/users/${id}/lock`),
  unlock: (id) => http.patch(`/admin/users/${id}/unlock`),
  remove: (id) => http.delete(`/admin/users/${id}`),
  configs: () => http.get('/admin/system-configs'),
  updateConfig: (key, value) => http.put(`/admin/system-configs/${encodeURIComponent(key)}`, { value: String(value) }),
  auditLogs: (params) => http.get('/admin/audit-logs', params),
  auditActions: () => http.get('/admin/audit-logs/actions'),
  dashboard: () => http.get('/admin/dashboard'),
};

export const publicApi = {
  policies: () => http.get('/policies'),
  devInfo: () => http.get('/dev/info'),
  devMails: () => http.get('/dev/mails'),
};
