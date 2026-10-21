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

export const NC_ORIGENS = [
  'assistencia_tecnica',
  'almoxarifado',
  'qualidade',
  'vendas',
  'diretoria',
  'financeiro',
] as const;
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
  vendas: 'Vendas',
  diretoria: 'Diretoria',
  financeiro: 'Financeiro',
};

export interface Nc {
  id: string;
  codigo: string;
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

export interface ParticipanteReg008 {
  nome: string;
  funcao: string;
  assinatura: string;
}

export type NotaEficacia = 1 | 2 | 3 | 4 | 5;

export interface AvaliacaoEficaciaParticipante {
  participante: string;
  assimilacaoConteudo: NotaEficacia;
  aplicabilidadeAtividade: NotaEficacia;
  desempenhoQualidadeProdutividade: NotaEficacia;
  interesseNovosConceitos: NotaEficacia;
  execucaoConformeProcedimentos: NotaEficacia;
  observacoes: string;
}

export const QUESITOS_EFICACIA_REG008: Array<{
  key: keyof Omit<AvaliacaoEficaciaParticipante, 'participante' | 'observacoes'>;
  label: string;
}> = [
  {
    key: 'assimilacaoConteudo',
    label: 'Assimilação e domínio do conteúdo do treinamento?',
  },
  {
    key: 'aplicabilidadeAtividade',
    label: 'Aplicabilidade do treinamento na atividade?',
  },
  {
    key: 'desempenhoQualidadeProdutividade',
    label: 'Desempenho apresentado após treinamento: Qualidade X Produtividade?',
  },
  {
    key: 'interesseNovosConceitos',
    label: 'Interesse em aprender novos conceitos?',
  },
  {
    key: 'execucaoConformeProcedimentos',
    label: 'O colaborador executa conforme os procedimentos operacionais?',
  },
];

export const LEGENDA_EFICACIA_REG008: Record<NotaEficacia, string> = {
  1: '1 - INSATISFATÓRIO',
  2: '2 - REGULAR',
  3: '3 - BOM',
  4: '4 - MUITO BOM',
  5: '5 - EXCELENTE',
};

export const HISTORICO_REVISAO_REG008 = [
  { data: '01/04/2025', numero: '00', historico: 'Elaboração do documento.' },
  { data: '30/01/2026', numero: '01', historico: 'Adequação do Processo' },
] as const;

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
  criadoPorNome: string | null;
  createdAt: Date;
}
