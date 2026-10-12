import "server-only";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { refreshTokens } from "@/auth";

/**
 * The user's access token, read server-side from the encrypted session cookie. If it is about to expire,
 * it is renewed for this request (the proxy persists it on the next navigation).
 */
export async function accessToken(): Promise<string | undefined> {
  const secureCookie = (process.env.AUTH_URL ?? "").startsWith("https://");
  const token = await getToken({ req: { headers: await headers() }, secret: process.env.AUTH_SECRET, secureCookie });
  if (!token?.accessToken) return undefined;
  if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 30_000) return token.accessToken;
  const renewed = await refreshTokens(token);
  return renewed.error ? undefined : renewed.accessToken;
}

export async function idToken(): Promise<string | undefined> {
  const secureCookie = (process.env.AUTH_URL ?? "").startsWith("https://");
  const token = await getToken({ req: { headers: await headers() }, secret: process.env.AUTH_SECRET, secureCookie });
  return token?.idToken;
}
