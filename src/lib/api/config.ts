// ─── API endpoints & public config ───

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

export const MAL_API_BASE = `${WORKER_URL}/api`;
export const MAL_AUTH_BASE = 'https://myanimelist.net/v1/oauth2';

/** MAL API v2 recommended rate: ~2-3 req/s for authenticated */
export const MAL_MIN_INTERVAL_MS = 400;
