import useSWR from 'swr';
import api from '../lib/api';

const fetcher = async (url) => (await api.get(url)).data;

// Statut des intégrations (LinkedIn connecté, Unsplash / IA configurés)
export function useSocialStatus() {
  const { data, error, isLoading, mutate } = useSWR('/api/social/status', fetcher);
  return {
    linkedin: data?.linkedin || { configured: false, account: null },
    unsplash: data?.unsplash || { configured: false },
    ai: data?.ai || { configured: false },
    isLoading,
    error,
    mutate,
  };
}

export function useSocialPosts() {
  const { data, error, isLoading, mutate } = useSWR('/api/social/posts', fetcher, {
    // Rafraîchit tant qu'un post est en cours de publication
    refreshInterval: (d) => (d?.posts?.some((p) => p.status === 'publishing') ? 3000 : 0),
  });
  return { posts: data?.posts || [], isLoading, error, mutate };
}

export const socialApi = {
  connectLinkedIn: async () => (await api.get('/api/social/linkedin/connect')).data,
  disconnectLinkedIn: async () => (await api.delete('/api/social/linkedin')).data,
  getPost: async (id) => (await api.get(`/api/social/posts/${id}`)).data.post,
  createPost: async (body) => (await api.post('/api/social/posts', body)).data.post,
  updatePost: async (id, body) => (await api.patch(`/api/social/posts/${id}`, body)).data.post,
  deletePost: async (id) => (await api.delete(`/api/social/posts/${id}`)).data,
  publishPost: async (id) => (await api.post(`/api/social/posts/${id}/publish`)).data.post,
  aiDraft: async (body) => (await api.post('/api/social/ai/draft', body)).data,
  searchPhotos: async (q) => (await api.get('/api/social/photos', { params: { q } })).data,
};
