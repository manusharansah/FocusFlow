import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

// The access token lives only in memory (never localStorage), so XSS cannot
// exfiltrate a long-lived credential. The refresh token is an HttpOnly cookie.
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };

const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });

let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/users/token/refresh/`, null, { withCredentials: true, timeout: 20000 })
      .then((r) => { accessToken = r.data.access; return r.data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/users/login') || original?.url?.includes('/users/token/refresh');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        window.dispatchEvent(new Event('ff:signed-out'));
      }
    }
    return Promise.reject(error);
  }
);

/** Turn any API error into a short, user-safe message. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (error?.response?.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (!error?.response) return 'Cannot reach the server. Check your connection.';
  if (typeof data?.detail === 'string') return data.detail;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}

export default api;
