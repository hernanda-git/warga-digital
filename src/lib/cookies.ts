import { cookies } from "next/headers";

const COMMUNITY_NAME_COOKIE = "community_name";
const COMMUNITY_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Get community name from cookie
 */
export async function getCommunityNameFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COMMUNITY_NAME_COOKIE)?.value ?? null;
}

/**
 * Set community name cookie
 */
export async function setCommunityNameCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.set(COMMUNITY_NAME_COOKIE, name, {
    httpOnly: false, // Need to read from client for UI
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COMMUNITY_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Delete community name cookie
 */
export async function deleteCommunityNameCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COMMUNITY_NAME_COOKIE);
}