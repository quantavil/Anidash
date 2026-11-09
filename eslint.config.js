// Oxlint (.oxlintrc.json) covers general JS/TS correctness; ESLint is kept only for
// Svelte-specific rules (runes, reactivity) that oxlint cannot run yet.
import gitignore from 'eslint-config-flat-gitignore';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const svelteFiles = ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'];

export default defineConfig(gitignore(), {
	files: svelteFiles,
	extends: [svelte.configs.recommended, svelte.configs.prettier],
	languageOptions: {
		globals: { ...globals.browser, ...globals.node },
		parserOptions: {
			projectService: true,
			extraFileExtensions: ['.svelte'],
			parser: ts.parser
		}
	},
	rules: {
		'svelte/no-navigation-without-resolve': 'off'
	}
});
