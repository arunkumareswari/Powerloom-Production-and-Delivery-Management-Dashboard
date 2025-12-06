import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  resetPassword: (username: string, newPassword: string) =>
    api.post('/auth/reset-password', null, { params: { username, new_password: newPassword } }),
};

// Dashboard APIs
export const dashboardAPI = {
  getOverview: (params?: any) => api.get('/dashboard/overview', { params }),
};

// Beam APIs
export const beamAPI = {
  getAll: (status: string = 'active') => api.get('/beams', { params: { status } }),
  getById: (id: number) => api.get(`/beams/${id}`),
  startBeam: (data: any) => api.post('/beams/start', data),
};

// Delivery APIs
export const deliveryAPI = {
  add: (data: any) => api.post('/deliveries/add', data),
};

// Workshop APIs
export const workshopAPI = {
  getAll: () => api.get('/workshops'),
  getMachines: (workshopId: number) => api.get(`/workshops/${workshopId}/machines`),
};

// Customer APIs
export const customerAPI = {
  getAll: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
};

// Design Presets
export const designAPI = {
  getPresets: () => api.get('/design-presets'),
};

// Reports
export const reportAPI = {
  getBeamReport: (startDate: string, endDate: string) =>
    api.get('/reports/beam-details', { params: { start_date: startDate, end_date: endDate } }),
};

export default api;