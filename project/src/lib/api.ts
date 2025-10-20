// Central API configuration for frontend
// Note: In Vite, only variables prefixed with VITE_ are exposed to the client.
// We still attempt to read REACT_APP_API_BASE_URL for compatibility, but you should prefer VITE_API_BASE.
const ENV: any = (import.meta as any).env || {};
export const API_BASE = ENV.VITE_API_BASE || ENV.REACT_APP_API_BASE_URL || 'https://printmoney-backend.onrender.com';

export const apiUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
};

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
