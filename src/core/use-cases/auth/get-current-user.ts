import { NotFoundError } from '@/core/domain/errors';
import { toPublicUser, type PublicUser } from '@/core/domain/entities/user';
import type { UserRepository } from '@/core/repositories/user-repository';

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuário não encontrado.');
    return toPublicUser(user);
  }
}