import { toPublicUser, type PublicUser } from '@/core/domain/entities/user';
import type { CreateUserInput as RepoCreateInput, UserRepository } from '@/core/repositories/user-repository';
import type { PasswordService } from '@/core/services/password-service';

export interface CreateUserUseCaseInput {
  nomeCompleto: string;
  email: string;
  cpf: string;
  senha: string;
  perfil: RepoCreateInput['perfil'];
  nivel?: string | null;
}

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) {}

  async execute(input: CreateUserUseCaseInput): Promise<PublicUser> {
    const senhaHash = await this.passwords.hash(input.senha);
    const created = await this.users.create({
      nomeCompleto: input.nomeCompleto,
      email: input.email,
      cpf: input.cpf,
      senhaHash,
      perfil: input.perfil,
      nivel: input.nivel ?? null,
    });
    return toPublicUser(created);
  }
}