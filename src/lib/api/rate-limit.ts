// ─── Generic Rate Limiter ───
// Enqueues requests and processes them with a minimum interval.

interface QueueItem {
	execute: () => Promise<unknown>;
	resolve: (value: unknown) => void;
	reject: (reason: unknown) => void;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRateLimiter(minIntervalMs: number) {
	const queue: QueueItem[] = [];
	let lastRun = 0;
	let processing = false;

	async function drain(): Promise<void> {
		if (processing) return;
		processing = true;

		while (queue.length > 0) {
			const item = queue.shift()!;
			const wait = lastRun + minIntervalMs - Date.now();
			if (wait > 0) await sleep(wait);
			lastRun = Date.now();

			try {
				const result = await item.execute();
				item.resolve(result);
			} catch (error) {
				item.reject(error);
			}
		}

		processing = false;
	}

	/** Enqueue a function — it will execute after the minimum interval elapses. */
	function enqueue<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			queue.push({
				execute: fn as () => Promise<unknown>,
				resolve: resolve as (v: unknown) => void,
				reject
			});
			drain();
		});
	}

	return { enqueue };
}

/** Jikan free-tier: ~3 req/s → 340ms minimum between requests */
export const jikanLimiter = createRateLimiter(340);
