import { NextResponse, type NextRequest } from 'next/server';

import { LoginUseCase } from '@/core/use-cases/auth/login';
import { getRepositories } from '@/infra/db';
import { passwordService, tokenService } from '@/infra/crypto';
import { apiHandler } from '@/lib/http/api-handler';
import { setAuthCookies } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validation/auth-schemas';

export const runtime = 'nodejs';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const data = loginSchema.parse(body);

  const { userRepository, auditService } = getRepositories();
  const useCase = new LoginUseCase(userRepository, passwordService, tokenService);
  const result = await useCase.execute(data);

  void auditService
    .registrar(
      {
        usuarioId: result.user.id,
        ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
      },
      'auth.login',
      'User',
      result.user.id,
      null,
      { email: result.user.email, perfil: result.user.perfil },
    )
    .catch(() => {});

  const response = NextResponse.json({ user: result.user });
  await setAuthCookies(response, result.accessToken, result.refreshToken);
  return response;
});