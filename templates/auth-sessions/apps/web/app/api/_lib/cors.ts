/**
 * Wildcard a propósito: estas rutas se autentican con Bearer token, no con
 * cookies — no hay `Access-Control-Allow-Credentials` de por medio, así que
 * el comodín no filtra nada (la regla de "CORS sin comodín" del spec aplica
 * al flujo de cookies del web, no a este).
 */
export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
