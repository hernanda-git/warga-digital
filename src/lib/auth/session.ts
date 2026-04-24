import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { signSessionToken, verifySessionToken } from "./jwt";
import { hashSha256 } from "@/lib/crypto";
import { uuidv7 } from "uuidv7";

const SESSION_COOKIE = "wd_session";
const SESSION_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

const LAST_ACTIVE_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SESSION_RENEW_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // renew if < 30 days remaining

function hashToken(token: string): string {
  return hashSha256(token);
}

export async function createSession(userId: string): Promise<string> {
  const supabase = createServerClient();
  const sessionId = uuidv7();
  const rawToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const { error } = await supabase.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    last_active_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error("Failed to create session");
  }

  const jwt = await signSessionToken(sessionId, userId);
  return jwt;
}

export async function setSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSessionFromCookie(): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const supabase = createServerClient();
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("id, user_id, expires_at, last_active_at")
    .eq("id", payload.sessionId)
    .maybeSingle();

  if (fetchError) {
    return null;
  }

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  // ── Sliding renewal ──────────────────────────────────────────────────────
  // When active, extend both the DB expiry and re-issue the JWT cookie so
  // the user never has to log in again. Two triggers:
  //   1. last_active_at is stale (older than 1 hour) → update it + extend expiry
  //   2. expiry is closer than SESSION_RENEW_THRESHOLD_MS → extend even if
  //      last_active_at was recently written (covers session near timeout)
  const expiresAtMs = new Date(session.expires_at).getTime();
  const timeUntilExpiry = expiresAtMs - Date.now();
  const lastActive = session.last_active_at
    ? new Date(session.last_active_at).getTime()
    : 0;
  const isStale = Date.now() - lastActive > LAST_ACTIVE_SYNC_INTERVAL_MS;
  const needsRenewal = timeUntilExpiry < SESSION_RENEW_THRESHOLD_MS;

  if (isStale || needsRenewal) {
    const newExpiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    (async (store) => {
      try {
        const { error } = await supabase
          .from("sessions")
          .update({
            last_active_at: new Date().toISOString(),
            expires_at: newExpiresAt.toISOString(),
          })
          .eq("id", session.id);

        if (error) {
          return;
        }

        const newJwt = await signSessionToken(session.id, session.user_id);
        store.set(SESSION_COOKIE, newJwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE,
          path: "/",
        });
      } catch (err) {
      }
    })(cookieStore);
  }

  return { userId: payload.userId, sessionId: payload.sessionId };
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroySession(sessionId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
  }
}