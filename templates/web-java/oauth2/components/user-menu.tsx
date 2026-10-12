import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { idToken } from "@/lib/access-token";

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("keycloak", { redirectTo: "/tasks" });
      }}
    >
      <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white">
        Sign in
      </button>
    </form>
  );
}

/** Signs out of both the web app and Keycloak (otherwise the next "Sign in" would get straight in without asking for anything). */
async function signOutEverywhere() {
  "use server";
  const hint = await idToken();
  await signOut({ redirect: false });
  const back = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = new URL(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  url.searchParams.set("post_logout_redirect_uri", back);
  if (hint) url.searchParams.set("id_token_hint", hint);
  else url.searchParams.set("client_id", process.env.AUTH_KEYCLOAK_ID ?? "");
  redirect(url.toString());
}

export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return <SignInButton />;
  return (
    <form action={signOutEverywhere} className="flex items-center gap-3">
      <span className="text-gray-600">{session.user.name ?? session.user.email}</span>
      <button type="submit" className="hover:underline">
        Sign out
      </button>
    </form>
  );
}
