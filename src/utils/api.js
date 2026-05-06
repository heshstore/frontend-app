import { API_URL } from '../config';

export function getToken() {
  return localStorage.getItem('access_token');
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('permissions');
  window.location.href = '/';
}

/**
 * Authenticated fetch wrapper.
 * - Injects Bearer token
 * - Aborts after 20 s (prevents infinite hang on Render cold-start)
 * - Logs request + outcome to console for diagnostics
 * - Calls logout() on 401
 */
export async function apiFetch(path, options = {}) {
  const token   = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const relPath = path.startsWith('/') ? path : `/${path}`;
  const url     = path.startsWith('http') ? path : `${API_URL}${relPath}`;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  try {
    console.debug(`[API] ${options.method || 'GET'} ${url}`);
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    console.debug(`[API] ${res.status} ${url}`);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const msg = `Request timed out after 20 s — ${url}`;
      console.error('[API] timeout:', msg);
      throw new Error(msg);
    }
    console.error(`[API] fetch error: ${err.message} — ${url}`);
    throw err;
  }
}

export default apiFetch;
