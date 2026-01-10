import axios from 'axios';

let authHandlers = { onLogout: null };
export function setAuthHandlers(handlers) {
  authHandlers = { ...authHandlers, ...handlers };
}

const DEBUG = process.env.REACT_APP_DEBUG === '1';
const isProd = process.env.NODE_ENV === 'production';

// Prefer relative '/api' in prod to avoid CORS; allow override via REACT_APP_API_URL
const API_BASE_URL = isProd
  ? (process.env.REACT_APP_API_URL || '/api')
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 150000
});

// ---- Interceptors ----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (DEBUG) {
    const method = (config.method || 'get').toUpperCase();
    // keep logs light; never log full bodies in prod
    console.log('→', method, config.url, config.params || '');
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (DEBUG) console.log('←', res.status, res.config?.url);
    return res;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token invalid/expired — delegate to AuthContext
      if (typeof authHandlers.onLogout === 'function') {
        authHandlers.onLogout();
      } else {
        // Fallback: clear local state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    if (DEBUG) {
      console.warn('✖ API error', status, error?.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// ---- API wrappers ----
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile')
};

export const tripsAPI = {
  getTrips: (params) => api.get('/trips', { params }),
  createTrip: (data) => api.post('/trips', data),
  generateTrip: (data) => api.post('/trips/generate', data),
  getTripById: (id) => api.get(`/trips/${id}`),
  updateTrip: (id, data) => api.put(`/trips/${id}`, data),
  deleteTrip: (id) => api.delete(`/trips/${id}`),
  getStats: () => api.get('/trips/stats'),
  getTripWeather: (id) => api.get(`/trips/${id}/weather`)
};

export default api;