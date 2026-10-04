// M3 - Lịch trống & Đặt lịch
import { http } from './client';

export const availabilityApi = {
  publicSlots: (tutorId, params) => http.get(`/tutors/${tutorId}/slots`, params),
  rules: () => http.get('/availability/rules'),
  createRule: (body) => http.post('/availability/rules', body),
  deleteRule: (id) => http.delete(`/availability/rules/${id}`),
  mySlots: (params) => http.get('/availability/slots', params),
  cancelSlot: (id) => http.delete(`/availability/slots/${id}`),
};

export const bookingApi = {
  create: (body) => http.post('/bookings', body),
  mine: (params) => http.get('/bookings/me', params),
  counts: () => http.get('/bookings/me/counts'),
  detail: (id) => http.get(`/bookings/${id}`),
  cancel: (id, reason) => http.post(`/bookings/${id}/cancel`, reason ? { reason } : {}),
  markTaught: (id) => http.post(`/bookings/${id}/mark-taught`),
  confirm: (id) => http.post(`/bookings/${id}/confirm`),
  adminList: (params) => http.get('/admin/bookings', params),
  adminCounts: () => http.get('/admin/bookings/counts'),
};

export const demoApi = {
  clock: () => http.get('/admin/demo/clock'),
  travel: (hours) => http.post('/admin/demo/time-travel', { hours }),
  reset: () => http.post('/admin/demo/reset-clock'),
  runJobs: () => http.post('/admin/demo/run-jobs'),
};
