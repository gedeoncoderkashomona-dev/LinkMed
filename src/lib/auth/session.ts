import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { tokenService } from '@/infra/crypto';

export const ACCESS_COOKIE = 'ro_access';
export const REFRESH_COOKIE = 'ro_refresh';

const isProd = process.env.NODE_ENV === 'production';

/** Opções de cookie httpOnly comuns a access e refresh. */
function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  response.cookies.set(ACCESS_COOKIE, accessToken, baseCookieOptions(60 * 15)); // 15 min
  response.cookies.set(REFRESH_COOKIE, refreshToken, baseCookieOptions(60 * 60 * 24 * 7)); // 7 dias
}

export async function clearAuthCookies(response: NextResponse): Promise<void> {
  response.cookies.set(ACCESS_COOKIE, '', baseCookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, '', baseCookieOptions(0));
}

export async function readAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function readRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}