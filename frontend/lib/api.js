import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injecte automatiquement le token Clerk dans chaque requête
// Sera activé en Phase 4 quand Clerk sera configuré
// api.interceptors.request.use(async (config) => {
//   const token = await window.Clerk?.session?.getToken();
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default api;
