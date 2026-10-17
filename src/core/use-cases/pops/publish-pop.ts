import { NotFoundError, ConflictError } from '@/core/domain/errors';
import type { Pop } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { AuditService } from '@/core/services/audit-service';

export class PublishPopUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly audit?: AuditService,
  ) {}

  async execute(
    id: string,
    usuarioId: string,
    context?: { ip: string | null; userAgent: string | null },
  ): Promise<Pop> {
    const pop = await this.pops.findById(id);
    if (!pop) throw new NotFoundError('POP não encontrado.');
    if (pop.status !== 'rascunho') {
      throw new ConflictError('Apenas POPs em rascunho podem ser enviados para aprovação.');
    }

    const updated = await this.pops.update(id, { status: 'aguardando_aprovacao' });

    if (this.audit && context) {
      await this.audit.registrar(
        { usuarioId, ip: context.ip, userAgent: context.userAgent },
        'pop.publish',
        'Pop',
        id,
        { status: 'rascunho' },
        { status: 'aguardando_aprovacao' },
      );
    }

    return updated;
  }
}
