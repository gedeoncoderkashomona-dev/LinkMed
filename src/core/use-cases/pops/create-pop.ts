import type { Pop } from '@/core/domain/entities/pop';
import type { Setor } from '@/core/domain/enums/pop';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { StorageService } from '@/core/services/storage-service';
import type { HashService } from '@/core/services/hash-service';
import type { AuditService } from '@/core/services/audit-service';

export interface CreatePopInput {
  titulo: string;
  descricao?: string | null;
  setor: Setor;
  periodicidadeRevisaoMeses?: number;
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

export class CreatePopUseCase {
  constructor(
    private readonly pops: PopRepository,
    private readonly storage: StorageService,
    private readonly hasher: HashService,
    private readonly audit?: AuditService,
  ) {}

  async execute(input: CreatePopInput): Promise<Pop> {
    const codigo = await this.pops.nextSequentialCode(input.setor);

    const upload = await this.storage.upload({
      nome: input.arquivo.nome,
      mimeType: input.arquivo.mimeType,
      tamanho: input.arquivo.tamanho,
      content: input.arquivo.content,
    });

    const hash = await this.hasher.sha256(input.arquivo.content);

    const pop = await this.pops.create({
      codigo,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      setor: input.setor,
      periodicidadeRevisaoMeses: input.periodicidadeRevisaoMeses ?? 24,
      criadoPor: input.criadoPor,
    });

    await this.pops.createVersion({
      popId: pop.id,
      numeroVersao: 1,
      arquivoUrl: upload.url,
      arquivoNome: input.arquivo.nome,
      arquivoTamanho: input.arquivo.tamanho,
      hashArquivo: hash,
      criadoPor: input.criadoPor,
    });

    if (this.audit && input.context) {
      await this.audit.registrar(
        { usuarioId: input.criadoPor, ip: input.context.ip, userAgent: input.context.userAgent },
        'pop.create',
        'Pop',
        pop.id,
        null,
        pop,
      );
    }

    return pop;
  }
}
