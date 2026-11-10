/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
	}

	// Worker bindings read via `import { env } from 'cloudflare:workers'`.
	namespace Cloudflare {
		interface Env {
			MAL_CLIENT_ID: string;
			MAL_CLIENT_SECRET: string;
		}
	}
}

export {};
