import type { FormTipo, StatusRegistro } from '@/core/domain/forms/definitions';

export interface FormRecord {
  id: string;
  tipo: FormTipo;
  subtipo: string | null;
  dados: Record<string, unknown>;
  status: StatusRegistro;
  /** Data de referência (YYYY-MM-DD). */
  dataRef: string;
  criadoPor: string;
  criadoPorNome: string | null;
  createdAt: Date;
}

export const NC_STATUS = ['aberta', 'em_andamento', 'concluida'] as const;
export type NcStatus = (typeof NC_STATUS)[number];

export const NC_SEVERIDADES = ['leve', 'moderada', 'grave'] as const;
export type NcSeveridade = (typeof NC_SEVERIDADES)[number];

export const NC_ORIGENS = ['assistencia_tecnica', 'almoxarifado', 'qualidade'] as const;
export type NcOrigem = (typeof NC_ORIGENS)[number];

export const NC_STATUS_LABEL: Record<NcStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const NC_SEVERIDADE_LABEL: Record<NcSeveridade, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  grave: 'Grave',
};

export const NC_ORIGEM_LABEL: Record<NcOrigem, string> = {
  assistencia_tecnica: 'Assistência Técnica',
  almoxarifado: 'Almoxarifado',
  qualidade: 'Qualidade',
};

export interface Nc {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  origem: NcOrigem;
  severidade: NcSeveridade;
  status: NcStatus;
  responsavelId: string | null;
  criadoPor: string;
  createdAt: Date;
  updatedAt: Date;
  concluidaEm: Date | null;
}

export interface NcResumo {
  abertas: number;
  emAndamento: number;
  concluidas: number;
  total: number;
}

export const TREINAMENTO_TIPOS = ['interno', 'externo'] as const;
export type TreinamentoTipo = (typeof TREINAMENTO_TIPOS)[number];

export const TREINAMENTO_TIPO_LABEL: Record<TreinamentoTipo, string> = {
  interno: 'Treinamento interno',
  externo: 'Treinamento externo',
};

export interface Treinamento {
  id: string;
  titulo: string;
  tipo: TreinamentoTipo;
  setor: string;
  instrutor: string | null;
  entidade: string | null;
  cargaHoraria: number | null;
  dataRealizacao: string; // YYYY-MM-DD
  validadeAte: string | null;
  participantes: string[];
  observacoes: string | null;
  criadoPor: string;
  criadoPorNome: string | null;
  createdAt: Date;
}
