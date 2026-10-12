import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Keycloak from "next-auth/providers/keycloak";

/**
 * Sign-in with Keycloak (OIDC, Authorization Code + PKCE). The tokens live in the encrypted session cookie
 * ("jwt" strategy); the public session (/api/auth/session) carries only name and email, never the access token.
 * Variables: AUTH_SECRET, AUTH_KEYCLOAK_ID, AUTH_KEYCLOAK_SECRET, AUTH_KEYCLOAK_ISSUER.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at,
        };
      }
      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 30_000) return token;
      return refreshTokens(token);
    },
    session({ session, token }) {
      if (token.error) session.error = token.error;
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});

/** Renews the access token with the refresh token (Keycloak). Exported for the API client. */
export async function refreshTokens(token: JWT): Promise<JWT> {
  if (!token.refreshToken) return { ...token, error: "RefreshTokenError" };
  const res = await fetch(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: process.env.AUTH_KEYCLOAK_ID ?? "",
      client_secret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
    }),
  });
  if (!res.ok) return { ...token, error: "RefreshTokenError" };
  const t = await res.json();
  return {
    ...token,
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? token.refreshToken,
    idToken: t.id_token ?? token.idToken,
    expiresAt: Math.floor(Date.now() / 1000) + t.expires_in,
    error: undefined,
  };
}
