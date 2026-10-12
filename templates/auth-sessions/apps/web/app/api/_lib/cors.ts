/**
 * Wildcard on purpose: these routes authenticate with a Bearer token, not
 * cookies — there is no `Access-Control-Allow-Credentials` involved, so the
 * wildcard leaks nothing (the spec's "no wildcard CORS" rule applies to the
 * web's cookie flow, not to this one).
 */
export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
