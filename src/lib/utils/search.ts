// ─── Search Utility Functions ───

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'my', 'your',
	'his', 'her', 'their', 'our', 'its', 'no', 'ni', 'na', 'de', 'wo', 'wa',
	'is', 'are', 'was', 'were', 'with', 'about', 'by', 'out', 'from'
]);

/**
 * Returns true if Romaji title or English title matches all words in the search query fuzzily.
 */
export function matchesFuzzy(title: string, titleEnglish: string | null, query: string): boolean {
	if (!query) return true;
	const q = query.toLowerCase().trim();
	const queryWords = q.split(/\s+/).filter((w) => w.length > 0);
	if (queryWords.length === 0) return true;

	const titleLower = title.toLowerCase();
	const titleEnglishLower = titleEnglish?.toLowerCase() ?? '';

	return queryWords.every(
		(word) => titleLower.includes(word) || titleEnglishLower.includes(word)
	);
}

/**
 * Extracts a single key search term from a multi-word search query to use for API requests.
 * Uses the longest significant word, ignoring common stop words.
 */
export function getSearchKeyword(query: string): string {
	const clean = query.trim().toLowerCase();
	if (!clean) return '';

	const words = clean.split(/\s+/).filter((w) => w.length > 0);
	if (words.length <= 1) return clean;

	const significantWords = words.filter((w) => !STOP_WORDS.has(w));
	if (significantWords.length === 0) {
		return words[0]; // fallback to the first word if all are stop words
	}

	// Sort by length descending, and pick the longest one
	significantWords.sort((a, b) => b.length - a.length);
	return significantWords[0];
}
