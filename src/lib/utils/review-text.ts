/** Convert AniList's lightweight review markup into a safe plain-text excerpt. */
export function formatReviewExcerpt(body: string, maxLength = 280): string {
	if (!body || maxLength <= 0) return '';

	const plainText = body
		.replace(/^\s*~~~\s*img\d*%?\(.*\)\s*~~~\s*$/gim, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/^\s{0,3}#{1,6}\s*/gm, '')
		.replace(/^\s*>\s?/gm, '')
		.replace(/~~~|[*_`]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (plainText.length <= maxLength) return plainText;
	return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
