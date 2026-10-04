// M5 - Tranh chấp
import { http } from './client';

export const disputeApi = {
  open: ({ bookingId, category, description, files }) => {
    const fd = new FormData();
    fd.append('bookingId', String(bookingId));
    fd.append('category', category);
    fd.append('description', description);
    (files || []).forEach((f) => fd.append('files', f));
    return http.upload('/disputes', fd);
  },
  mine: (params) => http.get('/disputes/me', params),
  detail: (id) => http.get(`/disputes/${id}`),
  respond: (id, response) => http.post(`/disputes/${id}/respond`, { response }),
  adminList: (params) => http.get('/admin/disputes', params),
  resolve: (id, decision, note) => http.post(`/admin/disputes/${id}/resolve`, { decision, note }),
};
