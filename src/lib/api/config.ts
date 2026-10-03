// ─── API endpoints & public config ───

// Same-origin SvelteKit endpoints (Cloudflare Pages Functions) — no separate worker URL.
export const MAL_API_BASE = '/api';
export const AUTH_TOKEN_URL = '/auth/token';
export const AUTH_REFRESH_URL = '/auth/refresh';

/** MAL API v2 recommended rate: ~2-3 req/s for authenticated */
export const MAL_MIN_INTERVAL_MS = 400;
