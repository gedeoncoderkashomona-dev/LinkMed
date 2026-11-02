import { ForbiddenError, UnauthorizedError } from '@/core/domain/errors';
import type { Perfil } from '@/core/domain/enums/user';
import type { AccessTokenPayload } from '@/core/services/token-service';
import { verificarAcessoHorario } from '@/core/domain/access-schedule';
import { tokenService } from '@/infra/crypto';

import { readAccessToken } from './session';

export interface RequireAuthOptions {
  ignorarJanelaHorario?: boolean;
}

/**
 * Lê o access token do cookie e retorna o payload.
 * Lança UnauthorizedError se ausente ou inválido.
 * Valida a janela de horário comercial (07:30h às 19:30h Seg-Sex) no backend para AT, ADM e Almoxarifado (Seção 5.1 / Caso T14).
 */
export async function requireAuth(options: RequireAuthOptions = {}): Promise<AccessTokenPayload> {
  const token = await readAccessToken();
  if (!token) throw new UnauthorizedError('Sessão não encontrada.');
  const payload = await tokenService.verifyAccess(token);

  if (!options.ignorarJanelaHorario) {
    const checagem = verificarAcessoHorario(payload.perfil);
    if (!checagem.permitido) {
      throw new ForbiddenError(
        checagem.mensagem ??
          'Acesso fora do horário de funcionamento permitido (Segunda a sexta-feira, das 07:30h às 19:30h).',
      );
    }
  }

  return payload;
}

/** Garante que o usuário tem um dos perfis exigidos. */
export async function requirePerfil(...perfis: Perfil[]): Promise<AccessTokenPayload> {
  const auth = await requireAuth();
  if (perfis.length && !perfis.includes(auth.perfil)) {
    throw new ForbiddenError('Acesso não autorizado para o perfil do usuário.');
  }
  return auth;
}
