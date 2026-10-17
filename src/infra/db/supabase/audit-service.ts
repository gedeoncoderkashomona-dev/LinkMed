import type { AuditAction } from '@/core/domain/enums/audit';
import type { AuditRepository } from '@/core/repositories/audit-repository';
import type { AuditContext, AuditService } from '@/core/services/audit-service';

export class SupabaseAuditService implements AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async registrar(
    context: AuditContext,
    acao: AuditAction,
    entidade: string,
    entidadeId: string,
    dadosAntes?: unknown,
    dadosDepois?: unknown,
  ): Promise<void> {
    await this.repo.create({
      usuarioId: context.usuarioId,
      acao,
      entidade,
      entidadeId,
      dadosAntes: dadosAntes ?? null,
      dadosDepois: dadosDepois ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }
}
