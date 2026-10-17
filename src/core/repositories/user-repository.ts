import type { User } from '../domain/entities/user';
import type { Perfil, StatusUsuario } from '../domain/enums/user';

export interface CreateUserInput {
  nomeCompleto: string;
  email: string;
  cpf: string;
  senhaHash: string;
  perfil: Perfil;
  nivel?: string | null;
  status?: StatusUsuario;
}

export interface UpdateUserInput {
  nomeCompleto?: string;
  email?: string;
  cpf?: string;
  perfil?: Perfil;
  nivel?: string | null;
  status?: StatusUsuario;
  senhaHash?: string;
}

/**
 * Contrato do repositório de usuários.
 * Implementações: in-memory (hoje), Prisma (futuro).
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByCpf(cpf: string): Promise<User | null>;
  list(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  softDelete(id: string): Promise<void>;
}