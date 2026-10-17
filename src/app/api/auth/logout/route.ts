import { NextResponse, type NextRequest } from 'next/server';

import { apiHandler } from '@/lib/http/api-handler';
import { clearAuthCookies } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const POST = apiHandler(async (_req: NextRequest) => {
  const response = NextResponse.json({ ok: true });
  await clearAuthCookies(response);
  return response;
});