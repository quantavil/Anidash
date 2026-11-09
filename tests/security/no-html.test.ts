import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Untrusted MAL/AniList text must stay plain text (see AGENTS.md "Untrusted text").
// oxlint cannot lint Svelte templates, so guard `{@html}` here.
function* svelteFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* svelteFiles(path);
		else if (entry.name.endsWith('.svelte')) yield path;
	}
}

describe('templates', () => {
	it('never render {@html}', () => {
		const offenders = [...svelteFiles('src')].filter((f) =>
			readFileSync(f, 'utf8').includes('{@html')
		);
		expect(offenders).toEqual([]);
	});
});
