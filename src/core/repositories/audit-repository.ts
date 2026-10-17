import type { AuditLog } from '../domain/entities/audit-log';
import type { AuditAction } from '../domain/enums/audit';

export interface CreateAuditLogInput {
  usuarioId: string;
  acao: AuditAction;
  entidade: string;
  entidadeId: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  list(limit?: number): Promise<AuditLog[]>;
  listByEntity(entidade: string, entidadeId: string): Promise<AuditLog[]>;
}