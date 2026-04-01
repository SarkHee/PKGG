// utils/session.js — HMAC-signed cookie session (no external deps)
import crypto from 'crypto';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[session] ⚠️ SESSION_SECRET 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 설정하세요.')
}
const SECRET = process.env.SESSION_SECRET || 'pkgg-dev-secret-not-for-production';
const COOKIE_NAME = 'pkgg_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function sign(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  // timing-safe compare
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function getSession(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  return raw ? verify(raw) : null;
}

export function setSession(res, data) {
  const token = sign(data);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}
