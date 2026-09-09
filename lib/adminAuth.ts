// lib/adminAuth.ts
//
// The admin area can void anyone's activities and change the standings,
// so it needs a real gate — not the employee-ID cookie the rest of the
// app uses, which anyone could set by hand.
//
// A password in an environment variable, exchanged for a signed cookie.
// Simple, but the signature means the cookie can't be forged without
// the secret.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const MAX_AGE_HOURS = 12;

function secret(): string {
  // Falls back to the service role key so a missing env var can't
  // silently produce an unsigned, forgeable cookie.
  return (
    process.env.ADMIN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "insecure-fallback"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Constant-time compare, so a wrong password can't be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** A cookie value that carries its own expiry and signature. */
export function makeToken(): string {
  const expires = Date.now() + MAX_AGE_HOURS * 3600 * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token?: string | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  return Number(payload) > Date.now();
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE_HOURS * 3600;

/** Is the current request from a signed-in admin? */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}
