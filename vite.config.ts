import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Validate required environment variables at build time
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	if (mode !== 'test' && !env.VITE_MAL_CLIENT_ID) {
		throw new Error('❌ VITE_MAL_CLIENT_ID is required but not set in the environment.');
	}

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter(),
				csp: {
					directives: {
						'script-src': ['self'],
						'connect-src': [
							'self',
							'https://api.myanimelist.net',
							'https://graphql.anilist.co',
							'https://cdn.myanimelist.net',
							'https://raw.githubusercontent.com'
						],
						'img-src': ['self', 'data:', 'https:'],
						'frame-src': ['https://www.youtube.com'],
						'object-src': ['none'],
						'base-uri': ['none']
					}
				}
			})
		]
	};
});
