import type { Perfil } from '@/core/domain/enums/user';
import type { FormRecord } from '@/core/domain/entities/operacional';
import {
  RESPONSAVEIS_PADRAO_AT,
  avaliarConformidade,
  getFormDef,
  sanitizarDados,
  verificarBloqueioItem5Reg016,
  type FormTipo,
  type StatusRegistro,
} from './definitions';
import {
  TAG_SPECS,
  hydrateFormFieldsFromOs,
  normalizarNumeroOs,
  type CodigoPassoFluxoOS,
  type OSStatus,
  type OrdemServicoFluxoState,
  type ServiceOrderContext,
  type TagColor,
} from './os-workflow';

const TAG_TO_OS_STATUS: Record<TagColor, OSStatus> = {
  WHITE: 'AGUARDANDO_ANALISE',
  VIOLET: 'HIGIENIZADO',
  GRAY: 'ANALISE_CONCLUIDA',
  ORANGE: 'EM_GARANTIA',
  BROWN: 'ENVIADO_FABRICA',
  YELLOW: 'AGUARDANDO_APROVACAO_ORCAMENTO',
  BLUE: 'ORCAMENTO_APROVADO',
  BLACK: 'AGUARDANDO_PECAS',
  RED: 'ORCAMENTO_RECUSADO',
  GREEN: 'SERVICO_FINALIZADO',
};

/**
 * Sincronização bidirecional pura entre o Fluxo de OS (`os_fluxo` / Etiquetas)
 * e o formulário oficial REG-016 (`etapas-manutencao`) + Item 5 (REG-009 / REG-035).
 *
 * Objetivo operacional: eliminar retrabalho ("dois trabalhos") mantendo
 * rastreabilidade e governança RDC 665/2022 em tempo real.
 */

const PASSO_RANK: Record<CodigoPassoFluxoOS, number> = {
  CANCELADA: 0,
  A1_CRIADA_NO_REG022: 1,
  A2_BRANCA_NOTIFICA_AT: 2,
  A3_AT_CONFIRMOU_PREENCHER_REG034: 3,
  A4_REG034_PREENCHIDO: 4,
  A5_VIOLETA_HIGIENIZADO: 5,
  A6_CINZA_ANALISE_CONCLUIDA: 6,
  B2_PERGUNTA_ENVIO_FABRICA: 7,
  B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA: 8,
  C_AGUARDANDO_ORCAMENTO_ADM: 9,
  C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE: 10,
  C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT: 11,
  D_AGUARDANDO_CONFIRMACAO_ALMOX: 12,
  D1_ALMOX_DECIDINDO_PECAS: 13,
  D2_PRETA_STAND_BY_AGUARDANDO_PECAS: 14,
  D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT: 15,
  D5_AT_PRONTO_PARA_FINALIZAR: 16,
  FINALIZADA: 17,
};

export type MarcaItem5Reg016 = 'Cardios' | 'TEB' | 'OLIDEF';

export function normalizarMarcaParaItem5(marca?: string | null): MarcaItem5Reg016 | '' {
  const m = String(marca ?? '').trim().toLowerCase();
  if (!m) return '';
  if (m.includes('cardios')) return 'Cardios';
  if (m.includes('teb')) return 'TEB';
  if (m.includes('olidef')) return 'OLIDEF';
  return '';
}

function paraDataIsoCurta(valor?: Date | string | null): string {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor.slice(0, 10);
  }
  const dt = new Date(valor);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function resolverPassoEEtiquetaEfetivos(os: OrdemServicoFluxoState): {
  passoEfetivo: CodigoPassoFluxoOS;
  etiquetaEfetiva: TagColor | null;
  rank: number;
} {
  const passoEfetivo =
    os.passoAtual === 'CANCELADA'
      ? (os.estadoAntesCancelamento?.passoAtual ?? 'CANCELADA')
      : os.passoAtual;
  const etiquetaEfetiva =
    os.passoAtual === 'CANCELADA'
      ? (os.estadoAntesCancelamento?.etiquetaAtual ?? os.etiquetaAtual)
      : os.etiquetaAtual;
  return {
    passoEfetivo,
    etiquetaEfetiva,
    rank: PASSO_RANK[passoEfetivo] ?? 0,
  };
}

function extrairNomeTecnicoResponsavel(
  os: OrdemServicoFluxoState,
  dadosExistentes?: Record<string, unknown> | null,
): string {
  const assinaturaAtual =
    typeof dadosExistentes?.assinatura_tecnico === 'string'
      ? dadosExistentes.assinatura_tecnico.trim()
      : '';
  if (assinaturaAtual) return assinaturaAtual;

  const eventosAt = [...(os.historico ?? [])]
    .reverse()
    .find(
      (ev) =>
        ev.usuarioPerfil === 'tecnico' ||
        ev.codigoPasso === 'D6' ||
        ev.codigoPasso === 'D7' ||
        ev.codigoPasso === 'A5' ||
        ev.codigoPasso === 'A6',
    );
  if (eventosAt?.usuarioNome) return eventosAt.usuarioNome;
  return os.criadaPorNome || 'Assistência Técnica (LinkMed)';
}

function copiarCamposItem5DeChecklist(
  reg035Dados: Record<string, unknown>,
  reg035Subtipo?: string | null,
  marcaFallback?: MarcaItem5Reg016 | '',
): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  const sub = String(reg035Subtipo ?? '').toLowerCase();

  let marca: MarcaItem5Reg016 | '' = '';
  let prefixoOrigem = '';
  let prefixoDestino = '';
  let campoLaudo = '';

  if (sub === 'cardios' || marcaFallback === 'Cardios') {
    marca = 'Cardios';
    prefixoOrigem = 'cardios_';
    prefixoDestino = 'item5_cardios_';
    campoLaudo = 'item5_cardios_laudo';
  } else if (sub === 'teb' || marcaFallback === 'TEB') {
    marca = 'TEB';
    prefixoOrigem = 'teb_';
    prefixoDestino = 'item5_teb_';
    campoLaudo = 'item5_teb_laudo';
  } else if (sub === 'olidef' || marcaFallback === 'OLIDEF') {
    marca = 'OLIDEF';
    prefixoOrigem = 'ol_';
    prefixoDestino = 'item5_olidef_';
    campoLaudo = 'item5_olidef_laudo';
  }

  if (!marca) return resultado;

  resultado.item5_marca = marca;
  for (const [k, v] of Object.entries(reg035Dados)) {
    if (k.startsWith(prefixoOrigem) && (v === 'C' || v === 'NC' || v === 'NA')) {
      const sufixo = k.slice(prefixoOrigem.length);
      resultado[`${prefixoDestino}${sufixo}`] = v;
    }
  }

  const problemaTecnico = String(reg035Dados.problema_tecnico ?? '').trim();
  const problemaCliente = String(reg035Dados.problema_cliente ?? '').trim();
  const laudo = problemaTecnico || problemaCliente;
  if (laudo && campoLaudo) {
    resultado[campoLaudo] = laudo;
  }

  return resultado;
}

export interface Reg016SyncInput {
  os: OrdemServicoFluxoState;
  dadosExistentes?: Record<string, unknown> | null;
  reg035Dados?: Record<string, unknown> | null;
  reg035Subtipo?: string | null;
  reg022Dados?: Record<string, unknown> | null;
  reg030Dados?: Record<string, unknown> | null;
}

/**
 * Indica se o estado atual da OS já iniciou oficialmente o ciclo do REG-016
 * (a partir da Etiqueta BRANCA ou de qualquer transição posterior).
 */
export function osDeveSincronizarReg016(os: OrdemServicoFluxoState): boolean {
  return (
    os.reg016Iniciado ||
    os.etiquetaAtual !== null ||
    os.passoAtual !== 'A1_CRIADA_NO_REG022'
  );
}

/**
 * Deriva o payload completo do REG-016 (`etapas-manutencao`) a partir do estado
 * oficial da OS (`OrdemServicoFluxoState`), preservando campos manuais existentes
 * que não conflitem com as transições oficiais do fluxo.
 */
export function buildReg016DadosFromOsFluxo(input: Reg016SyncInput): {
  dados: Record<string, unknown>;
  status: StatusRegistro;
  dataRef: string;
} {
  const { os, dadosExistentes, reg035Dados, reg035Subtipo, reg022Dados, reg030Dados } = input;
  const reg016Def = getFormDef('etapas-manutencao')!;
  const prev = { ...(dadosExistentes ?? {}) };

  const { passoEfetivo, etiquetaEfetiva, rank } = resolverPassoEEtiquetaEfetivos(os);
  const aprovouOuReprovou = os.orcamentoAprovado !== null;
  const reprovado = os.orcamentoAprovado === false || etiquetaEfetiva === 'RED';
  const finalizadoVerde =
    (passoEfetivo === 'FINALIZADA' || etiquetaEfetiva === 'GREEN') && !reprovado;

  const dataAbertura =
    paraDataIsoCurta(typeof prev.data_abertura === 'string' ? prev.data_abertura : null) ||
    paraDataIsoCurta(typeof reg022Dados?.data_recebimento === 'string' ? reg022Dados.data_recebimento : null) ||
    paraDataIsoCurta(typeof reg022Dados?.data_entrada === 'string' ? reg022Dados.data_entrada : null) ||
    paraDataIsoCurta(os.criadaEm) ||
    paraDataIsoCurta(os.atualizadaEm) ||
    new Date().toISOString().slice(0, 10);

  const proximo: Record<string, unknown> = {
    ...prev,
    // 1. Identificação (herdada do REG-022 / fluxo)
    cliente: os.identificacao.cliente || prev.cliente || '',
    data_abertura: dataAbertura,
    numero_os: os.numeroOs,
    equipamento: os.identificacao.equipamento || prev.equipamento || '',
    marca: os.identificacao.marca || prev.marca || '',
    modelo: os.identificacao.modelo || prev.modelo || '',
    numero_serie: os.identificacao.numeroSerie || prev.numero_serie || '',
  };

  // 2. Recebimento e Verificação antes da manutenção
  if (os.reg022Preenchido) {
    proximo.conferencia_pecas = 'C';
  }
  if (os.reg016Iniciado || rank >= PASSO_RANK.A2_BRANCA_NOTIFICA_AT || etiquetaEfetiva === 'WHITE') {
    proximo.etiqueta_branca_adm = 'C';
  }
  if (
    os.reg034Preenchido ||
    rank >= PASSO_RANK.A5_VIOLETA_HIGIENIZADO ||
    etiquetaEfetiva === 'VIOLET'
  ) {
    proximo.etiqueta_violeta = 'C';
  } else if (!dadosExistentes?.etiqueta_violeta) {
    delete proximo.etiqueta_violeta;
  }

  if (rank >= PASSO_RANK.A6_CINZA_ANALISE_CONCLUIDA || os.etiquetaIdentificacaoLiberada) {
    proximo.etiqueta_cinza = 'C';
  } else if (!dadosExistentes?.etiqueta_cinza) {
    delete proximo.etiqueta_cinza;
  }

  if (
    os.trataSeGarantia === true &&
    (rank >= PASSO_RANK.D_AGUARDANDO_CONFIRMACAO_ALMOX ||
      etiquetaEfetiva === 'ORANGE' ||
      os.etiquetaAnteriorStandByPecas === 'ORANGE')
  ) {
    proximo.etiqueta_laranja = 'C';
  } else if (os.trataSeGarantia === false) {
    proximo.etiqueta_laranja = 'NA';
  } else {
    delete proximo.etiqueta_laranja;
  }

  if (prev.etiqueta_verde_sem_defeito === 'C' && finalizadoVerde) {
    proximo.etiqueta_verde_sem_defeito = 'C';
  } else if (finalizadoVerde || reprovado) {
    proximo.etiqueta_verde_sem_defeito = 'NA';
  }

  // 3. Etapas do checklist (Envio à Fábrica, Orçamento e Peças)
  proximo.enviado_fabrica = Boolean(os.trataSeEnvioFabrica);
  if (os.trataSeEnvioFabrica && os.tipoTransporteFabrica) {
    proximo.tipo_transporte = os.tipoTransporteFabrica;
  } else if (!os.trataSeEnvioFabrica) {
    delete proximo.tipo_transporte;
  }

  if (os.trataSeGarantia === true) {
    proximo.orcamento_enviado = 'NA';
    proximo.orcamento_aprovado = 'NA';
    proximo.orcamento_reprovado = 'NA';
  } else {
    if (
      rank >= PASSO_RANK.C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE ||
      aprovouOuReprovou ||
      etiquetaEfetiva === 'YELLOW'
    ) {
      proximo.orcamento_enviado = 'C';
    } else {
      delete proximo.orcamento_enviado;
    }

    if (os.orcamentoAprovado === true) {
      proximo.orcamento_aprovado = 'C';
      proximo.orcamento_reprovado = 'NA';
    } else if (os.orcamentoAprovado === false) {
      proximo.orcamento_aprovado = 'NA';
      proximo.orcamento_reprovado = 'C';
    } else {
      delete proximo.orcamento_aprovado;
      delete proximo.orcamento_reprovado;
    }
  }

  if (reprovado) {
    proximo.falta_itens_estoque = 'NA';
  } else if (os.statusPecasAlmoxarifado === 'aguardando_pecas' && etiquetaEfetiva === 'BLACK') {
    proximo.falta_itens_estoque = 'C';
  } else if (
    os.statusPecasAlmoxarifado === 'pecas_disponiveis' ||
    (os.statusPecasAlmoxarifado === 'aguardando_pecas' && etiquetaEfetiva !== 'BLACK')
  ) {
    proximo.falta_itens_estoque = 'NA';
  } else if (finalizadoVerde && !prev.falta_itens_estoque) {
    proximo.falta_itens_estoque = 'NA';
  } else if (os.statusPecasAlmoxarifado === null && !dadosExistentes?.falta_itens_estoque) {
    delete proximo.falta_itens_estoque;
  }

  // 4. Verificação após a manutenção
  if (reg030Dados && !prev.etiqueta_calibracao) {
    proximo.etiqueta_calibracao = 'C';
  }

  if (finalizadoVerde) {
    proximo.inspecao_final = prev.inspecao_final || 'C';
    proximo.etiqueta_manutencao = prev.etiqueta_manutencao || 'C';
    proximo.lacre_antiviolacao = prev.lacre_antiviolacao || 'C';
    proximo.etiqueta_calibracao = prev.etiqueta_calibracao || (reg030Dados ? 'C' : 'NA');
    proximo.liberado_qualidade = 'C';
    proximo.assinatura_tecnico = extrairNomeTecnicoResponsavel(os, prev);
  } else if (reprovado) {
    proximo.inspecao_final = prev.inspecao_final || 'NA';
    proximo.etiqueta_manutencao = prev.etiqueta_manutencao || 'NA';
    proximo.lacre_antiviolacao = prev.lacre_antiviolacao || 'NA';
    proximo.etiqueta_calibracao = prev.etiqueta_calibracao || 'NA';
    proximo.liberado_qualidade = 'NA';
    if (!prev.assinatura_tecnico) {
      proximo.assinatura_tecnico = extrairNomeTecnicoResponsavel(os, prev);
    }
  } else if (prev.liberado_qualidade === 'C') {
    // Se a OS voltou de etapa antes da finalização, não manter liberado_qualidade travado em C
    delete proximo.liberado_qualidade;
  }

  // 5. Item 5 — Etapa Final por Marca (REG 009 / REG 035)
  const bloqueioItem5 = verificarBloqueioItem5Reg016({
    etiquetaAtual: etiquetaEfetiva,
    orcamentoReprovado: reprovado ? 'C' : prev.orcamento_reprovado,
  });

  if (bloqueioItem5.bloqueado) {
    delete proximo.item5_marca;
  } else {
    const marcaInferida =
      (prev.item5_marca as MarcaItem5Reg016 | undefined) ||
      normalizarMarcaParaItem5(reg035Subtipo) ||
      normalizarMarcaParaItem5(os.identificacao.marca);

    if (reg035Dados) {
      const copiados = copiarCamposItem5DeChecklist(
        reg035Dados,
        reg035Subtipo,
        marcaInferida,
      );
      Object.assign(proximo, copiados);
    } else if (
      marcaInferida &&
      (finalizadoVerde || os.item5Preenchido || prev.item5_marca)
    ) {
      proximo.item5_marca = marcaInferida;
    }
  }

  // Governança documental (RDC 665/2022)
  proximo.elaborado_por =
    (typeof prev.elaborado_por === 'string' && prev.elaborado_por.trim()) ||
    RESPONSAVEIS_PADRAO_AT.elaboradoPor;
  proximo.revisado_por =
    (typeof prev.revisado_por === 'string' && prev.revisado_por.trim()) ||
    RESPONSAVEIS_PADRAO_AT.revisadoPor;
  proximo.aprovado_por =
    (typeof prev.aprovado_por === 'string' && prev.aprovado_por.trim()) ||
    RESPONSAVEIS_PADRAO_AT.aprovadoPor;

  // Sanitiza todos os campos oficiais (removendo campos ocultos pelo showIf, etc.)
  const sanitizado = sanitizarDados(reg016Def, null, proximo);
  const status = avaliarConformidade(reg016Def, null, sanitizado);

  // Anexa metadados leves de sincronização para UI, dossiê e inferirTagDoReg016
  const dadosFinal: Record<string, unknown> = {
    ...sanitizado,
    etiqueta_atual: os.etiquetaAtual ?? 'WHITE',
    __sync_origem: 'os_fluxo',
    __sync_passo: os.passoAtual,
    __sync_atualizado_em: new Date().toISOString(),
  };

  return { dados: dadosFinal, status, dataRef: dataAbertura };
}

/**
 * Mescla as ordens oficiais de `os_fluxo` com o agregado de `form_records`,
 * garantindo que /equipamentos, /formularios, /indicadores e Dossiê exibam
 * sempre a etiqueta e o status mais recentes mesmo quando a OS avançou via Fluxo.
 */
export function mergeOsFluxoIntoServiceOrders(
  ordensFluxo: OrdemServicoFluxoState[],
  formOrders: ServiceOrderContext[],
): ServiceOrderContext[] {
  const porChave = new Map<string, ServiceOrderContext>();
  for (const ctx of formOrders) {
    porChave.set(normalizarNumeroOs(ctx.numeroOs || ctx.chave), ctx);
  }

  for (const os of ordensFluxo) {
    const chave = normalizarNumeroOs(os.numeroOs);
    if (!chave) continue;
    const prev = porChave.get(chave);

    const tagAtual: TagColor =
      os.etiquetaAtual ?? prev?.tagColor ?? 'WHITE';
    const osStatus: OSStatus =
      TAG_TO_OS_STATUS[tagAtual] ?? prev?.osStatus ?? 'AGUARDANDO_ANALISE';

    const atualOsIso = new Date(os.atualizadaEm || os.criadaEm || Date.now()).toISOString();
    const ultimaAtualizacao =
      prev?.ultimaAtualizacao && prev.ultimaAtualizacao > atualOsIso
        ? prev.ultimaAtualizacao
        : atualOsIso;

    porChave.set(chave, {
      chave,
      numeroOs: os.numeroOs,
      cliente: os.identificacao.cliente || prev?.cliente || 'Cliente não informado',
      equipamento: os.identificacao.equipamento || prev?.equipamento || 'Equipamento não informado',
      marca: os.identificacao.marca || prev?.marca || '',
      modelo: os.identificacao.modelo || prev?.modelo || '',
      numeroSerie: os.identificacao.numeroSerie || prev?.numeroSerie || '',
      acessorios: os.identificacao.acessorios || prev?.acessorios || '',
      relatoCliente: os.identificacao.relatoCliente || prev?.relatoCliente || '',
      diagnosticoTecnico: prev?.diagnosticoTecnico || '',
      emGarantia: os.trataSeGarantia === true || (os.trataSeGarantia === null && Boolean(prev?.emGarantia)),
      enviadoFabrica: Boolean(os.trataSeEnvioFabrica),
      tipoTransporte: os.tipoTransporteFabrica ?? prev?.tipoTransporte,
      tagColor: TAG_SPECS[tagAtual] ? tagAtual : 'WHITE',
      osStatus,
      estadoGeral: os.estadoGeral,
      setorPendente: os.setorPendente,
      item5Liberado: os.item5Liberado,
      etiquetaIdentificacaoLiberada: os.etiquetaIdentificacaoLiberada,
      ultimaAtualizacao,
      etapasConcluidas: {
        reg022Recebimento: os.reg022Preenchido || Boolean(prev?.etapasConcluidas.reg022Recebimento),
        reg034Limpeza: os.reg034Preenchido || Boolean(prev?.etapasConcluidas.reg034Limpeza),
        reg016Etapas:
          (os.reg034Preenchido &&
            (os.reg016Iniciado || os.etiquetaAtual !== null)) ||
          Boolean(prev?.etapasConcluidas.reg016Etapas),
        reg035Manutencao: os.item5Preenchido || Boolean(prev?.etapasConcluidas.reg035Manutencao),
        reg030Calibracao: Boolean(prev?.etapasConcluidas.reg030Calibracao),
      },
    });
  }

  return Array.from(porChave.values()).sort((a, b) =>
    b.ultimaAtualizacao.localeCompare(a.ultimaAtualizacao),
  );
}

/**
 * Hidrata campos iniciais de qualquer formulário da OS combinando:
 * 1) Contexto da OS (`ServiceOrderContext`)
 * 2) Estado oficial em `os_fluxo` (quando disponível)
 * 3) Registro REG-016 já sincronizado/salvo no banco (quando disponível)
 */
export function hydrateFormFieldsFromOsFluxo(
  formTipo: FormTipo,
  ctx: ServiceOrderContext,
  options?: {
    osFluxo?: OrdemServicoFluxoState | null;
    reg016RecordExistente?: FormRecord | null;
    reg035RecordExistente?: FormRecord | null;
    reg022RecordExistente?: FormRecord | null;
    reg030RecordExistente?: FormRecord | null;
  },
): Record<string, string | boolean> {
  const base = hydrateFormFieldsFromOs(formTipo, ctx);

  if (formTipo !== 'etapas-manutencao') {
    if (formTipo === 'checklist-manutencao' && options?.osFluxo?.identificacao.relatoCliente) {
      base.problema_cliente = options.osFluxo.identificacao.relatoCliente;
    }
    return base;
  }

  const dadosReg016Salvo = options?.reg016RecordExistente?.dados ?? null;

  if (options?.osFluxo) {
    const { dados } = buildReg016DadosFromOsFluxo({
      os: options.osFluxo,
      dadosExistentes: dadosReg016Salvo,
      reg035Dados: options.reg035RecordExistente?.dados ?? null,
      reg035Subtipo: options.reg035RecordExistente?.subtipo ?? null,
      reg022Dados: options.reg022RecordExistente?.dados ?? null,
      reg030Dados: options.reg030RecordExistente?.dados ?? null,
    });

    const convertido: Record<string, string | boolean> = { ...base };
    for (const [k, v] of Object.entries(dados)) {
      if (k.startsWith('__sync_') || k === 'etiqueta_atual') continue;
      if (typeof v === 'boolean' || typeof v === 'string') {
        convertido[k] = v;
      } else if (typeof v === 'number') {
        convertido[k] = String(v);
      }
    }
    return convertido;
  }

  // Sem osFluxo explícito, ainda reaproveita os campos salvos no REG-016 existente
  if (dadosReg016Salvo) {
    const combinado: Record<string, string | boolean> = { ...base };
    for (const [k, v] of Object.entries(dadosReg016Salvo)) {
      if (k.startsWith('__sync_') || k === 'etiqueta_atual') continue;
      if (typeof v === 'boolean' || typeof v === 'string') {
        combinado[k] = v;
      } else if (typeof v === 'number') {
        combinado[k] = String(v);
      }
    }
    return combinado;
  }

  return base;
}

export function mapearSetorPorPerfil(
  perfil?: Perfil | null,
): 'ADM' | 'AT' | 'ALMOXARIFADO' | null {
  if (perfil === 'adm') return 'ADM';
  if (perfil === 'tecnico') return 'AT';
  if (perfil === 'estoquista') return 'ALMOXARIFADO';
  return null;
}

/**
 * Conta notificações intersetoriais pendentes de confirmação (ou OS aguardando ação)
 * para o perfil autenticado no cabeçalho e central de notificações.
 */
export function contarPendenciasOsPorPerfil(
  ordens: OrdemServicoFluxoState[],
  perfil?: Perfil | null,
): number {
  const setorUsuario = mapearSetorPorPerfil(perfil);
  let total = 0;

  for (const os of ordens) {
    if (os.estadoGeral === 'finalizada' || os.estadoGeral === 'cancelada') continue;
    const pendentesNotif = (os.notificacoes ?? []).filter(
      (n) => !n.confirmadaEm && (!setorUsuario || n.destinatario === setorUsuario),
    );
    if (pendentesNotif.length > 0) {
      total += pendentesNotif.length;
    } else if (
      os.setorPendente !== 'NENHUM' &&
      (!setorUsuario || os.setorPendente === setorUsuario)
    ) {
      total += 1;
    }
  }

  return total;
}

export { copiarCamposItem5DeChecklist };
