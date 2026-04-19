// ─── Result<T, E> — No throwing for control flow ───

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

/** Transform the value if Ok, pass Err through */
export function map<T, U, E>(result: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Transform the error if Err, pass Ok through */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (e: E) => F): Result<T, F> {
  return result.ok ? ok(result.value) : err(fn(result.error));
}

/** Chain another Result-returning function */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (v: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/** Helper: convert a zod SafeParseReturnType into our validation error */
export function zodIssuesToSummaries(
  issues: any[],
): ZodIssueSummary[] {
  return issues.map((i) => ({ path: i.path, message: i.message }));
}
