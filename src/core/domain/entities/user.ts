import type { Perfil, StatusUsuario } from '../enums/user';

/**
 * Entidade de domínio `User` — sem dependência de framework.
 * O `senhaHash` nunca sai da camada de domínio para o cliente.
 */
export interface User {
  id: string;
  nomeCompleto: string;
  email: string;
  cpf: string;
  senhaHash: string;
  perfil: Perfil;
  nivel: string | null;
  status: StatusUsuario;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Versão segura para serialização em API / UI — sem hash. */
export type PublicUser = Omit<User, 'senhaHash'>;

export function toPublicUser(user: User): PublicUser {
  const { senhaHash: _senhaHash, ...rest } = user;
  return rest;
}