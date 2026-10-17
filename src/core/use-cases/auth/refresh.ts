import { NotFoundError, UnauthorizedError } from '@/core/domain/errors';
import { toPublicUser, type PublicUser } from '@/core/domain/entities/user';
import type { UserRepository } from '@/core/repositories/user-repository';
import type { TokenService } from '@/core/services/token-service';

export interface RefreshOutput {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Rotação de refresh token: o refresh recebido é trocado por um novo par.
 * Se o usuário foi desativado/soft-deletado, o refresh é rejeitado.
 */
export class RefreshUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshOutput> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new NotFoundError('Usuário não encontrado.');
    if (user.status !== 'ativo') throw new UnauthorizedError('Usuário inativo.');

    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      email: user.email,
      perfil: user.perfil,
    });
    const newRefresh = await this.tokens.signRefresh({
      sub: user.id,
      jti: crypto.randomUUID(),
    });

    return { user: toPublicUser(user), accessToken, refreshToken: newRefresh };
  }
}