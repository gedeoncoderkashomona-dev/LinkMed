import { UnauthorizedError } from '@/core/domain/errors';
import type { Perfil } from '@/core/domain/enums/user';
import type { AccessTokenPayload } from '@/core/services/token-service';
import { tokenService } from '@/infra/crypto';

import { readAccessToken } from './session';

/**
 * Lê o access token do cookie e retorna o payload.
 * Lança UnauthorizedError se ausente ou inválido.
 */
export async function requireAuth(): Promise<AccessTokenPayload> {
  const token = await readAccessToken();
  if (!token) throw new UnauthorizedError('Sessão não encontrada.');
  return tokenService.verifyAccess(token);
}

/** Garante que o usuário tem um dos perfis exigidos. */
export async function requirePerfil(...perfis: Perfil[]): Promise<AccessTokenPayload> {
  const auth = await requireAuth();
  if (perfis.length && !perfis.includes(auth.perfil)) {
    const { ForbiddenError } = await import('@/core/domain/errors');
    throw new ForbiddenError();
  }
  return auth;
}