import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './store';

export const SESSION_COOKIE = 'skr_admin';
export const SESSION_HOURS = 12;

/*
  Admin accounts live in the `admins` table (add them with scripts/db.mjs admin …).
  place: the one property this admin manages, or null for a superadmin who manages all of them.
*/
export interface AdminUser {
  username: string;
  place: string | null;
}

/* Can this admin see and change records of this property? */
export const canAccess = (user: AdminUser, place: string | null | undefined) =>
  user.place === null || user.place === place;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/* Passwords are stored as scrypt$<salt>$<hash> (written by scripts/db.mjs) */
function checkPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

// Compared against when the username doesn't exist, so a wrong name takes as long as a wrong password
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export async function login(username: string, password: string): Promise<AdminUser | null> {
  const name = String(username || '').trim().toLowerCase();
  const [row] = await db()`SELECT username, password_hash, place FROM admins WHERE username = ${name}`;
  const ok = checkPassword(String(password || ''), row?.password_hash ?? DUMMY_HASH);
  return row && ok ? { username: row.username, place: row.place } : null;
}

/*
  Recently checked sessions, so each admin request doesn't wait on a database round trip.
  Kept for one minute; signing out clears it straight away.
*/
const SESSION_CACHE_MS = 60_000;
const sessionCache: Map<string, { user: AdminUser; until: number }> =
  (globalThis as any).__skrSessionCache || ((globalThis as any).__skrSessionCache = new Map());

/* The signed-in admin for this request, or null. Only a hash of the cookie token is stored. */
export async function verifyAdmin(request: Request): Promise<AdminUser | null> {
  const token = parseCookie(request.headers.get('cookie') || '', SESSION_COOKIE);
  if (!token) return null;
  const key = sha256(token);
  const cached = sessionCache.get(key);
  if (cached && cached.until > Date.now()) return cached.user;

  const [row] = await db()`
    SELECT a.username, a.place FROM admin_sessions s JOIN admins a ON a.username = s.username
    WHERE s.token_hash = ${key} AND s.expires_at > now()`;
  if (!row) {
    sessionCache.delete(key);
    return null;
  }
  const user = { username: row.username, place: row.place };
  if (sessionCache.size > 1000) sessionCache.clear();
  sessionCache.set(key, { user, until: Date.now() + SESSION_CACHE_MS });
  return user;
}

export async function createSession(username: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const sql = db();
  await sql`DELETE FROM admin_sessions WHERE expires_at < now()`; // tidy up old sign-ins
  await sql`
    INSERT INTO admin_sessions (token_hash, username, expires_at)
    VALUES (${sha256(token)}, ${username}, now() + ${SESSION_HOURS + ' hours'}::interval)`;
  return token;
}

export async function removeSession(request: Request): Promise<void> {
  const token = parseCookie(request.headers.get('cookie') || '', SESSION_COOKIE);
  if (!token) return;
  sessionCache.delete(sha256(token));
  await db()`DELETE FROM admin_sessions WHERE token_hash = ${sha256(token)}`;
}

function parseCookie(cookieHeader: string, name: string): string {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export interface Limiter {
  check: (ip: string) => void;
  hit: (ip: string) => void;
  clear: (ip: string) => void;
}

/* Sliding-window rate limiter */
export function createLimiter(max: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    check(ip: string) {
      const now = Date.now();
      if (hits.size > 5000) hits.clear();
      const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
      hits.set(ip, recent);
      if (recent.length >= max) {
        throw new Error('Too many attempts. Please try again later.');
      }
    },
    hit(ip: string) {
      hits.get(ip)?.push(Date.now()) ?? hits.set(ip, [Date.now()]);
    },
    clear(ip: string) {
      hits.delete(ip);
    }
  };
}

export const reviewLimit = createLimiter(5, 60 * 60 * 1000);
export const bookingLimit = createLimiter(10, 60 * 60 * 1000);
export const loginLimit = createLimiter(5, 15 * 60 * 1000);
