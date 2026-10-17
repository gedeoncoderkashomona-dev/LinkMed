import type {
  Pop,
  PopVersion,
  PopReadConfirmation,
  PopChangeRequest,
  PopWithDetails,
} from '../domain/entities/pop';
import type { Setor, PopStatus, ChangeRequestStatus } from '../domain/enums/pop';

export interface CreatePopInput {
  codigo: string;
  titulo: string;
  descricao?: string | null;
  setor: Setor;
  periodicidadeRevisaoMeses?: number;
  criadoPor: string;
}

export interface CreatePopVersionInput {
  popId: string;
  numeroVersao: number;
  arquivoUrl: string;
  arquivoNome: string;
  arquivoTamanho: number;
  hashArquivo: string;
  criadoPor: string;
}

export interface UpdatePopInput {
  titulo?: string;
  descricao?: string | null;
  periodicidadeRevisaoMeses?: number;
  status?: PopStatus;
  aprovadoPor?: string | null;
  aprovadoEm?: Date | null;
  versaoAtual?: number;
}

export interface ListPopsFilter {
  setor?: Setor;
  status?: PopStatus;
  search?: string;
}

export interface PopRepository {
  findById(id: string): Promise<Pop | null>;
  findByCodigo(codigo: string): Promise<Pop | null>;
  list(filter?: ListPopsFilter): Promise<Pop[]>;
  listWithDetails(filter?: ListPopsFilter): Promise<PopWithDetails[]>;
  create(input: CreatePopInput): Promise<Pop>;
  update(id: string, input: UpdatePopInput): Promise<Pop>;
  softDelete(id: string): Promise<void>;
  nextSequentialCode(setor: Setor): Promise<string>;

  findVersionById(id: string): Promise<PopVersion | null>;
  findVersaoVigente(popId: string): Promise<PopVersion | null>;
  listVersions(popId: string): Promise<PopVersion[]>;
  createVersion(input: CreatePopVersionInput): Promise<PopVersion>;
  markVersionObsolete(versionId: string): Promise<void>;
  publishVersion(versionId: string): Promise<void>;
  countConfirmations(versionId: string): Promise<number>;

  hasConfirmed(versionId: string, userId: string): Promise<boolean>;
  confirmRead(versionId: string, userId: string): Promise<PopReadConfirmation>;
  listConfirmations(versionId: string): Promise<PopReadConfirmation[]>;

  createChangeRequest(input: {
    popId: string;
    solicitanteId: string;
    descricao: string;
  }): Promise<PopChangeRequest>;
  listChangeRequests(popId: string): Promise<PopChangeRequest[]>;
  findChangeRequestById(id: string): Promise<PopChangeRequest | null>;
  updateChangeRequest(
    id: string,
    input: {
      status?: ChangeRequestStatus;
      respondidoPor?: string;
      resposta?: string;
      respondidoEm?: Date;
    },
  ): Promise<PopChangeRequest>;
}