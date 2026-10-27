import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'skr_admin';
export const SESSION_HOURS = 12;

// In-memory token -> expiry map (persists as long as Next process runs)
const globalSessions = globalThis.__skrSessions || (globalThis.__skrSessions = new Map());

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const digest = s => createHash('sha256').update(String(s)).digest();
export const safeCompare = (a, b) => timingSafeEqual(digest(a), digest(b));

export function verifyAdmin(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return false;
  const expires = globalSessions.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    globalSessions.delete(token);
    return false;
  }
  return true;
}

export function createSessionToken() {
  const token = randomBytes(32).toString('hex');
  const expiry = Date.now() + SESSION_HOURS * 3600e3;
  globalSessions.set(token, expiry);
  return token;
}

export function removeSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (token) {
    globalSessions.delete(token);
  }
}

function parseCookie(cookieHeader, name) {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/* Sliding-window rate limiter */
export function createLimiter(max, windowMs) {
  const hits = new Map();
  return {
    check(ip) {
      const now = Date.now();
      if (hits.size > 5000) hits.clear();
      const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
      hits.set(ip, recent);
      if (recent.length >= max) {
        throw new Error('Too many attempts. Please try again later.');
      }
    },
    hit(ip) {
      hits.get(ip)?.push(Date.now()) ?? hits.set(ip, [Date.now()]);
    },
    clear(ip) {
      hits.delete(ip);
    }
  };
}

export const reviewLimit = createLimiter(5, 60 * 60 * 1000);
export const bookingLimit = createLimiter(10, 60 * 60 * 1000);
export const loginLimit = createLimiter(5, 15 * 60 * 1000);
