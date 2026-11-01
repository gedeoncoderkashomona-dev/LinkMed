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

/**
 * Catálogo oficial de documentos por módulo conforme Seção 1 da Auditoria Linkmed (v2).
 */
export const DOCUMENTOS_OFICIAIS_POR_MODULO = {
  documentosPops: [
    { codigo: 'POP-004', titulo: 'Treinamento de Pessoal' },
    { codigo: 'POP-006', titulo: 'Limpeza e Higienização dos Ambientes' },
    { codigo: 'POP-007', titulo: 'Controle de Ambiente e Infraestrutura' },
    { codigo: 'POP-011', titulo: 'Gestão de Instrumentos de Medição' },
    { codigo: 'POP-012', titulo: 'Gestão de não conformidade' },
    { codigo: 'POP-014', titulo: 'Ações corretivas e preventivas' },
    { codigo: 'POP-019', titulo: 'Instalação e Treinamento de Equipamentos' },
    { codigo: 'POP-020', titulo: 'Assistência Técnica' },
  ],
  formularios: [
    { codigo: 'REG-018', pastaPop: 'POP-006', titulo: 'Limpeza e Higienização dos Ambientes' },
    { codigo: 'REG-017', pastaPop: 'POP-007', titulo: 'Controle de Ambiente e Infraestrutura (Temperatura e Umidade)' },
    { codigo: 'REG-040', pastaPop: 'POP-007', titulo: 'Teste Diário da Pulseira e Manta Anti-Estática (ESD)' },
    { codigo: 'REG-030', pastaPop: 'POP-011', titulo: 'Gestão de Instrumentos de Medição' },
    { codigo: 'REG-015', pastaPop: 'POP-011', titulo: 'Controle de Instrumentos de Medição — Validade de Calibração' },
    { codigo: 'REG-016', pastaPop: 'POP-020', titulo: 'Etapas da Manutenção (Assistência Técnica)' },
  ],
  naoConformidades: [
    { codigo: 'REG-038', pastaPop: 'POP-012', titulo: 'Registro de Não Conformidade' },
    { codigo: 'REG-047', pastaPop: 'POP-012', titulo: 'Controle e Tratativa de Não Conformidades' },
  ],
  treinamentos: [
    { codigo: 'REG-008', pastaPop: 'POP-019', titulo: 'Registro de Treinamento e Avaliação da Eficácia' },
    { codigo: 'REG-036', pastaPop: 'POP-019', titulo: 'Cronograma / Controle de Treinamento' },
    { codigo: 'REG-045', pastaPop: 'POP-019', titulo: 'Registro de Instalação e Treinamento de Equipamentos' },
  ],
} as const;

/**
 * Calcula automaticamente a Carga Horária (em horas decimais) a partir de
 * Horário Inicial (HH:MM) e Horário Final (HH:MM), conforme Seção 2 da Auditoria Linkmed.
 */
export function calcularCargaHorariaAutomatica(
  horarioInicial?: string | null,
  horarioFinal?: string | null,
): number | null {
  if (!horarioInicial || !horarioFinal) return null;
  const matchIni = /^(\d{1,2}):(\d{2})$/.exec(horarioInicial.trim());
  const matchFim = /^(\d{1,2}):(\d{2})$/.exec(horarioFinal.trim());
  if (!matchIni || !matchFim) return null;

  const hIni = Number(matchIni[1]);
  const mIni = Number(matchIni[2]);
  const hFim = Number(matchFim[1]);
  const mFim = Number(matchFim[2]);

  if (
    Number.isNaN(hIni) ||
    Number.isNaN(mIni) ||
    Number.isNaN(hFim) ||
    Number.isNaN(mFim) ||
    hIni > 23 ||
    mIni > 59 ||
    hFim > 23 ||
    mFim > 59
  ) {
    return null;
  }

  const totalMinIni = hIni * 60 + mIni;
  const totalMinFim = hFim * 60 + mFim;
  let diffMin = totalMinFim - totalMinIni;
  if (diffMin <= 0) {
    return null;
  }

  return Number((diffMin / 60).toFixed(2));
}

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
