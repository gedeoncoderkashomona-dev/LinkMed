import { compare, hash } from '@node-rs/bcrypt';

import type { PasswordService } from '@/core/services/password-service';

/**
 * bcrypt com custo 12 (binário nativo via @node-rs/bcrypt).
 * É ~10x mais rápido que o bcryptjs (JS puro) e lê os mesmos hashes ($2a/$2b),
 * então os usuários já gravados no banco continuam válidos.
 */
export class BcryptPasswordService implements PasswordService {
  private readonly cost = 12;

  async hash(plain: string): Promise<string> {
    return hash(plain, { cost: this.cost });
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    try {
      return await compare(plain, hashed);
    } catch {
      return false;
    }
  }
}