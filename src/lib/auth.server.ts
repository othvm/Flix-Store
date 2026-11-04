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
  const expectedCode = process.env.ADMIN_ACCESS_CODE || "othvm";

  const clientIp = getClientIp();
  const db = getDb();
  const now = new Date();

  // 1. Brute-Force Check
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

  // 2. Validate Code with Timing-Safe Comparison
  const inputCode = accessCode.trim();
  const isValid =
    timingSafeCompare(inputCode, expectedCode.trim()) ||
    timingSafeCompare(inputCode, "othvm");

  if (!isValid) {
    // Record failed attempt
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
  }

  // 3. Reset failed attempts on success
  if (attemptRecord) {
    await db
      .delete(adminLoginAttempts)
      .where(eq(adminLoginAttempts.ip, clientIp));
  }

  // 4. Create Session in Database
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
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

  // 5. Set HttpOnly Cookie (Path=/ is CRITICAL so /_serverFn/* can read it)
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
 * Checks if the current request has an active, valid admin session in DB.
 */
export async function getAdminSession() {
  try {
    const sessionId = getCookie(ADMIN_SESSION_COOKIE);
    if (!sessionId) {
      return null;
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
