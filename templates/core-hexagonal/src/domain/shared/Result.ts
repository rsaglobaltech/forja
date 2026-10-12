/**
 * Expected business errors (duplicate email, invalid credentials) are
 * modelled as values, not exceptions: the caller must check `ok` before
 * using `value`. Infrastructure errors (database down) still throw regular
 * exceptions.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
