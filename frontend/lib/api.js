import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Récupère un token Clerk frais (Clerk gère le cache/refresh automatiquement)
const getClerkToken = async () => {
  try {
    return await window.Clerk?.session?.getToken() ?? null;
  } catch {
    return null;
  }
};

// Injecte le token Clerk dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sur 401 : tente un reload de session Clerk puis relance la requête une seule fois
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && !config?._retried) {
      config._retried = true;
      try {
        await window.Clerk?.session?.reload();
        const token = await getClerkToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
      } catch {
        // Impossible de rafraîchir la session
      }
    }
    return Promise.reject(error);
  },
);

export default api;
