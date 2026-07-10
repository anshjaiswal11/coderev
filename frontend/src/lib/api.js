import axios from 'axios';

const api = axios.create({
  baseURL: 'https://coderev-backend.vercel.app/api',
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

export default api;
