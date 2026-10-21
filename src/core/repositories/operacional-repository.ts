import type {
  AvaliacaoEficaciaParticipante,
  FormRecord,
  Nc,
  NcResumo,
  NcStatus,
  NcOrigem,
  NcSeveridade,
  ParticipanteReg008,
  Treinamento,
  TreinamentoTipo,
} from '@/core/domain/entities/operacional';
import type { FormTipo, StatusRegistro } from '@/core/domain/forms/definitions';

export interface CreateFormRecordInput {
  tipo: FormTipo;
  subtipo: string | null;
  dados: Record<string, unknown>;
  status: StatusRegistro;
  dataRef: string;
  criadoPor: string;
}

export interface ListFormRecordsFilter {
  tipo?: FormTipo;
  /** Apenas registros com data de referência >= desde (YYYY-MM-DD). */
  desde?: string;
  limit?: number;
}

export interface CreateNcInput {
  titulo: string;
  descricao: string | null;
  causa?: string | null;
  acaoImediata?: string | null;
  identificacaoEquipamento?: string | null;
  equipamentoNaoSeAplica?: boolean;
  elaboradoPor?: string | null;
  revisadoPor?: string | null;
  aprovadoPor?: string | null;
  origem: NcOrigem;
  severidade: NcSeveridade;
  responsavelId: string | null;
  criadoPor: string;
}

export interface CreateTreinamentoInput {
  titulo: string;
  tipo: TreinamentoTipo;
  setor: string;
  instrutor: string | null;
  entidade: string | null;
  cargaHoraria: number | null;
  dataRealizacao: string;
  validadeAte: string | null;
  participantes: string[];
  participantesDetalhados?: ParticipanteReg008[];
  observacoes: string | null;
  conteudo?: string | null;
  localTreinamento?: string | null;
  horarioInicial?: string | null;
  horarioFinal?: string | null;
  avaliadoPor?: string | null;
  dataAvaliacao?: string | null;
  assinaturaAvaliador?: string | null;
  avaliacoesEficacia?: AvaliacaoEficaciaParticipante[];
  elaboradoPor?: string | null;
  revisadoPor?: string | null;
  aprovadoPor?: string | null;
  criadoPor: string;
}

export interface UpdateTreinamentoEficaciaInput {
  id: string;
  avaliadoPor: string;
  dataAvaliacao: string;
  assinaturaAvaliador: string;
  avaliacoesEficacia: AvaliacaoEficaciaParticipante[];
}

/** Persistência dos módulos operacionais (formulários, NCs, treinamentos). */
export interface OperacionalRepository {
  createFormRecord(input: CreateFormRecordInput): Promise<FormRecord>;
  listFormRecords(filter?: ListFormRecordsFilter): Promise<FormRecord[]>;
  /** Quantidade de registros não conformes por tipo de formulário, desde uma data. */
  countFormRecordsPorTipo(desde: string): Promise<Record<string, { total: number; naoConformes: number }>>;

  createNc(input: CreateNcInput): Promise<Nc>;
  listNcs(origem?: NcOrigem): Promise<Nc[]>;
  updateNcStatus(id: string, status: NcStatus): Promise<Nc | null>;
  resumoNcs(origem?: NcOrigem): Promise<NcResumo>;

  createTreinamento(input: CreateTreinamentoInput): Promise<Treinamento>;
  listTreinamentos(tipo?: TreinamentoTipo): Promise<Treinamento[]>;
  updateTreinamentoEficacia?(input: UpdateTreinamentoEficaciaInput): Promise<Treinamento | null>;
}
