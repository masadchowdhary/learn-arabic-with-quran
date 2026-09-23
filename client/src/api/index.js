import axios from 'axios';

let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// If VITE_API_URL is set (e.g. in Vercel) but missing the /api suffix, append it
if (API_BASE && !API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// ─── Chapter API ──────────────────────────────────────
export const chapterAPI = {
  getAll: () => api.get('/chapters'),
  getOne: (number) => api.get(`/chapters/${number}`),
  getProgress: (number) => api.get(`/chapters/${number}/progress`)
};

// ─── Verse API ────────────────────────────────────────
export const verseAPI = {
  getByChapter: (chapterNum) => api.get(`/verses/${chapterNum}`),
  getOne: (chapterNum, verseNum) => api.get(`/verses/${chapterNum}/${verseNum}`),
  getByKey: (verseKey) => api.get(`/verses/by-key/${verseKey}`)
};

// ─── Practice API ─────────────────────────────────────
export const practiceAPI = {
  generateSession: (data) => api.post('/practice/session', data),
  submitResults: (data) => api.post('/practice/submit', data),
  getReviewWords: (limit = 20) => api.get(`/practice/review?limit=${limit}`)
};

// ─── Progress API ─────────────────────────────────────
export const progressAPI = {
  getOverview: () => api.get('/progress/overview'),
  getChapters: () => api.get('/progress/chapters'),
  getWords: (params) => api.get('/progress/words', { params }),
  getStats: () => api.get('/progress/stats')
};

export default api;
