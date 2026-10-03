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
  // Public static data is fetched without the token so CDNs can cache it
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Static data cache ────────────────────────────────
// Quran text never changes, so keep responses in memory for the session.
// The promise itself is cached so parallel callers share one request.
const staticCache = new Map();
const STATIC_TTL = 60 * 60 * 1000; // 1 hour

function cachedGet(url) {
  const hit = staticCache.get(url);
  if (hit && Date.now() - hit.time < STATIC_TTL) return hit.promise;

  const promise = api.get(url, { skipAuth: true }).catch((err) => {
    staticCache.delete(url);
    throw err;
  });
  staticCache.set(url, { promise, time: Date.now() });
  return promise;
}

/** Warm the cache in the background (e.g. verses for the next screen). */
export function prefetch(url) {
  cachedGet(url).catch(() => {});
}

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect to login if the user had a token (session expired)
      // and they are on a page that requires auth (not public content pages)
      const publicPaths = ['/', '/login', '/register', '/surahs', '/surah', '/learn', '/practice'];
      const isPublicPath = publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith('/surah/'));
      
      if (hadToken && !isPublicPath && window.location.pathname !== '/login') {
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
  getAll: () => cachedGet('/chapters'),
  getOne: (number) => cachedGet(`/chapters/${number}`),
  getProgress: (number) => api.get(`/chapters/${number}/progress`)
};

// ─── Verse API ────────────────────────────────────────
export const verseAPI = {
  getByChapter: (chapterNum) => cachedGet(`/verses/${chapterNum}`),
  getOne: (chapterNum, verseNum) => cachedGet(`/verses/${chapterNum}/${verseNum}`),
  getByKey: (verseKey) => cachedGet(`/verses/by-key/${verseKey}`)
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
