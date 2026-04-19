// ─── Authenticated fetch wrapper ───
// Attaches Bearer token, handles proactive + reactive refresh.

import { tokens, needsRefresh, refreshTokens } from '$lib/auth/tokens';
import { ok, err, type Result } from '$lib/api/result';

/**
 * Authenticated fetch — returns Result<Response>.
 * - Proactively refreshes token if expiring within 1hr
 * - Reactively retries once on 401
 * - Catches network errors into Result
 */
export async function authFetch(
  url: string,
  options?: RequestInit,
): Promise<Result<Response>> {
  // Proactive refresh
  if (needsRefresh()) {
    const refreshed = await refreshTokens();
    if (!refreshed.ok) {
      return err(refreshed.error);
    }
  }

  const token = tokens.getAccessToken();
  if (!token) {
    return err({ type: 'auth', message: 'Not authenticated' });
  }

  // Initial request
  const result = await safeFetch(url, withAuthHeader(options, token));

  if (!result.ok) return result;

  // Reactive: on 401, refresh and retry once
  if (result.value.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed.ok) {
      return err(refreshed.error);
    }

    const newToken = tokens.getAccessToken();
    if (!newToken) {
      return err({ type: 'auth', message: 'Not authenticated after refresh' });
    }

    return safeFetch(url, withAuthHeader(options, newToken));
  }

  // Other non-OK statuses
  if (!result.value.ok) {
    const body = await result.value.text().catch(() => '');
    return err({
      type: 'api',
      status: result.value.status,
      message: result.value.statusText || `HTTP ${result.value.status}`,
      body: body || undefined,
    });
  }

  return result;
}

/** Fetch that catches network errors into Result */
async function safeFetch(
  url: string,
  options?: RequestInit,
): Promise<Result<Response>> {
  try {
    const response = await fetch(url, options);
    return ok(response);
  } catch (e) {
    return err({
      type: 'network',
      message: e instanceof Error ? e.message : 'Network error',
      cause: e instanceof Error ? e : undefined,
    });
  }
}

/** Clone options with Authorization header */
function withAuthHeader(
  options: RequestInit | undefined,
  token: string,
): RequestInit {
  return {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}
