import { NotFoundError, ConflictError } from '@/core/domain/errors';
import type { Pop } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { AuditService } from '@/core/services/audit-service';

export class RejectPopUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly audit?: AuditService,
  ) {}

  async execute(
    id: string,
    rejeitadoPor: string,
    motivo: string,
    context?: { ip: string | null; userAgent: string | null },
  ): Promise<Pop> {
    const pop = await this.pops.findById(id);
    if (!pop) throw new NotFoundError('POP não encontrado.');
    if (pop.status !== 'aguardando_aprovacao') {
      throw new ConflictError('Apenas POPs aguardando aprovação podem ser rejeitados.');
    }

    const updated = await this.pops.update(id, { status: 'rascunho' });

    if (this.audit && context) {
      await this.audit.registrar(
        { usuarioId: rejeitadoPor, ip: context.ip, userAgent: context.userAgent },
        'pop.reject',
        'Pop',
        id,
        { status: 'aguardando_aprovacao' },
        { status: 'rascunho', motivo },
      );
    }

    return updated;
  }
}
