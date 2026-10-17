import { toPublicUser, type PublicUser } from '@/core/domain/entities/user';
import type { UserRepository } from '@/core/repositories/user-repository';

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<PublicUser[]> {
    const list = await this.users.list();
    return list.map(toPublicUser);
  }
}