import { NextResponse, type NextRequest } from "next/server";

/**
 * Corre en el Edge runtime: NO tiene el driver de Postgres, así que acá
 * solo se chequea que la cookie exista, para redirigir rápido. Esto NO es
 * control de acceso real — la validación de verdad (¿el token existe? ¿no
 * venció? ¿de qué usuario es?) pasa en `getCurrentUserId()` dentro de cada
 * layout/página, que sí corre en el runtime de Node. Ver docs/architecture.md.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies.has("session");

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
