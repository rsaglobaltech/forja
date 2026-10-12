import { redirect } from "next/navigation";
import { getCurrentUserId } from "../../lib/session.js";

/**
 * This is where the real session validation happens (see docs/architecture.md):
 * `middleware.ts` has already redirected if there was no cookie, but this
 * confirms that the token inside the cookie is still valid.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  return <>{children}</>;
}
