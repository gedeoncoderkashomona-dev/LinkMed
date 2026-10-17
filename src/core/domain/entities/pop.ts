import type {
  Setor,
  PopStatus,
  VersionStatus,
  ChangeRequestStatus,
} from '../enums/pop';

export interface Pop {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  setor: Setor;
  versaoAtual: number;
  periodicidadeRevisaoMeses: number;
  status: PopStatus;
  criadoPor: string;
  aprovadoPor: string | null;
  aprovadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PopVersion {
  id: string;
  popId: string;
  numeroVersao: number;
  arquivoUrl: string;
  arquivoNome: string;
  arquivoTamanho: number;
  hashArquivo: string;
  status: VersionStatus;
  publicadoEm: Date | null;
  criadoPor: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface PopReadConfirmation {
  id: string;
  popVersionId: string;
  userId: string;
  confirmadoEm: Date;
}

export interface PopChangeRequest {
  id: string;
  popId: string;
  solicitanteId: string;
  descricao: string;
  status: ChangeRequestStatus;
  respondidoPor: string | null;
  resposta: string | null;
  respondidoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PopWithDetails extends Pop {
  versaoVigente: PopVersion | null;
  totalVersoes: number;
  totalConfirmacoes: number;
  totalPendentes: number;
}