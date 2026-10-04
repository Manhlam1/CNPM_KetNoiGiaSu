// M5 - Nhắn tin, Thông báo & Tranh chấp
import { http } from './client';

export const chatApi = {
  /** Mở (hoặc lấy lại) hội thoại với người dùng kia: học viên <-> gia sư */
  start: (userId) => http.post('/conversations', { userId }),
  list: () => http.get('/conversations'),
  messages: (id, params) => http.get(`/conversations/${id}/messages`, params),
  send: (id, content) => http.post(`/conversations/${id}/messages`, { content }),
  markRead: (id) => http.post(`/conversations/${id}/read`),
};

export const notificationApi = {
  list: (params) => http.get('/notifications', params),
  counts: () => http.get('/notifications/counts'),
  read: (id) => http.post(`/notifications/${id}/read`),
  readAll: () => http.post('/notifications/read-all'),
};
