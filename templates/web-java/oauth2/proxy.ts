/** Next 16 (formerly "middleware"): private routes require a session; without one, back to the home page to sign in. */
export { auth as proxy } from "./auth";

export const config = {
  matcher: ["/tasks/:path*"],
};
