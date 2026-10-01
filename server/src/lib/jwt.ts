import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtUserPayload } from '../types/auth.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'queuecraft-access-secret-dev-2026-xyz';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'queuecraft-refresh-secret-dev-2026-xyz';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days

export function generateAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;
}

export function getRefreshTokenExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expires;
}
