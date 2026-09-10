import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    const isPinError =
      /pin/i.test(err.response?.data?.message || '') ||
      err.config?.url?.includes('/transaction-pin');

    // Only redirect to login for true session / JWT authentication expiration
    if (err.response?.status === 401 && !isLogin && !isPinError) {
      localStorage.removeItem('nex_token');
      localStorage.removeItem('nex_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;