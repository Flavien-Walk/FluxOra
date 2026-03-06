import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injecte le token Clerk dans chaque requête via window.Clerk
// Clerk expose l'objet globalement côté client
api.interceptors.request.use(async (config) => {
  try {
    const token = await window.Clerk?.session?.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Clerk pas encore chargé — la requête part sans token
  }
  return config;
});

export default api;
