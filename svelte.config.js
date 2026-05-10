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
				'connect-src': ['self', 'https://api.myanimelist.net', 'https://api.jikan.moe', 'https://cdn.myanimelist.net', 'https://raw.githubusercontent.com'],
				'img-src': ['self', 'data:', 'https:'],
				'object-src': ['none'],
				'base-uri': ['none']
			}
		}
	}
};

export default config;
