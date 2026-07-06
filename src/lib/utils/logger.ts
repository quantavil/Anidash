// Lightweight logger. Warnings are dev-only noise; errors are kept in production
// so real failures (IDB/sync) remain diagnosable from the browser console.
export const logger = {
	warn: (...args: unknown[]) => {
		if (import.meta.env.DEV) {
			console.warn(...args);
		}
	},
	error: (...args: unknown[]) => {
		console.error(...args);
	}
};
