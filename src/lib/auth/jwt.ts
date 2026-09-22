import * as jose from "jose";

const JWT_ALG = "HS256";
const SESSION_DURATION = "365d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sessionId: string;
  userId: string;
  /**
   * Approval state at issuance. `undefined` = token issued before the
   * approval-lock feature (treat as approved for backward compatibility).
   */
  approved?: boolean;
  exp: number;
  iat: number;
}

export async function signSessionToken(
  sessionId: string,
  userId: string,
  approved: boolean = true,
): Promise<string> {
  return new jose.SignJWT({ sessionId, userId, appr: approved ? 1 : 0 })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    const sessionId = payload.sessionId as string;
    const userId = payload.userId as string;
    if (!sessionId || !userId) return null;
    const appr = payload.appr as number | undefined;
    return {
      sessionId,
      userId,
      approved: typeof appr === "number" ? appr === 1 : undefined,
      exp: (payload.exp ?? 0) as number,
      iat: (payload.iat ?? 0) as number,
    };
  } catch {
    return null;
  }
}
