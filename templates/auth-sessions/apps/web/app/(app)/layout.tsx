import { redirect } from "next/navigation";
import { getCurrentUserId } from "../../lib/session.js";

/**
 * Acá pasa la validación real de sesión (ver docs/architecture.md):
 * `middleware.ts` ya redirigió si no había cookie, pero esto confirma que
 * el token adentro de la cookie sigue siendo válido.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  return <>{children}</>;
}
