import { NotFoundError } from '@/core/domain/errors';
import type { PopChangeRequest } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { AuditService } from '@/core/services/audit-service';

export class ChangeRequestUseCases {
  constructor(
    private readonly pops: PopRepository,
    private readonly audit?: AuditService,
  ) {}

  async create(input: {
    popId: string;
    solicitanteId: string;
    descricao: string;
    context?: { ip: string | null; userAgent: string | null };
  }): Promise<PopChangeRequest> {
    const pop = await this.pops.findById(input.popId);
    if (!pop) throw new NotFoundError('POP não encontrado.');

    const cr = await this.pops.createChangeRequest({
      popId: input.popId,
      solicitanteId: input.solicitanteId,
      descricao: input.descricao,
    });

    if (this.audit && input.context) {
      await this.audit.registrar(
        { usuarioId: input.solicitanteId, ip: input.context.ip, userAgent: input.context.userAgent },
        'pop.change_request.create',
        'PopChangeRequest',
        cr.id,
        null,
        cr,
      );
    }

    return cr;
  }

  async respond(input: {
    popId: string;
    crId: string;
    respondidoPor: string;
    status: 'aprovada' | 'rejeitada';
    resposta: string;
    context?: { ip: string | null; userAgent: string | null };
  }): Promise<PopChangeRequest> {
    const updated = await this.pops.updateChangeRequest(input.crId, {
      status: input.status,
      respondidoPor: input.respondidoPor,
      resposta: input.resposta,
      respondidoEm: new Date(),
    });

    if (this.audit && input.context) {
      await this.audit.registrar(
        { usuarioId: input.respondidoPor, ip: input.context.ip, userAgent: input.context.userAgent },
        'pop.change_request.respond',
        'PopChangeRequest',
        input.crId,
        null,
        updated,
      );
    }

    return updated;
  }
}
