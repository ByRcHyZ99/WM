import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db";

const COOKIE_NAME = "wm_session";

type SessionPayload = {
  userId: string;
  exp: number;
};

function secret() {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 24) {
    throw new Error("APP_SECRET must be set to a random value with at least 24 characters.");
  }
  return value;
}

function base64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = base64url(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 }));
  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
  if (!parsed.userId || parsed.exp < Date.now()) return null;
  return parsed;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const payload = readToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!payload) return null;

  return database.findPublicUser(payload.userId);
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Response("Forbidden", { status: 403 });
  return user;
}
