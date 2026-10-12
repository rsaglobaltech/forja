import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16's proxy (it was called middleware before). It only checks that the
 * session cookie exists, to redirect quickly — this is NOT access control. The
 * real validation (does the token exist? has it expired? whose is it?) happens
 * in `getCurrentUserId()` inside each layout and page. See docs/architecture.md.
 */
export function proxy(request: NextRequest) {
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
