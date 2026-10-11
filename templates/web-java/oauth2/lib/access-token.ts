import "server-only";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { refreshTokens } from "@/auth";

/**
 * El access token del usuario, leído del lado del servidor de la cookie de sesión cifrada. Si está a punto
 * de caducar se renueva para esta petición (el proxy lo persiste en la siguiente navegación).
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
