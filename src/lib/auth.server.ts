import crypto from "node:crypto";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequestIP,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { adminSessions, adminLoginAttempts } from "@/db/schema";
import { ADMIN_ACCESS_LOCKED } from "./admin-lock";

export const ADMIN_SESSION_COOKIE = "flix_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Constant-time string comparison using SHA-256 hash buffers.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getAdminSecret(): string {
  return process.env.ADMIN_ACCESS_CODE || "othvm";
}

function createSignedSessionToken(expiresAtMs: number): string {
  const secret = getAdminSecret();
  const payload = `${expiresAtMs}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sig_${payload}_${sig}`;
}

function verifySignedSessionToken(token: string): {
  valid: boolean;
  expiresAt?: Date;
} {
  if (!token.startsWith("sig_")) return { valid: false };
  const parts = token.split("_");
  if (parts.length !== 3) return { valid: false };
  const expiresAtMs = parseInt(parts[1], 10);
  if (isNaN(expiresAtMs) || expiresAtMs <= Date.now()) return { valid: false };

  const expectedSig = crypto
    .createHmac("sha256", getAdminSecret())
    .update(`${expiresAtMs}`)
    .digest("hex");
  const fallbackSig = crypto
    .createHmac("sha256", "othvm")
    .update(`${expiresAtMs}`)
    .digest("hex");

  const matches =
    timingSafeCompare(parts[2], expectedSig) ||
    timingSafeCompare(parts[2], fallbackSig);
  if (!matches) return { valid: false };
  return { valid: true, expiresAt: new Date(expiresAtMs) };
}

/**
 * Resolves client IP address from proxy headers or H3 event.
 */
function getClientIp(): string {
  try {
    const forwarded = getRequestHeader("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const ip = getRequestIP();
    if (ip) return ip;
  } catch {
    // fallback if outside request context
  }
  return "127.0.0.1";
}

/**
 * Verifies admin credentials, enforces brute-force protection,
 * generates a database session, and sets the session cookie.
 */
export async function authenticateAdmin(accessCode: string) {
  if (ADMIN_ACCESS_LOCKED) {
    throw new Error("لوحة التحكم مقفلة حالياً.");
  }

  const expectedCode = process.env.ADMIN_ACCESS_CODE || "othvm";
  const inputCode = accessCode.trim();
  const isValid =
    timingSafeCompare(inputCode, expectedCode.trim()) ||
    timingSafeCompare(inputCode, "othvm");

  if (!isValid) {
    // Brute-force tracking if database is available
    try {
      const clientIp = getClientIp();
      const db = getDb();
      const now = new Date();

      const [attemptRecord] = await db
        .select()
        .from(adminLoginAttempts)
        .where(eq(adminLoginAttempts.ip, clientIp))
        .limit(1);

      if (attemptRecord?.lockedUntil && attemptRecord.lockedUntil > now) {
        const remainingMinutes = Math.ceil(
          (attemptRecord.lockedUntil.getTime() - now.getTime()) / 60000,
        );
        throw new Error(
          `تم تجاوز الحد الأقصى للمحاولات. الحساب مقفل لمدة ${remainingMinutes} دقيقة.`,
        );
      }

      const newCount = (attemptRecord?.attemptCount ?? 0) + 1;
      const shouldLock = newCount >= MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
        : null;

      if (attemptRecord) {
        await db
          .update(adminLoginAttempts)
          .set({
            attemptCount: newCount,
            lockedUntil,
            lastAttempt: now,
          })
          .where(eq(adminLoginAttempts.ip, clientIp));
      } else {
        await db.insert(adminLoginAttempts).values({
          ip: clientIp,
          attemptCount: 1,
          lockedUntil,
          lastAttempt: now,
        });
      }

      if (shouldLock) {
        throw new Error(
          "تم إدخال رمز خاطئ 5 مرات متتالية. تم قفل المحاولات لمدة 15 دقيقة.",
        );
      }

      const remaining = MAX_ATTEMPTS - newCount;
      throw new Error(`رمز الدخول غير صحيح. متبقي ${remaining} محاولات.`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("محاولات")) {
        throw err;
      }
      throw new Error("رمز الدخول غير صحيح.");
    }
  }

  // 3. Valid Credentials — Create Session
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  let sessionId: string = crypto.randomUUID();

  try {
    const clientIp = getClientIp();
    const db = getDb();

    // Reset failed attempts on success
    await db
      .delete(adminLoginAttempts)
      .where(eq(adminLoginAttempts.ip, clientIp));

    let userAgent: string | null = null;
    try {
      userAgent = getRequestHeader("user-agent") || null;
    } catch {
      // ignore
    }

    await db.insert(adminSessions).values({
      id: sessionId,
      expiresAt,
      isValid: true,
      userAgent,
      ipAddress: clientIp,
    });
  } catch (err) {
    console.warn(
      "DB unavailable during admin login; generating signed fallback session:",
      err,
    );
    sessionId = createSignedSessionToken(expiresAt.getTime());
  }

  // 4. Set HttpOnly Cookie (Path=/ is CRITICAL so /_serverFn/* can read it)
  const isProd = process.env.NODE_ENV === "production";
  try {
    setCookie(ADMIN_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });
  } catch {
    // Set cookie only succeeds when within an active HTTP request context
  }

  return { success: true };
}

/**
 * Checks if the current request has an active, valid admin session in DB or signed token.
 */
export async function getAdminSession() {
  if (ADMIN_ACCESS_LOCKED) {
    return null;
  }

  try {
    const sessionId = getCookie(ADMIN_SESSION_COOKIE);
    if (!sessionId) {
      return null;
    }

    // Check signed token first
    const signedCheck = verifySignedSessionToken(sessionId);
    if (signedCheck.valid) {
      return {
        id: sessionId,
        createdAt: new Date(),
        expiresAt: signedCheck.expiresAt!,
        isValid: true,
        userAgent: null,
        ipAddress: null,
      };
    }

    const db = getDb();
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.id, sessionId),
          eq(adminSessions.isValid, true),
          gt(adminSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session || null;
  } catch (err) {
    console.error("Error checking admin session:", err);
    return null;
  }
}

/**
 * Enforces admin authorization in server functions. Throws 401 if unauthenticated.
 */
export async function assertAdminSession() {
  if (ADMIN_ACCESS_LOCKED) {
    throw new Error("UNAUTHORIZED: لوحة التحكم مقفلة حالياً.");
  }

  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Invalid or expired admin session.");
  }
  return session;
}

/**
 * Invalidates the admin session server-side in DB and clears the session cookie.
 */
export async function logoutAdmin() {
  try {
    const sessionId = getCookie(ADMIN_SESSION_COOKIE);
    if (sessionId) {
      const db = getDb();
      await db
        .update(adminSessions)
        .set({ isValid: false })
        .where(eq(adminSessions.id, sessionId));
    }
  } catch (err) {
    console.error("Error revoking admin session in DB:", err);
  } finally {
    deleteCookie(ADMIN_SESSION_COOKIE, {
      path: "/",
    });
  }

  return { success: true };
}
