import type { FormRecord } from '@/core/domain/entities/operacional';
import type { Perfil } from '@/core/domain/enums/user';

function randomUUID(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `os-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
import {
  calcularEntregaNotificacao,
  diffDiasDatas,
  type SetorOperacional,
} from './os-schedule-helpers';
import type { FormTipo } from './definitions';

/**
 * Cores das Etiquetas Físicas / Visuais definidas no REG-016 e POP-020 (Seção 4.1).
 */
export type TagColor =
  | 'WHITE' // Branca — Aguardando análise (ADM, manualmente)
  | 'VIOLET' // Violeta — Higienizado (AT, manualmente)
  | 'GRAY' // Cinza — Análise completa (AT, manualmente)
  | 'ORANGE' // Laranja — Garantia (Automática: SIM em "Trata-se de garantia?")
  | 'BROWN' // Marrom — Enviado ao fabricante (Automática: SIM em "O equipamento foi enviado?")
  | 'YELLOW' // Amarela — Aguardando aprovação do orçamento (ADM, manualmente)
  | 'BLUE' // Azul — Orçamento aprovado (Automática: SIM em "O orçamento foi aprovado?")
  | 'BLACK' // Preta — Aguardando peças / stand-by (Automática: almoxarifado marca "aguardando peças")
  | 'RED' // Vermelha — Orçamento reprovado / bloqueia item 5 do REG 016
  | 'GREEN'; // Verde — Serviço finalizado (AT, manualmente)

export type OSStatus =
  | 'AGUARDANDO_ANALISE'
  | 'HIGIENIZADO'
  | 'ANALISE_CONCLUIDA'
  | 'EM_GARANTIA'
  | 'ENVIADO_FABRICA'
  | 'AGUARDANDO_APROVACAO_ORCAMENTO'
  | 'ORCAMENTO_APROVADO'
  | 'AGUARDANDO_PECAS'
  | 'ORCAMENTO_RECUSADO'
  | 'SERVICO_FINALIZADO';

export type EstadoGeralOS = 'em_andamento' | 'stand_by' | 'finalizada' | 'cancelada';

export type SetorPendenteOS = SetorOperacional | 'NENHUM';

export type MarcaEquipamentoOS = 'Cardios' | 'TEB' | 'OLIDEF' | string;

export type TipoTransporteFabrica =
  | 'transportadora_linkmed'
  | 'transportadora_cliente'
  | 'correios';

export const OPCOES_TRANSPORTE_FABRICA: Array<{
  value: TipoTransporteFabrica;
  label: string;
}> = [
  { value: 'transportadora_linkmed', label: 'Transportadora contratada pela Linkmed' },
  { value: 'transportadora_cliente', label: 'Transportadora contratada pelo cliente' },
  { value: 'correios', label: 'Correios' },
];

export interface TagSpec {
  color: TagColor;
  status: OSStatus;
  nomeCor: string;
  labelStatus: string;
  comoMarcada: string;
  hex: string;
  regraOperacional: string;
  badgeClass: string;
  dotClass: string;
}

export const TAG_SPECS: Record<TagColor, TagSpec> = {
  WHITE: {
    color: 'WHITE',
    status: 'AGUARDANDO_ANALISE',
    nomeCor: 'Branca',
    labelStatus: 'Aguardando Análise',
    comoMarcada: 'ADM, manualmente',
    hex: '#FFFFFF',
    regraOperacional: 'Aguardando análise (marcada pelo ADM no REG 016).',
    badgeClass:
      'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    dotClass: 'bg-slate-300 border border-slate-500',
  },
  VIOLET: {
    color: 'VIOLET',
    status: 'HIGIENIZADO',
    nomeCor: 'Violeta',
    labelStatus: 'Higienizado',
    comoMarcada: 'AT, manualmente',
    hex: '#8A2BE2',
    regraOperacional: 'Aplicada pela AT após limpeza com Álcool 70% e registro no REG 034.',
    badgeClass: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dotClass: 'bg-violet-600',
  },
  GRAY: {
    color: 'GRAY',
    status: 'ANALISE_CONCLUIDA',
    nomeCor: 'Cinza',
    labelStatus: 'Análise Completa',
    comoMarcada: 'AT, manualmente',
    hex: '#808080',
    regraOperacional: 'Análise técnica concluída em bancada. Libera impressão da etiqueta de identificação.',
    badgeClass: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-500',
  },
  ORANGE: {
    color: 'ORANGE',
    status: 'EM_GARANTIA',
    nomeCor: 'Laranja',
    labelStatus: 'Garantia',
    comoMarcada: 'Automática (resposta SIM em "Trata-se de garantia?")',
    hex: '#FFA500',
    regraOperacional: 'Automática quando a AT responde SIM em "Trata-se de garantia?".',
    badgeClass: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
  BROWN: {
    color: 'BROWN',
    status: 'ENVIADO_FABRICA',
    nomeCor: 'Marrom',
    labelStatus: 'Enviado ao Fabricante',
    comoMarcada: 'Automática (resposta SIM em "O equipamento foi enviado?")',
    hex: '#8B4513',
    regraOperacional: 'Enviado ao fabricante (por si só, não bloqueia o item 5 do REG 016).',
    badgeClass: 'border-amber-800/40 bg-amber-900/15 text-amber-900 dark:text-amber-200',
    dotClass: 'bg-amber-800',
  },
  YELLOW: {
    color: 'YELLOW',
    status: 'AGUARDANDO_APROVACAO_ORCAMENTO',
    nomeCor: 'Amarela',
    labelStatus: 'Aguardando Aprovação do Orçamento',
    comoMarcada: 'ADM, manualmente',
    hex: '#FFD700',
    regraOperacional: 'ADM contata o cliente por e-mail e aguarda aprovação do orçamento.',
    badgeClass: 'border-amber-500/40 bg-amber-400/20 text-amber-800 dark:text-amber-300',
    dotClass: 'bg-amber-400',
  },
  BLUE: {
    color: 'BLUE',
    status: 'ORCAMENTO_APROVADO',
    nomeCor: 'Azul',
    labelStatus: 'Orçamento Aprovado',
    comoMarcada: 'Automática (resposta SIM em "O orçamento foi aprovado?")',
    hex: '#0000FF',
    regraOperacional: 'Automática após aprovação do orçamento; aciona separação de peças no Almoxarifado.',
    badgeClass: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-600',
  },
  BLACK: {
    color: 'BLACK',
    status: 'AGUARDANDO_PECAS',
    nomeCor: 'Preta',
    labelStatus: 'Aguardando Peças (OS em stand-by)',
    comoMarcada: 'Automática (almoxarifado marca "aguardando peças")',
    hex: '#000000',
    regraOperacional: 'OS em stand-by aguardando compra/chegada de peças conforme POP 009.',
    badgeClass: 'border-neutral-800 bg-neutral-900 text-white dark:border-neutral-600',
    dotClass: 'bg-neutral-950',
  },
  RED: {
    color: 'RED',
    status: 'ORCAMENTO_RECUSADO',
    nomeCor: 'Vermelha',
    labelStatus: 'Orçamento Reprovado',
    comoMarcada: 'Automática (após confirmação da AT) ou escolhida na ramificação 2',
    hex: '#FF0000',
    regraOperacional: 'Orçamento reprovado (bloqueia o item 5 do REG 016 e finaliza a OS).',
    badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-600',
  },
  GREEN: {
    color: 'GREEN',
    status: 'SERVICO_FINALIZADO',
    nomeCor: 'Verde',
    labelStatus: 'Serviço Finalizado',
    comoMarcada: 'AT, manualmente',
    hex: '#008000',
    regraOperacional: 'Serviço finalizado pela Assistência Técnica.',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-600',
  },
};

export const TAG_SPECS_LIST: TagSpec[] = Object.values(TAG_SPECS);

// ============================================================================
// Máquina de Estados Completa da OS (Documento de Apoio v2 — Seções 4 a 9)
// ============================================================================

export type CodigoPassoFluxoOS =
  | 'A1_CRIADA_NO_REG022'
  | 'A2_BRANCA_NOTIFICA_AT'
  | 'A3_AT_CONFIRMOU_PREENCHER_REG034'
  | 'A4_REG034_PREENCHIDO'
  | 'A5_VIOLETA_HIGIENIZADO'
  | 'A6_CINZA_ANALISE_CONCLUIDA'
  | 'B2_PERGUNTA_ENVIO_FABRICA'
  | 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA'
  | 'C_AGUARDANDO_ORCAMENTO_ADM'
  | 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE'
  | 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT'
  | 'D_AGUARDANDO_CONFIRMACAO_ALMOX'
  | 'D1_ALMOX_DECIDINDO_PECAS'
  | 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS'
  | 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT'
  | 'D5_AT_PRONTO_PARA_FINALIZAR'
  | 'FINALIZADA'
  | 'CANCELADA';

export type TipoEventoOS =
  | 'CRIACAO_OS'
  | 'MARCACAO_ETIQUETA'
  | 'RESPOSTA_PERGUNTA'
  | 'CONFIRMACAO_NOTIFICACAO'
  | 'PREENCHIMENTO_FORMULARIO'
  | 'CORRECAO_MARCACAO'
  | 'CANCELAMENTO'
  | 'REABERTURA'
  | 'LEMBRETE_7_DIAS';

export interface EventoHistoricoOS {
  id: string;
  numeroOs: string;
  codigoPasso: string;
  tipo: TipoEventoOS;
  chaveAcao?: string; // ex.: 'garantia', 'envio_fabrica', 'foi_enviado', 'orcamento_aprovado', 'decisao_pecas', 'etiqueta_violeta'
  valorAnterior: string | null;
  valorNovo: string;
  etiquetaAnterior: TagColor | null;
  etiquetaNova: TagColor | null;
  setorPendenteAnterior: SetorPendenteOS;
  setorPendenteNovo: SetorPendenteOS;
  usuarioId: string; // ou 'sistema'
  usuarioNome: string;
  usuarioPerfil: Perfil | 'sistema';
  dataHora: Date;
  observacao: string | null;
  /** Snapshot do estado antes deste evento para suportar recálculo em correção pelo dono (Seção 7.1) */
  snapshotAnterior?: Omit<
    OrdemServicoFluxoState,
    'historico' | 'notificacoes'
  >;
}

export interface NotificacaoSetorOS {
  id: string;
  numeroOs: string;
  destinatario: SetorOperacional;
  mensagem: string;
  criadaEm: Date;
  entregueEm: Date;
  retidaForaHorario: boolean;
  confirmadaEm: Date | null;
  confirmadaPorId: string | null;
  confirmadaPorNome: string | null;
  lembreteEnviadoEm: Date | null;
  quantidadeLembretes: number;
}

export interface IdentificacaoEquipamentoOS {
  cliente: string;
  equipamento: string;
  marca: MarcaEquipamentoOS;
  modelo: string;
  numeroSerie: string;
  acessorios?: string;
  relatoCliente?: string;
}

export interface OrdemServicoFluxoState {
  id: string;
  numeroOs: string;
  numeroOsNormalizado: string;
  identificacao: IdentificacaoEquipamentoOS;
  etiquetaAtual: TagColor | null;
  /** Guarda a etiqueta antes de entrar em PRETA (stand-by de peças) para restaurar LARANJA ou AZUL em D3 */
  etiquetaAnteriorStandByPecas: TagColor | null;
  estadoGeral: EstadoGeralOS;
  setorPendente: SetorPendenteOS;
  passoAtual: CodigoPassoFluxoOS;
  ramificacao: 1 | 2 | 3 | null;
  trataSeGarantia: boolean | null;
  trataSeEnvioFabrica: boolean | null;
  tipoTransporteFabrica: TipoTransporteFabrica | null;
  equipamentoEnviadoFabrica: boolean | null;
  justificativaNaoEnviado: string | null;
  orcamentoAprovado: boolean | null;
  statusPecasAlmoxarifado: 'pecas_disponiveis' | 'aguardando_pecas' | null;
  reg022Preenchido: boolean;
  reg034Preenchido: boolean;
  reg016Iniciado: boolean;
  item5Liberado: boolean;
  item5Preenchido: boolean;
  item5FormularioTipo: 'REG-009' | 'REG-035' | null;
  etiquetaIdentificacaoLiberada: boolean;
  mensagemTelaAtual: string | null;
  perguntaPendenteAtual: string | null;
  criadaPorId: string;
  criadaPorNome: string;
  criadaEm: Date;
  atualizadaEm: Date;
  /** Snapshot completo antes de um cancelamento para restaurar exatamente ao reabrir (Seção 7.3) */
  estadoAntesCancelamento?: {
    etiquetaAtual: TagColor | null;
    estadoGeral: EstadoGeralOS;
    setorPendente: SetorPendenteOS;
    passoAtual: CodigoPassoFluxoOS;
    mensagemTelaAtual: string | null;
    perguntaPendenteAtual: string | null;
  } | null;
  historico: EventoHistoricoOS[];
  notificacoes: NotificacaoSetorOS[];
}

export interface AtorAcaoOS {
  usuarioId: string;
  usuarioNome: string;
  perfil: Perfil;
  dataHora?: Date;
}

/**
 * Normaliza o número da OS (sem espaços nas pontas e em maiúsculas) para bloqueio de duplicidade (Seção 7.4).
 */
export function normalizarNumeroOs(numeroOs: string): string {
  return String(numeroOs ?? '').trim().toUpperCase();
}

/**
 * Verifica se já existe uma OS com o mesmo número (inclusive finalizada ou cancelada — Seção 7.4 e T11).
 */
export function verificarDuplicidadeOs(
  numeroOs: string,
  ordensExistentes: Array<{ numeroOs: string; id?: string }>,
): {
  duplicada: boolean;
  osExistenteNumero: string | null;
  mensagem: string | null;
  linkOsExistente: string | null;
} {
  const alvo = normalizarNumeroOs(numeroOs);
  if (!alvo) {
    return {
      duplicada: false,
      osExistenteNumero: null,
      mensagem: null,
      linkOsExistente: null,
    };
  }

  const encontrada = ordensExistentes.find(
    (o) => normalizarNumeroOs(o.numeroOs) === alvo,
  );
  if (!encontrada) {
    return {
      duplicada: false,
      osExistenteNumero: null,
      mensagem: null,
      linkOsExistente: null,
    };
  }

  return {
    duplicada: true,
    osExistenteNumero: encontrada.numeroOs,
    mensagem: `Já existe uma OS com este número (${encontrada.numeroOs}). Para retomar uma OS cancelada, usar a reabertura.`,
    linkOsExistente: `/equipamentos?os=${encodeURIComponent(encontrada.numeroOs)}`,
  };
}

/**
 * Determina qual formulário é disponibilizado no Item 5 do REG 016 conforme a marca (Seção 3.2):
 * - Cardios -> Preenchimento do REG 009
 * - TEB -> Informações do REG 035
 * - OLIDEF -> Informações do REG 035
 */
export function determinarFormularioItem5PorMarca(
  marca: string,
): 'REG-009' | 'REG-035' {
  const m = String(marca ?? '').trim().toLowerCase();
  if (m === 'cardios' || m.includes('cardios')) {
    return 'REG-009';
  }
  return 'REG-035';
}

/**
 * Regra de bloqueio do Item 5 do REG 016 (Seção 3.2):
 * - O item 5 NÃO é liberado quando a OS tiver a etiqueta VERMELHA (orçamento não aprovado).
 * - Isso inclui o caso em que o equipamento foi enviado à fábrica (MARROM), seguiu para orçamento e o orçamento foi reprovado (VERMELHA).
 * - A etiqueta MARROM, por si só, não bloqueia o item 5.
 */
export function isItem5Reg016Liberado(
  etiquetaAtual: TagColor | null,
  orcamentoAprovado?: boolean | null,
): boolean {
  if (etiquetaAtual === 'RED') return false;
  if (orcamentoAprovado === false) return false;
  return true;
}

function clonarSnapshotSemListas(
  state: OrdemServicoFluxoState,
): Omit<OrdemServicoFluxoState, 'historico' | 'notificacoes'> {
  const { historico: _h, notificacoes: _n, ...resto } = state;
  return structuredClone(resto);
}

function adicionarNotificacaoSetor(
  state: OrdemServicoFluxoState,
  destinatario: SetorOperacional,
  mensagem: string,
  agora: Date,
): NotificacaoSetorOS {
  const calc = calcularEntregaNotificacao(agora);
  const notif: NotificacaoSetorOS = {
    id: randomUUID(),
    numeroOs: state.numeroOs,
    destinatario,
    mensagem,
    criadaEm: agora,
    entregueEm: calc.entregueEm,
    retidaForaHorario: calc.retida,
    confirmadaEm: null,
    confirmadaPorId: null,
    confirmadaPorNome: null,
    lembreteEnviadoEm: null,
    quantidadeLembretes: 0,
  };
  state.notificacoes.push(notif);
  return notif;
}

function registrarEvento(
  state: OrdemServicoFluxoState,
  params: {
    codigoPasso: string;
    tipo: TipoEventoOS;
    chaveAcao?: string;
    valorAnterior: string | null;
    valorNovo: string;
    etiquetaAnterior: TagColor | null;
    etiquetaNova: TagColor | null;
    setorPendenteAnterior: SetorPendenteOS;
    setorPendenteNovo: SetorPendenteOS;
    ator: { usuarioId: string; usuarioNome: string; perfil: Perfil | 'sistema' };
    agora: Date;
    observacao?: string | null;
    snapshotAnterior?: Omit<OrdemServicoFluxoState, 'historico' | 'notificacoes'>;
  },
) {
  state.historico.push({
    id: randomUUID(),
    numeroOs: state.numeroOs,
    codigoPasso: params.codigoPasso,
    tipo: params.tipo,
    chaveAcao: params.chaveAcao,
    valorAnterior: params.valorAnterior,
    valorNovo: params.valorNovo,
    etiquetaAnterior: params.etiquetaAnterior,
    etiquetaNova: params.etiquetaNova,
    setorPendenteAnterior: params.setorPendenteAnterior,
    setorPendenteNovo: params.setorPendenteNovo,
    usuarioId: params.ator.usuarioId,
    usuarioNome: params.ator.usuarioNome,
    usuarioPerfil: params.ator.perfil,
    dataHora: params.agora,
    observacao: params.observacao ?? null,
    snapshotAnterior: params.snapshotAnterior,
  });
}

function validarPermissaoSetor(
  ator: AtorAcaoOS,
  setoresPermitidos: Array<'ADM' | 'AT' | 'ALMOXARIFADO'>,
) {
  if (ator.perfil === 'diretor' || ator.perfil === 'gestor') return;
  const mapa: Record<string, 'ADM' | 'AT' | 'ALMOXARIFADO' | undefined> = {
    adm: 'ADM',
    tecnico: 'AT',
    estoquista: 'ALMOXARIFADO',
  };
  const setorAtor = mapa[ator.perfil];
  if (!setorAtor || !setoresPermitidos.includes(setorAtor)) {
    throw new Error(
      `Ação restrita ao setor ${setoresPermitidos.join(' ou ')}. Seu perfil atual (${ator.perfil}) não pode executar esta etapa.`,
    );
  }
}

/**
 * A1: ADM preenche o REG 022 identificando o nº da OS (gerada no ERP de terceiro).
 * Bloqueia OS duplicada (Seção 7.4).
 */
export function criarOsViaReg022(
  input: {
    numeroOs: string;
    identificacao: IdentificacaoEquipamentoOS;
    ator: AtorAcaoOS;
  },
  ordensExistentes: Array<{ numeroOs: string; id?: string }> = [],
): OrdemServicoFluxoState {
  validarPermissaoSetor(input.ator, ['ADM']);
  const numLimpo = String(input.numeroOs ?? '').trim();
  if (!numLimpo) {
    throw new Error('Informe o número da OS gerada no ERP.');
  }

  const dup = verificarDuplicidadeOs(numLimpo, ordensExistentes);
  if (dup.duplicada) {
    throw new Error(dup.mensagem!);
  }

  const agora = input.ator.dataHora ?? new Date();
  const formItem5 = determinarFormularioItem5PorMarca(input.identificacao.marca);

  const state: OrdemServicoFluxoState = {
    id: randomUUID(),
    numeroOs: numLimpo,
    numeroOsNormalizado: normalizarNumeroOs(numLimpo),
    identificacao: { ...input.identificacao },
    etiquetaAtual: null,
    etiquetaAnteriorStandByPecas: null,
    estadoGeral: 'em_andamento',
    setorPendente: 'ADM',
    passoAtual: 'A1_CRIADA_NO_REG022',
    ramificacao: null,
    trataSeGarantia: null,
    trataSeEnvioFabrica: null,
    tipoTransporteFabrica: null,
    equipamentoEnviadoFabrica: null,
    justificativaNaoEnviado: null,
    orcamentoAprovado: null,
    statusPecasAlmoxarifado: null,
    reg022Preenchido: true,
    reg034Preenchido: false,
    reg016Iniciado: false,
    item5Liberado: true,
    item5Preenchido: false,
    item5FormularioTipo: formItem5,
    etiquetaIdentificacaoLiberada: false,
    mensagemTelaAtual: 'Preencha o REG 016',
    perguntaPendenteAtual: null,
    criadaPorId: input.ator.usuarioId,
    criadaPorNome: input.ator.usuarioNome,
    criadaEm: agora,
    atualizadaEm: agora,
    estadoAntesCancelamento: null,
    historico: [],
    notificacoes: [],
  };

  registrarEvento(state, {
    codigoPasso: 'A1',
    tipo: 'CRIACAO_OS',
    chaveAcao: 'reg022',
    valorAnterior: null,
    valorNovo: `OS ${numLimpo} criada via REG 022`,
    etiquetaAnterior: null,
    etiquetaNova: null,
    setorPendenteAnterior: 'NENHUM',
    setorPendenteNovo: 'ADM',
    ator: input.ator,
    agora,
    observacao: 'Preencha o REG 016',
  });

  return state;
}

/**
 * A2: ADM abre o REG 016 (dados reaproveitados do REG 022) e marca a etiqueta BRANCA ("aguardando análise").
 * Notifica a AT.
 */
export function admMarcarEtiquetaBrancaNoReg016(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['ADM']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);

  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.reg016Iniciado = true;
  os.etiquetaAtual = 'WHITE';
  os.setorPendente = 'AT';
  os.passoAtual = 'A2_BRANCA_NOTIFICA_AT';
  os.mensagemTelaAtual = 'AT é notificada: nova OS no REG 016 com status "aguardando análise".';
  os.atualizadaEm = agora;

  adicionarNotificacaoSetor(
    os,
    'AT',
    `Nova OS (${os.numeroOs}) no REG 016 com status "aguardando análise".`,
    agora,
  );

  registrarEvento(os, {
    codigoPasso: 'A2',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'etiqueta_branca',
    valorAnterior: etAnt ?? 'SEM_ETIQUETA',
    valorNovo: 'WHITE',
    etiquetaAnterior: etAnt,
    etiquetaNova: 'WHITE',
    setorPendenteAnterior: setAnt,
    setorPendenteNovo: 'AT',
    ator,
    agora,
    observacao: 'ADM marcou etiqueta BRANCA (aguardando análise)',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * Confirma o recebimento da última notificação pendente para o setor do usuário logado (A3, C4, D1, D5).
 */
export function confirmarNotificacaoSetor(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);

  // Busca notificação pendente de confirmação
  const notifPendente = [...os.notificacoes]
    .reverse()
    .find((n) => !n.confirmadaEm);

  if (notifPendente) {
    validarPermissaoSetor(ator, [notifPendente.destinatario]);
    notifPendente.confirmadaEm = agora;
    notifPendente.confirmadaPorId = ator.usuarioId;
    notifPendente.confirmadaPorNome = ator.usuarioNome;
  }

  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  if (os.passoAtual === 'A2_BRANCA_NOTIFICA_AT') {
    validarPermissaoSetor(ator, ['AT']);
    os.passoAtual = 'A3_AT_CONFIRMOU_PREENCHER_REG034';
    os.mensagemTelaAtual = 'Preencha o REG 034 - Limpeza de equipamentos';
    registrarEvento(os, {
      codigoPasso: 'A3',
      tipo: 'CONFIRMACAO_NOTIFICACAO',
      chaveAcao: 'confirmar_a3',
      valorAnterior: 'Notificação pendente AT',
      valorNovo: 'Notificação confirmada pela AT',
      etiquetaAnterior: etAnt,
      etiquetaNova: os.etiquetaAtual,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: 'Preencha o REG 034 - Limpeza de equipamentos',
      snapshotAnterior: snap,
    });
  } else if (os.passoAtual === 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT') {
    // O5 / O6 / C4: AT confirma a notificação de reprovação -> sistema aplica etiqueta VERMELHA (auto), bloqueia item 5 e finaliza a OS!
    validarPermissaoSetor(ator, ['AT']);
    os.etiquetaAtual = 'RED';
    os.item5Liberado = false;
    os.estadoGeral = 'finalizada';
    os.setorPendente = 'NENHUM';
    os.passoAtual = 'FINALIZADA';
    os.mensagemTelaAtual = 'Item 5 do REG 016 bloqueado. Fim da OS.';

    registrarEvento(os, {
      codigoPasso: 'C4',
      tipo: 'CONFIRMACAO_NOTIFICACAO',
      chaveAcao: 'confirmar_reprovacao_orcamento',
      valorAnterior: 'YELLOW',
      valorNovo: 'RED (auto)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'RED',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'NENHUM',
      ator: {
        usuarioId: ator.usuarioId,
        usuarioNome: `${ator.usuarioNome} / Sistema`,
        perfil: ator.perfil,
      },
      agora,
      observacao: 'AT confirmou reprovação; sistema aplicou etiqueta VERMELHA (auto) e bloqueou Item 5 do REG 016.',
      snapshotAnterior: snap,
    });
  } else if (os.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX') {
    // P1 / D1: Almoxarifado confirma recebimento -> libera opções "1: peças disponíveis" ou "2: aguardando peças"
    validarPermissaoSetor(ator, ['ALMOXARIFADO']);
    os.passoAtual = 'D1_ALMOX_DECIDINDO_PECAS';
    os.mensagemTelaAtual = 'Opções disponíveis: 1) peças disponíveis ou 2) aguardando peças';
    os.perguntaPendenteAtual = 'Situação das peças no estoque';

    registrarEvento(os, {
      codigoPasso: 'D1',
      tipo: 'CONFIRMACAO_NOTIFICACAO',
      chaveAcao: 'confirmar_almox_d1',
      valorAnterior: 'Notificação pendente Almoxarifado',
      valorNovo: 'Confirmado pelo Almoxarifado',
      etiquetaAnterior: etAnt,
      etiquetaNova: os.etiquetaAtual,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ALMOXARIFADO',
      ator,
      agora,
      observacao: 'Opções: 1: peças disponíveis ou 2: aguardando peças',
      snapshotAnterior: snap,
    });
  } else if (os.passoAtual === 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT') {
    // A2 / D5: AT confirma o recebimento da mensagem de disponibilidade das peças
    validarPermissaoSetor(ator, ['AT']);
    os.passoAtual = 'D5_AT_PRONTO_PARA_FINALIZAR';
    os.mensagemTelaAtual = 'Peças recebidas pela AT. Realize o reparo, preencha o Item 5 do REG 016 e marque a etiqueta VERDE ao finalizar.';

    registrarEvento(os, {
      codigoPasso: 'D5',
      tipo: 'CONFIRMACAO_NOTIFICACAO',
      chaveAcao: 'confirmar_pecas_at_d5',
      valorAnterior: 'Notificação de peças pendente AT',
      valorNovo: 'Confirmado pela AT',
      etiquetaAnterior: etAnt,
      etiquetaNova: os.etiquetaAtual,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: 'AT confirmou recebimento das peças.',
      snapshotAnterior: snap,
    });
  } else {
    registrarEvento(os, {
      codigoPasso: os.passoAtual,
      tipo: 'CONFIRMACAO_NOTIFICACAO',
      valorAnterior: 'Notificação pendente',
      valorNovo: 'Notificação confirmada',
      etiquetaAnterior: etAnt,
      etiquetaNova: os.etiquetaAtual,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: os.setorPendente,
      ator,
      agora,
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * A4: AT preenche o REG 034 (Limpeza de equipamentos).
 */
export function atRegistrarReg034(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);

  os.reg034Preenchido = true;
  os.passoAtual = 'A4_REG034_PREENCHIDO';
  os.mensagemTelaAtual = 'Preencha os próximos passos do REG 016 - etapas da manutenção';
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'A4',
    tipo: 'PREENCHIMENTO_FORMULARIO',
    chaveAcao: 'reg034',
    valorAnterior: 'REG 034 pendente',
    valorNovo: 'REG 034 preenchido',
    etiquetaAnterior: os.etiquetaAtual,
    etiquetaNova: os.etiquetaAtual,
    setorPendenteAnterior: os.setorPendente,
    setorPendenteNovo: 'AT',
    ator,
    agora,
    observacao: 'Preencha os próximos passos do REG 016 - etapas da manutenção',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * A5: AT abre o REG 016 e marca a etiqueta VIOLETA (higienizado).
 */
export function atMarcarEtiquetaVioleta(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;

  os.etiquetaAtual = 'VIOLET';
  os.passoAtual = 'A5_VIOLETA_HIGIENIZADO';
  os.mensagemTelaAtual = 'Siga para a análise do equipamento';
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'A5',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'etiqueta_violeta',
    valorAnterior: etAnt ?? 'WHITE',
    valorNovo: 'VIOLET',
    etiquetaAnterior: etAnt,
    etiquetaNova: 'VIOLET',
    setorPendenteAnterior: os.setorPendente,
    setorPendenteNovo: 'AT',
    ator,
    agora,
    observacao: 'Siga para a análise do equipamento',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * A6: AT leva o equipamento à bancada, analisa e marca a etiqueta CINZA (análise completa).
 * Libera a opção de imprimir a etiqueta de identificação do equipamento (Seção 5.4) e faz a pergunta "Trata-se de garantia?".
 */
export function atMarcarEtiquetaCinzaAnaliseCompleta(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;

  os.etiquetaAtual = 'GRAY';
  os.passoAtual = 'A6_CINZA_ANALISE_CONCLUIDA';
  os.etiquetaIdentificacaoLiberada = true;
  os.mensagemTelaAtual = 'Análise concluída. Opção de imprimir etiqueta de identificação liberada.';
  os.perguntaPendenteAtual = 'Trata-se de garantia?';
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'A6',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'etiqueta_cinza',
    valorAnterior: etAnt ?? 'VIOLET',
    valorNovo: 'GRAY',
    etiquetaAnterior: etAnt,
    etiquetaNova: 'GRAY',
    setorPendenteAnterior: os.setorPendente,
    setorPendenteNovo: 'AT',
    ator,
    agora,
    observacao: 'Sistema abre a opção de imprimir a etiqueta de identificação e faz a pergunta "Trata-se de garantia?"',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * B1 / B2: AT responde à pergunta "Trata-se de garantia?".
 * - Se SIM (Ramificação 1): sistema aplica etiqueta LARANJA (auto), fica com Almoxarifado e notifica Almoxarifado.
 * - Se NÃO: permanece CINZA com AT e pergunta "Trata-se de envio à fábrica?".
 */
export function atResponderPerguntaGarantia(
  os: OrdemServicoFluxoState,
  trataSeGarantia: boolean,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.trataSeGarantia = trataSeGarantia;

  if (trataSeGarantia) {
    os.ramificacao = 1;
    os.etiquetaAtual = 'ORANGE';
    os.setorPendente = 'ALMOXARIFADO';
    os.passoAtual = 'D_AGUARDANDO_CONFIRMACAO_ALMOX';
    const msg = `A OS de nº ${os.numeroOs} está em garantia, siga para a separação das peças!`;
    os.mensagemTelaAtual = msg;
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(os, 'ALMOXARIFADO', msg, agora);

    registrarEvento(os, {
      codigoPasso: 'B1',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'trata_se_garantia',
      valorAnterior: 'Pendente',
      valorNovo: 'SIM (Garantia -> LARANJA auto)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'ORANGE',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ALMOXARIFADO',
      ator,
      agora,
      observacao: msg,
      snapshotAnterior: snap,
    });
  } else {
    os.etiquetaAtual = 'GRAY';
    os.setorPendente = 'AT';
    os.passoAtual = 'B2_PERGUNTA_ENVIO_FABRICA';
    os.mensagemTelaAtual = 'Trata-se de envio à fábrica?';
    os.perguntaPendenteAtual = 'Trata-se de envio à fábrica?';

    registrarEvento(os, {
      codigoPasso: 'B2',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'trata_se_garantia',
      valorAnterior: 'Pendente',
      valorNovo: 'NÃO',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'GRAY',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: 'Tela: "Trata-se de envio à fábrica?"',
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * B3 / B4: AT responde à pergunta "Trata-se de envio à fábrica?".
 * - Se NÃO (Ramificação 3): mantém CINZA, fica com ADM e notifica ADM: "OS XXX teve a análise concluída, prossiga para o orçamento".
 * - Se SIM (Ramificação 2): exige seleção do tipo de transporte, coloca OS em stand-by (CINZA) e pergunta "O equipamento foi enviado?".
 */
export function atResponderPerguntaEnvioFabrica(
  os: OrdemServicoFluxoState,
  input: {
    trataSeEnvioFabrica: boolean;
    tipoTransporte?: TipoTransporteFabrica;
  },
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.trataSeEnvioFabrica = input.trataSeEnvioFabrica;

  if (!input.trataSeEnvioFabrica) {
    // B3 — Ramificação 3: ORÇAMENTO
    os.ramificacao = 3;
    os.etiquetaAtual = 'GRAY';
    os.estadoGeral = 'em_andamento';
    os.setorPendente = 'ADM';
    os.passoAtual = 'C_AGUARDANDO_ORCAMENTO_ADM';
    const msg = `OS ${os.numeroOs} teve a análise concluída, prossiga para o orçamento`;
    os.mensagemTelaAtual = msg;
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(os, 'ADM', msg, agora);

    registrarEvento(os, {
      codigoPasso: 'B3',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'trata_se_envio_fabrica',
      valorAnterior: 'Pendente',
      valorNovo: 'NÃO (Ramificação 3 — Orçamento)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'GRAY',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ADM',
      ator,
      agora,
      observacao: msg,
      snapshotAnterior: snap,
    });
  } else {
    // B4 — Ramificação 2: ENVIO À FÁBRICA
    if (!input.tipoTransporte) {
      throw new Error('Selecione o tipo de transporte para o envio à fábrica.');
    }
    os.ramificacao = 2;
    os.tipoTransporteFabrica = input.tipoTransporte;
    os.etiquetaAtual = 'GRAY';
    os.estadoGeral = 'stand_by';
    os.setorPendente = 'AT';
    os.passoAtual = 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA';
    os.mensagemTelaAtual = 'OS em stand-by até que o envio seja providenciado.';
    os.perguntaPendenteAtual = 'O equipamento foi enviado?';

    registrarEvento(os, {
      codigoPasso: 'B4',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'trata_se_envio_fabrica',
      valorAnterior: 'Pendente',
      valorNovo: `SIM (${input.tipoTransporte})`,
      etiquetaAnterior: etAnt,
      etiquetaNova: 'GRAY',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: 'Tela: "O equipamento foi enviado?"',
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * B5 / B6: AT responde à pergunta "O equipamento foi enviado?" na Ramificação 2.
 * - Se SIM (B5): sistema aplica etiqueta MARROM (auto), sai do stand-by, fica com ADM e notifica ADM:
 *   "O equipamento da OS XXX foi enviado ao fabricante, prossiga para o orçamento".
 * - Se NÃO (B6): AT digita a justificativa e escolhe entre VERMELHA ou VERDE.
 *   Finaliza a OS sem notificação e sem abrir não conformidade automaticamente. Se VERMELHA, bloqueia item 5 do REG 016.
 */
export function atResponderEquipamentoEnviadoFabrica(
  os: OrdemServicoFluxoState,
  input: {
    foiEnviado: boolean;
    justificativaNaoEnviado?: string;
    etiquetaEscolhidaSeNaoEnviado?: 'RED' | 'GREEN';
  },
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.equipamentoEnviadoFabrica = input.foiEnviado;

  if (input.foiEnviado) {
    // B5 / F3: SIM — equipamento enviado
    os.etiquetaAtual = 'BROWN';
    os.estadoGeral = 'em_andamento';
    os.setorPendente = 'ADM';
    os.passoAtual = 'C_AGUARDANDO_ORCAMENTO_ADM';
    os.item5Liberado = true; // Etiqueta marrom por si só não bloqueia o item 5
    const msg = `O equipamento da OS ${os.numeroOs} foi enviado ao fabricante, prossiga para o orçamento`;
    os.mensagemTelaAtual = msg;
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(os, 'ADM', msg, agora);

    registrarEvento(os, {
      codigoPasso: 'B5',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'equipamento_foi_enviado',
      valorAnterior: 'GRAY (stand-by)',
      valorNovo: 'SIM -> MARROM (auto)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'BROWN',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ADM',
      ator,
      agora,
      observacao: msg,
      snapshotAnterior: snap,
    });
  } else {
    // B6 / F5 / F6: NÃO — equipamento não enviado
    const just = String(input.justificativaNaoEnviado ?? '').trim();
    if (!just) {
      throw new Error('Informe a justificativa de não ter enviado o equipamento ao fabricante.');
    }
    if (
      input.etiquetaEscolhidaSeNaoEnviado !== 'RED' &&
      input.etiquetaEscolhidaSeNaoEnviado !== 'GREEN'
    ) {
      throw new Error('Escolha a etiqueta final: VERMELHA (orçamento reprovado) ou VERDE (serviço finalizado).');
    }

    os.justificativaNaoEnviado = just;
    os.etiquetaAtual = input.etiquetaEscolhidaSeNaoEnviado;
    os.item5Liberado = input.etiquetaEscolhidaSeNaoEnviado !== 'RED';
    os.estadoGeral = 'finalizada';
    os.setorPendente = 'NENHUM';
    os.passoAtual = 'FINALIZADA';
    os.perguntaPendenteAtual = null;
    os.mensagemTelaAtual =
      input.etiquetaEscolhidaSeNaoEnviado === 'RED'
        ? 'Orçamento reprovado (Item 5 do REG 016 bloqueado). Não abre não conformidade automaticamente. Fim da OS.'
        : 'Serviço finalizado (etiqueta VERDE). Fim da OS.';

    registrarEvento(os, {
      codigoPasso: 'B6',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'equipamento_foi_enviado',
      valorAnterior: 'GRAY (stand-by)',
      valorNovo: `NÃO -> ${input.etiquetaEscolhidaSeNaoEnviado}`,
      etiquetaAnterior: etAnt,
      etiquetaNova: input.etiquetaEscolhidaSeNaoEnviado,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'NENHUM',
      ator,
      agora,
      observacao: `Justificativa: ${just}`,
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * C1 / O1: ADM recebe a notificação (B3 ou B5), entra em contato por e-mail com o cliente
 * e marca a etiqueta AMARELA ("aguardando aprovação do orçamento").
 */
export function admMarcarEtiquetaAmarelaOrcamento(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['ADM']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  // Confirma notificação do ADM se houver
  for (const n of os.notificacoes) {
    if (n.destinatario === 'ADM' && !n.confirmadaEm) {
      n.confirmadaEm = agora;
      n.confirmadaPorId = ator.usuarioId;
      n.confirmadaPorNome = ator.usuarioNome;
    }
  }

  os.etiquetaAtual = 'YELLOW';
  os.setorPendente = 'ADM';
  os.passoAtual = 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE';
  os.mensagemTelaAtual = 'Aguardando retorno do cliente por e-mail sobre o orçamento.';
  os.perguntaPendenteAtual = 'O orçamento foi aprovado?';
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'C1',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'etiqueta_amarela',
    valorAnterior: etAnt ?? 'GRAY',
    valorNovo: 'YELLOW',
    etiquetaAnterior: etAnt,
    etiquetaNova: 'YELLOW',
    setorPendenteAnterior: setAnt,
    setorPendenteNovo: 'ADM',
    ator,
    agora,
    observacao: 'ADM enviou orçamento ao cliente e marcou etiqueta AMARELA.',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * C2 / C3 (O2, O3, O5): ADM responde à pergunta "O orçamento foi aprovado?".
 * - Se SIM (C2): sistema aplica etiqueta AZUL (auto), libera item 5, fica com Almoxarifado e notifica Almoxarifado:
 *   "A OS de nº xxxxx teve o orçamento aprovado! Siga para a separação das peças".
 * - Se NÃO (C3): mantém etiqueta AMARELA até a AT confirmar, fica com AT e notifica AT:
 *   "A OS de nº xxxxx teve o orçamento reprovado!".
 */
export function admResponderOrcamentoAprovado(
  os: OrdemServicoFluxoState,
  aprovado: boolean,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['ADM']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.orcamentoAprovado = aprovado;

  if (aprovado) {
    os.etiquetaAtual = 'BLUE';
    os.item5Liberado = true;
    os.setorPendente = 'ALMOXARIFADO';
    os.passoAtual = 'D_AGUARDANDO_CONFIRMACAO_ALMOX';
    const msg = `A OS de nº ${os.numeroOs} teve o orçamento aprovado! Siga para a separação das peças`;
    os.mensagemTelaAtual = msg;
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(os, 'ALMOXARIFADO', msg, agora);

    registrarEvento(os, {
      codigoPasso: 'C2',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'orcamento_aprovado',
      valorAnterior: 'YELLOW',
      valorNovo: 'SIM -> AZUL (auto)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'BLUE',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ALMOXARIFADO',
      ator,
      agora,
      observacao: msg,
      snapshotAnterior: snap,
    });
  } else {
    os.etiquetaAtual = 'YELLOW';
    os.setorPendente = 'AT';
    os.passoAtual = 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT';
    const msg = `A OS de nº ${os.numeroOs} teve o orçamento reprovado!`;
    os.mensagemTelaAtual = msg;
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(os, 'AT', msg, agora);

    registrarEvento(os, {
      codigoPasso: 'C3',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'orcamento_aprovado',
      valorAnterior: 'YELLOW',
      valorNovo: 'NÃO (Aguardando confirmação da AT)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'YELLOW',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: msg,
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * D2 / D4 (Bloco P — Separação de Peças pelo Almoxarifado):
 * - Se "aguardando_pecas" (D2 / B1): sistema aplica etiqueta PRETA (auto), coloca OS em stand-by (guardando etiqueta anterior LARANJA ou AZUL)
 *   e exibe: "Inicie o processo de compra conforme o POP 009".
 * - Se "pecas_disponiveis" (D4 / A1): exibe "Separe as peças e leve ao local" e notifica AT sobre disponibilidade das peças.
 */
export function almoxarifadoDecidirPecas(
  os: OrdemServicoFluxoState,
  decisao: 'pecas_disponiveis' | 'aguardando_pecas',
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['ALMOXARIFADO']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.statusPecasAlmoxarifado = decisao;

  if (decisao === 'aguardando_pecas') {
    os.etiquetaAnteriorStandByPecas =
      os.etiquetaAtual && os.etiquetaAtual !== 'BLACK'
        ? os.etiquetaAtual
        : os.etiquetaAnteriorStandByPecas ?? 'ORANGE';
    os.etiquetaAtual = 'BLACK';
    os.estadoGeral = 'stand_by';
    os.setorPendente = 'ALMOXARIFADO';
    os.passoAtual = 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS';
    os.mensagemTelaAtual = 'Inicie o processo de compra conforme o POP 009';
    os.perguntaPendenteAtual = null;

    registrarEvento(os, {
      codigoPasso: 'D2',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'decisao_pecas',
      valorAnterior: etAnt ?? 'ORANGE',
      valorNovo: 'aguardando_pecas -> PRETA (auto / stand-by)',
      etiquetaAnterior: etAnt,
      etiquetaNova: 'BLACK',
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'ALMOXARIFADO',
      ator,
      agora,
      observacao: 'Inicie o processo de compra conforme o POP 009',
      snapshotAnterior: snap,
    });
  } else {
    // Se estava em PRETA (D3 + D4), restaura a etiqueta anterior (LARANJA ou AZUL — Seção 9 Item 3)
    if (os.etiquetaAtual === 'BLACK' && os.etiquetaAnteriorStandByPecas) {
      os.etiquetaAtual = os.etiquetaAnteriorStandByPecas;
    }
    os.estadoGeral = 'em_andamento';
    os.setorPendente = 'AT';
    os.passoAtual = 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT';
    os.mensagemTelaAtual = 'Separe as peças e leve ao local';
    os.perguntaPendenteAtual = null;

    adicionarNotificacaoSetor(
      os,
      'AT',
      `Notificação de disponibilidade das peças para a OS ${os.numeroOs}.`,
      agora,
    );

    registrarEvento(os, {
      codigoPasso: 'D4',
      tipo: 'RESPOSTA_PERGUNTA',
      chaveAcao: 'decisao_pecas',
      valorAnterior: etAnt ?? 'ORANGE',
      valorNovo: `pecas_disponiveis (${os.etiquetaAtual})`,
      etiquetaAnterior: etAnt,
      etiquetaNova: os.etiquetaAtual,
      setorPendenteAnterior: setAnt,
      setorPendenteNovo: 'AT',
      ator,
      agora,
      observacao: 'Separe as peças e leve ao local',
      snapshotAnterior: snap,
    });
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * D3 (Isolado): A peça chega ao estoque e o Almoxarifado retoma a OS que estava em PRETA (stand-by).
 * A etiqueta PRETA sai e a OS volta à etiqueta anterior (LARANJA ou AZUL — Seção 9 Item 3).
 */
export function almoxarifadoRetomarOsDeAguardandoPecas(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['ALMOXARIFADO']);
  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const restaurada = os.etiquetaAnteriorStandByPecas ?? (os.ramificacao === 1 ? 'ORANGE' : 'BLUE');

  os.etiquetaAtual = restaurada;
  os.estadoGeral = 'em_andamento';
  os.setorPendente = 'ALMOXARIFADO';
  os.passoAtual = 'D1_ALMOX_DECIDINDO_PECAS';
  os.mensagemTelaAtual = 'Peças chegaram ao estoque. Marque "peças disponíveis" para seguir.';
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'D3',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'retomar_pecas_d3',
    valorAnterior: 'BLACK',
    valorNovo: restaurada,
    etiquetaAnterior: etAnt,
    etiquetaNova: restaurada,
    setorPendenteAnterior: 'ALMOXARIFADO',
    setorPendenteNovo: 'ALMOXARIFADO',
    ator,
    agora,
    observacao: `OS retomada do stand-by; voltou para a etiqueta anterior (${restaurada}).`,
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * Registra o preenchimento do Item 5 do REG 016 (REG 009 para Cardios ou REG 035 para TEB/OLIDEF).
 * Respeita estritamente a regra de bloqueio (Seção 3.2).
 */
export function atPreencherItem5Reg016(
  os: OrdemServicoFluxoState,
  marcaSelecionada: MarcaEquipamentoOS,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  if (!isItem5Reg016Liberado(os.etiquetaAtual, os.orcamentoAprovado)) {
    throw new Error(
      'O Item 5 do REG 016 está bloqueado porque a OS possui etiqueta VERMELHA (orçamento não aprovado).',
    );
  }

  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  os.identificacao.marca = marcaSelecionada;
  os.item5FormularioTipo = determinarFormularioItem5PorMarca(marcaSelecionada);
  os.item5Preenchido = true;
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'ITEM5_REG016',
    tipo: 'PREENCHIMENTO_FORMULARIO',
    chaveAcao: 'item5_reg016',
    valorAnterior: 'Item 5 pendente',
    valorNovo: `${os.item5FormularioTipo} (${marcaSelecionada}) preenchido`,
    etiquetaAnterior: os.etiquetaAtual,
    etiquetaNova: os.etiquetaAtual,
    setorPendenteAnterior: os.setorPendente,
    setorPendenteNovo: os.setorPendente,
    ator,
    agora,
    observacao: `Item 5 do REG 016 preenchido para a marca ${marcaSelecionada} (${os.item5FormularioTipo}).`,
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * D6 / A3: AT finaliza o trabalho e marca a etiqueta VERDE (serviço finalizado).
 * Padrão Seção 9 Item 4: O Item 5 do REG 016 (REG 009 ou 035) é obrigatório para marcar VERDE, quando liberado!
 */
export function atFinalizarServicoComEtiquetaVerde(
  os: OrdemServicoFluxoState,
  ator: AtorAcaoOS,
  opcoes?: { exigirItem5QuandoLiberado?: boolean },
): OrdemServicoFluxoState {
  validarPermissaoSetor(ator, ['AT']);
  const exigirItem5 = opcoes?.exigirItem5QuandoLiberado ?? true;
  if (exigirItem5 && os.item5Liberado && !os.item5Preenchido) {
    throw new Error(
      `Para marcar a etiqueta VERDE (serviço finalizado), é obrigatório concluir antes o Item 5 do REG 016 (${os.item5FormularioTipo ?? 'REG 009 / REG 035'}).`,
    );
  }

  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const etAnt = os.etiquetaAtual;
  const setAnt = os.setorPendente;

  os.etiquetaAtual = 'GREEN';
  os.estadoGeral = 'finalizada';
  os.setorPendente = 'NENHUM';
  os.passoAtual = 'FINALIZADA';
  os.mensagemTelaAtual = 'Fim da OS.';
  os.perguntaPendenteAtual = null;
  os.atualizadaEm = agora;

  registrarEvento(os, {
    codigoPasso: 'D6',
    tipo: 'MARCACAO_ETIQUETA',
    chaveAcao: 'etiqueta_verde',
    valorAnterior: etAnt ?? 'ORANGE',
    valorNovo: 'GREEN',
    etiquetaAnterior: etAnt,
    etiquetaNova: 'GREEN',
    setorPendenteAnterior: setAnt,
    setorPendenteNovo: 'NENHUM',
    ator,
    agora,
    observacao: 'Serviço finalizado pela AT (etiqueta VERDE). Fim da OS.',
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * E3 / Seção 7.1 — Correção de marcação ou resposta:
 * - Somente o dono do login que fez a marcação ou a resposta pode corrigi-la. Nenhum outro usuário (nem de outro setor) corrige no lugar dele.
 * - O sistema recalcula a etiqueta e o setor pendente, avisa o setor atual se a OS já avançou e grava no histórico (valor anterior, valor novo, usuário, data e hora).
 */
export function corrigirMarcacaoOuRespostaPeloDono(
  os: OrdemServicoFluxoState,
  input: {
    eventoId: string;
    observacaoCorrecao: string;
    executarNovaAcao: (osRestaurada: OrdemServicoFluxoState) => void;
  },
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  const eventoAlvo = os.historico.find((e) => e.id === input.eventoId);
  if (!eventoAlvo) {
    throw new Error('Evento não encontrado no histórico da OS.');
  }

  // Regra estrita 7.1: SOMENTE o dono do login que fez a marcação/resposta pode corrigi-la!
  if (eventoAlvo.usuarioId !== ator.usuarioId) {
    throw new Error(
      `Apenas o próprio usuário que realizou este registro (${eventoAlvo.usuarioNome}) pode corrigi-lo. Se o colaborador estiver indisponível, utilize o cancelamento e reabertura da OS.`,
    );
  }

  const agora = ator.dataHora ?? new Date();
  const valorAntesDaCorrecao = `${os.etiquetaAtual ?? 'SEM_ETIQUETA'} (${os.passoAtual})`;
  const setorQueEstavaComAcao = os.setorPendente;

  // Restaura o snapshot imediatamente anterior ao evento corrigido (mantendo todo o histórico intacto!)
  if (eventoAlvo.snapshotAnterior) {
    const historicoPreservado = [...os.historico];
    const notificacoesPreservadas = [...os.notificacoes];
    Object.assign(os, structuredClone(eventoAlvo.snapshotAnterior));
    os.historico = historicoPreservado;
    os.notificacoes = notificacoesPreservadas;
  }

  // Executa a nova resposta/marcação do próprio dono
  input.executarNovaAcao(os);

  // Grava o evento explícito de CORRECAO_MARCACAO no histórico
  registrarEvento(os, {
    codigoPasso: 'E3',
    tipo: 'CORRECAO_MARCACAO',
    chaveAcao: eventoAlvo.chaveAcao,
    valorAnterior: `${eventoAlvo.valorNovo} [Estado: ${valorAntesDaCorrecao}]`,
    valorNovo: `${os.etiquetaAtual ?? 'SEM_ETIQUETA'} (${os.passoAtual})`,
    etiquetaAnterior: eventoAlvo.etiquetaNova,
    etiquetaNova: os.etiquetaAtual,
    setorPendenteAnterior: setorQueEstavaComAcao,
    setorPendenteNovo: os.setorPendente,
    ator,
    agora,
    observacao: input.observacaoCorrecao || 'Correção de marcação/resposta realizada pelo autor.',
  });

  // Se o setor pendente atual for válido, notifica sobre a correção
  if (os.setorPendente !== 'NENHUM') {
    adicionarNotificacaoSetor(
      os,
      os.setorPendente,
      `A OS de nº ${os.numeroOs} teve uma marcação/resposta corrigida por ${ator.usuarioNome}. Novo status: ${os.etiquetaAtual ?? 'Inicial'}.`,
      agora,
    );
  }

  os.atualizadaEm = agora;
  return os;
}

/**
 * E1 / Seção 7.3 — Cancelamento da OS:
 * - Apenas ADM e AT podem cancelar (além de Diretor/Qualidade se necessário, mas Almoxarifado NÃO pode).
 * - Exige motivo.
 * - "Cancelada" é um estado geral da OS, não uma etiqueta.
 * - Guarda o estado anterior para reabertura.
 */
export function cancelarOs(
  os: OrdemServicoFluxoState,
  motivo: string,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  if (ator.perfil === 'estoquista') {
    throw new Error('Apenas os perfis Administrativo (ADM) e Assistência Técnica (AT) podem cancelar uma OS.');
  }
  const motivoLimpo = String(motivo ?? '').trim();
  if (!motivoLimpo) {
    throw new Error('O cancelamento da OS exige um motivo.');
  }
  if (os.estadoGeral === 'cancelada') {
    throw new Error('Esta OS já está cancelada.');
  }

  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const setAnt = os.setorPendente;

  os.estadoAntesCancelamento = {
    etiquetaAtual: os.etiquetaAtual,
    estadoGeral: os.estadoGeral,
    setorPendente: os.setorPendente,
    passoAtual: os.passoAtual,
    mensagemTelaAtual: os.mensagemTelaAtual,
    perguntaPendenteAtual: os.perguntaPendenteAtual,
  };

  os.estadoGeral = 'cancelada';
  os.setorPendente = 'NENHUM';
  os.passoAtual = 'CANCELADA';
  os.mensagemTelaAtual = `OS Cancelada. Motivo: ${motivoLimpo}`;
  os.atualizadaEm = agora;

  if (setAnt !== 'NENHUM') {
    adicionarNotificacaoSetor(
      os,
      setAnt,
      `A OS de nº ${os.numeroOs} foi cancelada por ${ator.usuarioNome}. Motivo: ${motivoLimpo}`,
      agora,
    );
  }

  registrarEvento(os, {
    codigoPasso: 'E1',
    tipo: 'CANCELAMENTO',
    valorAnterior: snap.estadoGeral,
    valorNovo: 'cancelada',
    etiquetaAnterior: os.etiquetaAtual,
    etiquetaNova: os.etiquetaAtual,
    setorPendenteAnterior: setAnt,
    setorPendenteNovo: 'NENHUM',
    ator,
    agora,
    observacao: motivoLimpo,
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * E2 / Seção 7.3 — Reabertura da OS:
 * - Apenas ADM e AT podem reabrir uma OS.
 * - Exige motivo e restaura o estado anterior ao cancelamento (etiqueta e setor com a ação pendente).
 */
export function reabrirOs(
  os: OrdemServicoFluxoState,
  motivo: string,
  ator: AtorAcaoOS,
): OrdemServicoFluxoState {
  if (ator.perfil === 'estoquista') {
    throw new Error('Apenas os perfis Administrativo (ADM) e Assistência Técnica (AT) podem reabrir uma OS.');
  }
  const motivoLimpo = String(motivo ?? '').trim();
  if (!motivoLimpo) {
    throw new Error('A reabertura da OS exige um motivo.');
  }
  if (os.estadoGeral !== 'cancelada' || !os.estadoAntesCancelamento) {
    throw new Error('Apenas uma OS cancelada pode ser reaberta.');
  }

  const agora = ator.dataHora ?? new Date();
  const snap = clonarSnapshotSemListas(os);
  const ant = os.estadoAntesCancelamento;

  os.etiquetaAtual = ant.etiquetaAtual;
  os.estadoGeral = ant.estadoGeral;
  os.setorPendente = ant.setorPendente;
  os.passoAtual = ant.passoAtual;
  os.mensagemTelaAtual = ant.mensagemTelaAtual;
  os.perguntaPendenteAtual = ant.perguntaPendenteAtual;
  os.estadoAntesCancelamento = null;
  os.atualizadaEm = agora;

  if (os.setorPendente !== 'NENHUM') {
    adicionarNotificacaoSetor(
      os,
      os.setorPendente,
      `A OS de nº ${os.numeroOs} foi reaberta por ${ator.usuarioNome} e voltou para o seu setor. Motivo: ${motivoLimpo}`,
      agora,
    );
  }

  registrarEvento(os, {
    codigoPasso: 'E2',
    tipo: 'REABERTURA',
    valorAnterior: 'cancelada',
    valorNovo: `${os.estadoGeral} (${os.etiquetaAtual ?? 'SEM_ETIQUETA'})`,
    etiquetaAnterior: os.etiquetaAtual,
    etiquetaNova: os.etiquetaAtual,
    setorPendenteAnterior: 'NENHUM',
    setorPendenteNovo: os.setorPendente,
    ator,
    agora,
    observacao: motivoLimpo,
    snapshotAnterior: snap,
  });

  return os;
}

/**
 * E4 / Seção 7.2 — Verificação de Lembrete de 7 Dias Corridos sem Confirmação:
 * - Se passarem 7 dias corridos (contados da entrega da notificação) sem confirmação e a OS NÃO estiver cancelada,
 *   envia lembrete ao setor responsável pela ação: "A OS de nº xxxxx aguarda ação do setor há 7 dias"
 *   respeitando o horário de entrega (07:30h–19:30h seg-sex).
 * - Repete a cada 7 dias até a confirmação (Seção 9 Item 1).
 */
export function verificarEGerarLembretes7Dias(
  os: OrdemServicoFluxoState,
  agora: Date = new Date(),
): NotificacaoSetorOS[] {
  if (os.estadoGeral === 'cancelada' || os.estadoGeral === 'finalizada') {
    return [];
  }

  const novosLembretes: NotificacaoSetorOS[] = [];

  for (const notif of os.notificacoes) {
    if (notif.confirmadaEm) continue;

    const baseData = notif.lembreteEnviadoEm ?? notif.entregueEm;
    const diasDecorridos = diffDiasDatas(baseData, agora);

    if (diasDecorridos >= 7) {
      notif.lembreteEnviadoEm = agora;
      notif.quantidadeLembretes += 1;

      const msg = `A OS de nº ${os.numeroOs} aguarda ação do setor há ${diasDecorridos * notif.quantidadeLembretes} dias`;
      const lembrete = adicionarNotificacaoSetor(os, notif.destinatario, msg, agora);
      lembrete.confirmadaEm = notif.confirmadaEm; // informativo de lembrete
      novosLembretes.push(lembrete);

      registrarEvento(os, {
        codigoPasso: 'E4',
        tipo: 'LEMBRETE_7_DIAS',
        valorAnterior: 'Sem confirmação há 7 dias',
        valorNovo: msg,
        etiquetaAnterior: os.etiquetaAtual,
        etiquetaNova: os.etiquetaAtual,
        setorPendenteAnterior: os.setorPendente,
        setorPendenteNovo: os.setorPendente,
        ator: {
          usuarioId: 'sistema',
          usuarioNome: 'Sistema Automático',
          perfil: 'sistema',
        },
        agora,
        observacao: msg,
      });
    }
  }

  return novosLembretes;
}

// ============================================================================
// Contexto Unificado e Agregador Compatível com FormRecord (Fase 5 + v2)
// ============================================================================

export interface ServiceOrderContext {
  chave: string;
  numeroOs: string;
  cliente: string;
  equipamento: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  acessorios: string;
  relatoCliente: string;
  diagnosticoTecnico: string;
  emGarantia: boolean;
  enviadoFabrica: boolean;
  tipoTransporte?: string;
  tagColor: TagColor;
  osStatus: OSStatus;
  estadoGeral?: EstadoGeralOS;
  setorPendente?: SetorPendenteOS;
  item5Liberado?: boolean;
  etiquetaIdentificacaoLiberada?: boolean;
  ultimaAtualizacao: string;
  etapasConcluidas: {
    reg022Recebimento: boolean;
    reg034Limpeza: boolean;
    reg016Etapas: boolean;
    reg035Manutencao: boolean;
    reg030Calibracao: boolean;
  };
}

function inferirTagDoReg016(dados: Record<string, unknown>): TagColor {
  if (dados.etiqueta_atual && typeof dados.etiqueta_atual === 'string') {
    const c = dados.etiqueta_atual as TagColor;
    if (TAG_SPECS[c]) return c;
  }
  if (dados.liberado_qualidade === 'C' || dados.etiqueta_verde_sem_defeito === 'C') return 'GREEN';
  if (dados.orcamento_reprovado === 'C') return 'RED';
  if (dados.falta_itens_estoque === 'C') return 'BLACK';
  if (dados.orcamento_aprovado === 'C') return 'BLUE';
  if (Boolean(dados.enviado_fabrica)) return 'BROWN';
  if (dados.orcamento_enviado === 'C') return 'YELLOW';
  if (dados.etiqueta_laranja === 'C') return 'ORANGE';
  if (dados.etiqueta_cinza === 'C') return 'GRAY';
  if (dados.etiqueta_violeta === 'C') return 'VIOLET';
  return 'WHITE';
}

export function aggregateServiceOrders(records: FormRecord[]): ServiceOrderContext[] {
  const map = new Map<string, ServiceOrderContext>();

  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const r of sorted) {
    const d = r.dados ?? {};
    const numOs = String(d.numero_os ?? '').trim();
    const numSerie = String(d.numero_serie ?? '').trim();
    const equip = String(d.equipamento ?? '').trim();

    if (!numOs && !numSerie) continue;

    let chave = numOs ? `OS:${numOs.toUpperCase()}` : `SN:${numSerie.toUpperCase()}`;
    if (numOs && numSerie) {
      const snKey = `SN:${numSerie.toUpperCase()}`;
      if (map.has(snKey) && !map.has(chave)) {
        const anterior = map.get(snKey)!;
        map.delete(snKey);
        anterior.chave = chave;
        anterior.numeroOs = numOs;
        map.set(chave, anterior);
      }
    } else if (!numOs && numSerie) {
      for (const [k, v] of map.entries()) {
        if (v.numeroSerie.toUpperCase() === numSerie.toUpperCase()) {
          chave = k;
          break;
        }
      }
    }

    const atual: ServiceOrderContext = map.get(chave) ?? {
      chave,
      numeroOs: numOs || 'S/N',
      cliente: '',
      equipamento: '',
      marca: '',
      modelo: '',
      numeroSerie: numSerie,
      acessorios: '',
      relatoCliente: '',
      diagnosticoTecnico: '',
      emGarantia: false,
      enviadoFabrica: false,
      tagColor: 'WHITE',
      osStatus: 'AGUARDANDO_ANALISE',
      estadoGeral: 'em_andamento',
      setorPendente: 'AT',
      item5Liberado: true,
      etiquetaIdentificacaoLiberada: false,
      ultimaAtualizacao: r.dataRef,
      etapasConcluidas: {
        reg022Recebimento: false,
        reg034Limpeza: false,
        reg016Etapas: false,
        reg035Manutencao: false,
        reg030Calibracao: false,
      },
    };

    if (numOs) atual.numeroOs = numOs;
    if (numSerie) atual.numeroSerie = numSerie;
    if (d.cliente) atual.cliente = String(d.cliente);
    if (d.equipamento) atual.equipamento = String(d.equipamento);
    if (d.marca) atual.marca = String(d.marca);
    if (d.modelo) atual.modelo = String(d.modelo);
    if (d.marca_modelo && !atual.modelo) atual.modelo = String(d.marca_modelo);
    if (d.acessorios) atual.acessorios = String(d.acessorios);
    if (d.relato_cliente) atual.relatoCliente = String(d.relato_cliente);
    if (d.problema_cliente) atual.relatoCliente = String(d.problema_cliente);
    if (d.problema_tecnico) atual.diagnosticoTecnico = String(d.problema_tecnico);
    if (r.dataRef >= atual.ultimaAtualizacao) atual.ultimaAtualizacao = r.dataRef;

    switch (r.tipo) {
      case 'inspecao-recebimento':
        atual.etapasConcluidas.reg022Recebimento = true;
        break;
      case 'limpeza-equipamento':
        atual.etapasConcluidas.reg034Limpeza = true;
        if (atual.tagColor === 'WHITE') {
          atual.tagColor = 'VIOLET';
          atual.osStatus = TAG_SPECS.VIOLET.status;
        }
        break;
      case 'checklist-manutencao':
        atual.etapasConcluidas.reg035Manutencao = true;
        if (d.tipo_manutencao === 'garantia') {
          atual.emGarantia = true;
          atual.tagColor = 'ORANGE';
          atual.osStatus = TAG_SPECS.ORANGE.status;
        } else if (atual.tagColor === 'WHITE' || atual.tagColor === 'VIOLET') {
          atual.tagColor = 'GRAY';
          atual.osStatus = TAG_SPECS.GRAY.status;
        }
        break;
      case 'etapas-manutencao': {
        atual.etapasConcluidas.reg016Etapas = true;
        const cor = inferirTagDoReg016(d);
        atual.tagColor = cor;
        atual.osStatus = TAG_SPECS[cor].status;
        atual.enviadoFabrica = Boolean(d.enviado_fabrica);
        if (d.tipo_transporte) atual.tipoTransporte = String(d.tipo_transporte);
        if (d.etiqueta_laranja === 'C' || cor === 'ORANGE') atual.emGarantia = true;
        if (
          d.item5_preenchido === true ||
          d.item5_marca ||
          d.cardios_teste_funcional ||
          d.ol_eletrica ||
          d.teb_eletrica
        ) {
          atual.etapasConcluidas.reg035Manutencao = true;
        }
        atual.item5Liberado = isItem5Reg016Liberado(cor);
        if (cor === 'GRAY' || cor === 'ORANGE' || cor === 'BROWN' || cor === 'YELLOW' || cor === 'BLUE' || cor === 'GREEN') {
          atual.etiquetaIdentificacaoLiberada = true;
        }
        break;
      }
      case 'verificacao-calibracao':
        atual.etapasConcluidas.reg030Calibracao = true;
        if (d.resultado_final === 'conforme' || d.resultado_final === 'ajustado_aprovado') {
          atual.tagColor = 'GREEN';
          atual.osStatus = TAG_SPECS.GREEN.status;
        }
        break;
      default:
        break;
    }

    if (!atual.equipamento && equip) atual.equipamento = equip;
    map.set(chave, atual);
  }

  return [...map.values()].sort((a, b) => b.ultimaAtualizacao.localeCompare(a.ultimaAtualizacao));
}

export function hydrateFormFieldsFromOs(
  formTipo: FormTipo,
  ctx: ServiceOrderContext,
): Record<string, string | boolean> {
  const base: Record<string, string | boolean> = {};
  if (ctx.numeroOs && ctx.numeroOs !== 'S/N') base.numero_os = ctx.numeroOs;
  if (ctx.cliente) base.cliente = ctx.cliente;
  if (ctx.equipamento) base.equipamento = ctx.equipamento;
  if (ctx.marca) base.marca = ctx.marca;
  if (ctx.modelo) base.modelo = ctx.modelo;
  if (ctx.marca || ctx.modelo) {
    base.marca_modelo = [ctx.marca, ctx.modelo].filter(Boolean).join(' / ');
  }
  if (ctx.numeroSerie) base.numero_serie = ctx.numeroSerie;
  if (ctx.acessorios) base.acessorios = ctx.acessorios;
  if (ctx.relatoCliente) {
    base.relato_cliente = ctx.relatoCliente;
    base.problema_cliente = ctx.relatoCliente;
  }
  if (ctx.diagnosticoTecnico) {
    base.problema_tecnico = ctx.diagnosticoTecnico;
  }

  if (formTipo === 'etapas-manutencao') {
    if (ctx.marca) {
      const m = ctx.marca.toLowerCase();
      if (m.includes('cardios')) base.item5_marca = 'Cardios';
      else if (m.includes('teb')) base.item5_marca = 'TEB';
      else if (m.includes('olidef')) base.item5_marca = 'OLIDEF';
    }
    if (ctx.etapasConcluidas.reg034Limpeza) base.etiqueta_violeta = 'C';
    if (ctx.etapasConcluidas.reg035Manutencao) base.etiqueta_cinza = 'C';
    if (ctx.emGarantia) base.etiqueta_laranja = 'C';
    if (ctx.etapasConcluidas.reg030Calibracao) base.etiqueta_calibracao = 'C';
  }

  return base;
}
