import { describe, expect, it } from 'vitest';

import { formatReviewExcerpt } from '$lib/utils/review-text';

describe('formatReviewExcerpt', () => {
	it('removes AniList image directives and lightweight formatting from review excerpts', () => {
		const review = `# ~~~ Do you like cute things? *I like cute things.* ~~~

~~~ img100%(https://i.imgur.com/example.jpg?width=1200) ~~~

Such a **cute** chubster, isn't he?`;

		expect(formatReviewExcerpt(review, 280)).toBe(
			"Do you like cute things? I like cute things. Such a cute chubster, isn't he?"
		);
	});

	it('collapses whitespace and truncates the cleaned text', () => {
		expect(formatReviewExcerpt('First line\n\nSecond   line', 18)).toBe('First line Second…');
	});

	it('returns an empty string for an empty review', () => {
		expect(formatReviewExcerpt('', 280)).toBe('');
	});
});
