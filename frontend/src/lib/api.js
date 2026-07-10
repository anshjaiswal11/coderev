import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://coderev-backend.vercel.app').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 120000, // 2-minute timeout to handle long-running AI requests
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export { API_BASE_URL };
export default api;
