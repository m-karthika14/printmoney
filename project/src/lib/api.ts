// Central API configuration for frontend
// Note: In Vite, only variables prefixed with VITE_ are exposed to the client.
// We still attempt to read REACT_APP_API_BASE_URL for compatibility, but you should prefer VITE_API_BASE.
const ENV: any = (import.meta as any).env || {};
// Default to local backend during development
export const API_BASE = ENV.VITE_API_BASE || ENV.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export const apiUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
};

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}

// Helper: fetch dashboard stats in unified shape
export async function fetchDashboard(shopId: string) {
  const resp = await apiFetch(`/api/shops/shop/${encodeURIComponent(shopId)}/dashboard`);
  if (!resp.ok) throw new Error('Failed to fetch dashboard');
  return resp.json();
}

// Helper: fetch full NewShop document by canonical shop_id
export async function fetchShop(shopId: string) {
  const resp = await apiFetch(`/api/shops/by-shop/${encodeURIComponent(shopId)}`);
  if (!resp.ok) throw new Error('Failed to fetch shop');
  return resp.json();
}
