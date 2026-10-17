import { NotFoundError } from '@/core/domain/errors';
import type { Pop, PopVersion } from '@/core/domain/entities/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { StorageService } from '@/core/services/storage-service';
import type { HashService } from '@/core/services/hash-service';
import type { AuditService } from '@/core/services/audit-service';

export interface NewVersionInput {
  popId: string;
  criadoPor: string;
  arquivo: {
    nome: string;
    tamanho: number;
    mimeType: string;
    content: ArrayBuffer;
  };
  context?: {
    ip: string | null;
    userAgent: string | null;
  };
}

export class NewVersionUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly storage: StorageService,
    private readonly hasher: HashService,
    private readonly audit?: AuditService,
  ) {}

  async execute(input: NewVersionInput): Promise<{ pop: Pop; versao: PopVersion }> {
    const pop = await this.pops.findById(input.popId);
    if (!pop) throw new NotFoundError('POP não encontrado.');

    const vigente = await this.pops.findVersaoVigente(input.popId);
    if (vigente) {
      await this.pops.markVersionObsolete(vigente.id);
    }

    const upload = await this.storage.upload({
      nome: input.arquivo.nome,
      mimeType: input.arquivo.mimeType,
      tamanho: input.arquivo.tamanho,
      content: input.arquivo.content,
    });

    const hash = await this.hasher.sha256(input.arquivo.content);
    const novoNumero = pop.versaoAtual + 1;

    const versao = await this.pops.createVersion({
      popId: pop.id,
      numeroVersao: novoNumero,
      arquivoUrl: upload.url,
      arquivoNome: input.arquivo.nome,
      arquivoTamanho: input.arquivo.tamanho,
      hashArquivo: hash,
      criadoPor: input.criadoPor,
    });

    const updatedPop = await this.pops.update(pop.id, {
      versaoAtual: novoNumero,
      status: 'publicado',
      aprovadoEm: new Date(),
    });

    if (this.audit && input.context) {
      await this.audit.registrar(
        { usuarioId: input.criadoPor, ip: input.context.ip, userAgent: input.context.userAgent },
        'pop.new_version',
        'Pop',
        pop.id,
        { versaoAtual: pop.versaoAtual },
        { versaoAtual: novoNumero, versaoId: versao.id },
      );
    }

    return { pop: updatedPop, versao };
  }
}
