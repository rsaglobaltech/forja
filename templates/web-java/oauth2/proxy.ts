/** Next 16 (antes "middleware"): las rutas privadas exigen sesión; sin ella, a la portada para iniciarla. */
export { auth as proxy } from "./auth";

export const config = {
  matcher: ["/tasks/:path*"],
};
