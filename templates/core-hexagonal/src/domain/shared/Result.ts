/**
 * Errores de negocio esperables (email duplicado, credenciales inválidas)
 * se modelan como valores, no como excepciones: el caller está obligado a
 * mirar `ok` antes de usar `value`. Errores de infraestructura (DB caída)
 * siguen tirando excepciones normales.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
