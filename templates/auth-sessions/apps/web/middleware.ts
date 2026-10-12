import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on the Edge runtime: it does NOT have the Postgres driver, so here we
 * only check that the cookie exists, to redirect quickly. This is NOT real
 * access control — the actual validation (does the token exist? has it
 * expired? which user does it belong to?) happens in `getCurrentUserId()`
 * inside each layout/page, which does run on the Node runtime. See
 * docs/architecture.md.
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
