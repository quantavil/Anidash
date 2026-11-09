// ─── URL SearchParams helpers ───
// Used in .svelte files alongside page.url and goto().

/** What the helpers need from `page.url` (SvelteKit 3 exposes a readonly URL). */
export type UrlLike = {
	readonly href: string;
	readonly searchParams: Pick<URLSearchParams, 'get'>;
};

/** Read a URL param with a fallback default */
export function getUrlParam(url: UrlLike, key: string, defaultValue: string): string {
	return url.searchParams.get(key) ?? defaultValue;
}

/** Set (or delete) a URL param and return the new path+search string */
export function setUrlParam(url: UrlLike, key: string, value: string): string {
	const next = new URL(url.href);
	if (value) {
		next.searchParams.set(key, value);
	} else {
		next.searchParams.delete(key);
	}
	return next.pathname + next.search;
}

/** Set multiple URL params at once */
export function setUrlParams(url: UrlLike, pairs: Array<{ key: string; value: string }>): string {
	const next = new URL(url.href);
	for (const { key, value } of pairs) {
		if (value) {
			next.searchParams.set(key, value);
		} else {
			next.searchParams.delete(key);
		}
	}
	return next.pathname + next.search;
}
