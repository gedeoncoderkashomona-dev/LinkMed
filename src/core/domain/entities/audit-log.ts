import type { AuditAction } from '../enums/audit';

export interface AuditLog {
  id: string;
  usuarioId: string;
  acao: AuditAction;
  entidade: string;
  entidadeId: string;
  dadosAntes: unknown;
  dadosDepois: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}