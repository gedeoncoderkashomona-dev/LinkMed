import { NotFoundError, ConflictError } from '@/core/domain/errors';
import type { Pop } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { SignatureService } from '@/core/services/signature-service';
import type { AuditService } from '@/core/services/audit-service';

export interface ApprovePopOutput {
  pop: Pop;
  assinatura: string;
}

export class ApprovePopUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly signature: SignatureService,
    private readonly audit?: AuditService,
  ) {}

  async execute(
    id: string,
    aprovadorId: string,
    context?: { ip: string | null; userAgent: string | null },
  ): Promise<ApprovePopOutput> {
    const pop = await this.pops.findById(id);
    if (!pop) throw new NotFoundError('POP não encontrado.');
    if (pop.status !== 'aguardando_aprovacao' && pop.status !== 'rascunho') {
      throw new ConflictError('POP não está apto para aprovação.');
    }

    const versao = await this.pops.findVersaoVigente(id);
    const hashDocumento = versao?.hashArquivo ?? '00000000000000000000000000000000';
    const now = new Date();

    const assinatura = await this.signature.assinar({
      usuarioId: aprovadorId,
      hashDocumento,
      timestamp: now,
      ip: context?.ip ?? '127.0.0.1',
      userAgent: context?.userAgent ?? 'Regula-On Client',
    });

    const updated = await this.pops.update(id, {
      status: 'publicado',
      aprovadoPor: aprovadorId,
      aprovadoEm: now,
    });

    if (versao) {
      await this.pops.publishVersion(versao.id);
    }

    if (this.audit && context) {
      await this.audit.registrar(
        { usuarioId: aprovadorId, ip: context.ip, userAgent: context.userAgent },
        'pop.approve',
        'Pop',
        id,
        { status: pop.status },
        { status: 'publicado', assinatura },
      );
    }

    return { pop: updated, assinatura };
  }
}
