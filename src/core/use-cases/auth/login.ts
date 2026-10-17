import { UnauthorizedError } from '@/core/domain/errors';
import { toPublicUser, type PublicUser } from '@/core/domain/entities/user';
import type { UserRepository } from '@/core/repositories/user-repository';
import type { PasswordService } from '@/core/services/password-service';
import type { TokenService } from '@/core/services/token-service';

export interface LoginInput {
  email: string;
  senha: string;
}

export interface LoginOutput {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Autentica usuário e emite par de tokens.
 * Regras: e-mail único, senha verificada por bcrypt, usuário precisa estar ativo.
 */
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Credenciais inválidas.');

    if (user.status !== 'ativo') {
      throw new UnauthorizedError('Usuário inativo. Contate o Diretor.');
    }

    const ok = await this.passwords.compare(input.senha, user.senhaHash);
    if (!ok) throw new UnauthorizedError('Credenciais inválidas.');

    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      email: user.email,
      perfil: user.perfil,
    });
    const refreshToken = await this.tokens.signRefresh({
      sub: user.id,
      jti: crypto.randomUUID(),
    });

    return { user: toPublicUser(user), accessToken, refreshToken };
  }
}