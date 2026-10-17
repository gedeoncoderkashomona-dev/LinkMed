import { NextResponse, type NextRequest } from 'next/server';

import { RefreshUseCase } from '@/core/use-cases/auth/refresh';
import { getRepositories } from '@/infra/db';
import { tokenService } from '@/infra/crypto';
import { apiHandler } from '@/lib/http/api-handler';
import { clearAuthCookies, readRefreshToken, setAuthCookies } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const POST = apiHandler(async (_req: NextRequest) => {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    const res = NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Refresh token ausente.' },
      { status: 401 },
    );
    await clearAuthCookies(res);
    return res;
  }

  const { userRepository } = getRepositories();
  const useCase = new RefreshUseCase(userRepository, tokenService);
  const result = await useCase.execute(refreshToken);

  const response = NextResponse.json({ user: result.user });
  await setAuthCookies(response, result.accessToken, result.refreshToken);
  return response;
});