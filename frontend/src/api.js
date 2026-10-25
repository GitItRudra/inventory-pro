import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ip_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('ip_token');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';

export default api;
