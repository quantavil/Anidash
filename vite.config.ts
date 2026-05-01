import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Validate required environment variables at build time
	const env = loadEnv(mode, process.cwd(), '');
	if (mode !== 'test' && !env.VITE_MAL_CLIENT_ID) {
		throw new Error('❌ VITE_MAL_CLIENT_ID is required but not set in the environment.');
	}

	return {
		plugins: [tailwindcss(), sveltekit()]
	};
});
