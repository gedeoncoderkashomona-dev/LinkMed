import type { UserRepository } from '@/core/repositories/user-repository';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { AuditRepository } from '@/core/repositories/audit-repository';
import type { AuditService } from '@/core/services/audit-service';
import type { OperacionalRepository } from '@/core/repositories/operacional-repository';

import { isSupabaseConfigured } from './supabase/client';
import { SupabaseUserRepository } from './supabase/user-repository';
import { SupabasePopRepository } from './supabase/pop-repository';
import { SupabaseAuditRepository } from './supabase/audit-repository';
import { SupabaseAuditService } from './supabase/audit-service';
import { SupabaseOperacionalRepository } from './supabase/operacional-repository';

export interface RepositoryContainer {
  userRepository: UserRepository;
  popRepository: PopRepository;
  operacionalRepository: OperacionalRepository;
  auditRepository: AuditRepository;
  auditService: AuditService;
}

let cached: RepositoryContainer | null = null;

/**
 * Retorna os repositórios da aplicação, sempre apoiados no Supabase (PostgreSQL).
 * Não há mais fallback em memória: sem as variáveis do Supabase a aplicação falha explicitamente.
 */
export function getRepositories(): RepositoryContainer {
  if (cached) return cached;

  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.',
    );
  }

  const auditRepository = new SupabaseAuditRepository();
  cached = {
    userRepository: new SupabaseUserRepository(),
    popRepository: new SupabasePopRepository(),
    operacionalRepository: new SupabaseOperacionalRepository(),
    auditRepository,
    auditService: new SupabaseAuditService(auditRepository),
  };
  return cached;
}
