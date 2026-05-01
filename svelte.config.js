import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csp: {
			directives: {
				'script-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['none']
			}
		}
	}
};

export default config;
