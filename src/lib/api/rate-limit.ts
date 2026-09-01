// ─── Generic Rate Limiter ───
// Enqueues requests and processes them with a minimum interval.

export function createRateLimiter(minIntervalMs: number) {
	let queue: Promise<unknown> = Promise.resolve();
	let lastRun = 0;

	/** Enqueue a function — it will execute after the minimum interval elapses. */
	function enqueue<T>(fn: () => Promise<T>): Promise<T> {
		const next = queue.then(async () => {
			const delay = lastRun + minIntervalMs - Date.now();
			if (delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			lastRun = Date.now();
			return fn();
		});
		// Catch errors in the chain so they don't block subsequent requests
		queue = next.catch(() => {});
		return next;
	}

	return { enqueue };
}

/** Jikan free-tier: ~3 req/s → 340ms minimum between requests */
export const jikanLimiter = createRateLimiter(340);

/** AniList: 90/min (667ms), degraded 30/min still safe with 700ms */
export const ANILIST_MIN_INTERVAL_MS = 700;
export const anilistLimiter = createRateLimiter(ANILIST_MIN_INTERVAL_MS);
