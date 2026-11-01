import type { Perfil } from '@/core/domain/enums/user';

/**
 * Matriz de permissões do MVP — fonte única de verdade.
 * Toda checagem no servidor e no cliente passa por aqui.
 */
export type Permission =
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:read:all'
  | 'audit:read'
  | 'aso:read'
  | 'dashboard:consolidated'
  | 'pops:upload'
  | 'pops:approve'
  | 'pops:read:report'
  | 'ncs:advance'
  | 'ncs:create'
  | 'ncs:approve:grave'
  | 'forms:create'
  | 'trainings:create'
  | 'settings:manage';

const PERMISSIONS: Record<Permission, Perfil[]> = {
  'users:create': ['diretor'],
  'users:update': ['diretor'],
  'users:delete': ['diretor'],
  'users:read:all': ['diretor', 'gestor'],
  'audit:read': ['diretor', 'gestor'],
  'aso:read': ['diretor', 'gestor'],
  'dashboard:consolidated': ['diretor', 'gestor'],
  'pops:upload': ['diretor', 'gestor'],
  'pops:approve': ['diretor'],
  'pops:read:report': ['diretor', 'gestor', 'tecnico', 'estoquista', 'adm'],
  'ncs:advance': ['diretor', 'gestor'],
  'ncs:create': ['diretor', 'gestor', 'tecnico', 'estoquista', 'adm'],
  'ncs:approve:grave': ['diretor'],
  'forms:create': ['diretor', 'gestor', 'tecnico', 'estoquista', 'adm'],
  'trainings:create': ['diretor', 'gestor', 'tecnico', 'estoquista', 'adm'],
  'settings:manage': ['diretor', 'gestor'],
};

export function can(perfil: Perfil, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(perfil);
}

export function assertCan(perfil: Perfil, permission: Permission): void {
  if (!can(perfil, permission)) {
    // Import dinâmico evita ciclo
    const { ForbiddenError } = require('@/core/domain/errors') as typeof import('@/core/domain/errors');
    throw new ForbiddenError();
  }
}
