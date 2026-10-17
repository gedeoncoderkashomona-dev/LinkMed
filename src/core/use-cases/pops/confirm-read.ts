import { NotFoundError } from '@/core/domain/errors';
import type { PopReadConfirmation } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { AuditService } from '@/core/services/audit-service';

export class ConfirmReadUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly audit?: AuditService,
  ) {}

  async execute(
    popId: string,
    userId: string,
    context?: { ip: string | null; userAgent: string | null },
  ): Promise<PopReadConfirmation> {
    const vigente = await this.pops.findVersaoVigente(popId);
    if (!vigente) {
      throw new NotFoundError('Nenhuma versão vigente encontrada para este POP.');
    }

    const conf = await this.pops.confirmRead(vigente.id, userId);

    if (this.audit && context) {
      await this.audit.registrar(
        { usuarioId: userId, ip: context.ip, userAgent: context.userAgent },
        'pop.confirm_read',
        'Pop',
        popId,
        null,
        conf,
      );
    }

    return conf;
  }
}
