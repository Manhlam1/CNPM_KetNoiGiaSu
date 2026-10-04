// M2 - Hồ sơ gia sư, Tìm kiếm & Đánh giá
import { http } from './client';

export const tutorApi = {
  meta: () => http.get('/meta'),
  search: (params) => http.get('/tutors', params),
  detail: (id) => http.get(`/tutors/${id}`),
  reviews: (id, params) => http.get(`/tutors/${id}/reviews`, params),
  // Gia sư tự quản lý hồ sơ
  mine: () => http.get('/tutor-profile'),
  update: (body) => http.put('/tutor-profile', body),
  submit: () => http.post('/tutor-profile/submit'),
  addCertificate: (title, file) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('file', file);
    return http.upload('/tutor-profile/certificates', fd);
  },
  removeCertificate: (id) => http.delete(`/tutor-profile/certificates/${id}`),
};

export const adminTutorApi = {
  list: (params) => http.get('/admin/tutors', params),
  counts: () => http.get('/admin/tutors/counts'),
  approve: (id) => http.post(`/admin/tutors/${id}/approve`),
  reject: (id, reason) => http.post(`/admin/tutors/${id}/reject`, { reason }),
};

export const reviewApi = {
  create: (body) => http.post('/reviews', body),
  reply: (id, reply) => http.post(`/reviews/${id}/reply`, { reply }),
};
