import type { AuditAction } from '../domain/enums/audit';

export interface AuditContext {
  usuarioId: string;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditService {
  registrar(
    context: AuditContext,
    acao: AuditAction,
    entidade: string,
    entidadeId: string,
    dadosAntes?: unknown,
    dadosDepois?: unknown,
  ): Promise<void>;
}