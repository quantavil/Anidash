// ─── Result<T, E> — No throwing for control flow ───
import type { ZodIssue } from 'zod';

export type AppError =
	| { type: 'network'; message: string; cause?: Error }
	| { type: 'auth'; message: string }
	| { type: 'api'; status: number; message: string; body?: unknown }
	| { type: 'validation'; message: string; issues: ZodIssueSummary[] }
	| { type: 'cache'; message: string }
	| { type: 'rate_limit'; retryAfter: number; message: string }
	| { type: 'not_found'; message: string };

export interface ZodIssueSummary {
	path: (string | number)[];
	message: string;
}

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
	return { ok: true, value };
}

export function err<E = AppError>(error: E): Err<E> {
	return { ok: false, error };
}

/** Helper: convert a zod SafeParseReturnType into our validation error */
export function zodIssuesToSummaries(issues: ZodIssue[]): ZodIssueSummary[] {
	return issues.map((i) => ({
		path: i.path.filter(
			(p): p is string | number => typeof p === 'string' || typeof p === 'number'
		),
		message: i.message
	}));
}
