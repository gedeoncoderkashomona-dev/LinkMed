import {
  FLUXO,
  estadoDe,
  etiquetaDoNo,
  normalizarNumero,
  type Estado,
  type Evento,
  type Perfil,
} from './nucleo';
import {
  TAG_SPECS,
  determinarFormularioItem5PorMarca,
  type CodigoPassoFluxoOS,
  type EventoHistoricoOS,
  type IdentificacaoEquipamentoOS,
  type NotificacaoSetorOS,
  type OrdemServicoFluxoState,
  type TagColor,
} from '../forms/os-workflow';

export type EtiquetaV4 =
  | 'BRANCA'
  | 'VIOLETA'
  | 'CINZA'
  | 'LARANJA'
  | 'MARROM'
  | 'AMARELA'
  | 'AZUL'
  | 'PRETA'
  | 'VERMELHA'
  | 'VERDE';

export const ETIQUETA_V4_PARA_TAG_COLOR: Record<string, TagColor> = {
  BRANCA: 'WHITE',
  VIOLETA: 'VIOLET',
  CINZA: 'GRAY',
  LARANJA: 'ORANGE',
  MARROM: 'BROWN',
  AMARELA: 'YELLOW',
  AZUL: 'BLUE',
  PRETA: 'BLACK',
  VERMELHA: 'RED',
  VERDE: 'GREEN',
};

export const TAG_COLOR_PARA_ETIQUETA_V4: Record<TagColor, EtiquetaV4> = {
  WHITE: 'BRANCA',
  VIOLET: 'VIOLETA',
  GRAY: 'CINZA',
  ORANGE: 'LARANJA',
  BROWN: 'MARROM',
  YELLOW: 'AMARELA',
  BLUE: 'AZUL',
  BLACK: 'PRETA',
  RED: 'VERMELHA',
  GREEN: 'VERDE',
};

export const NODE_LABEL_PT: Record<string, string> = {
  AGUARDA_REG016: 'Aguardando abrir REG-016 (ADM)',
  AT_RECEBER: 'Aguardando recebimento pela AT',
  AT_REG034: 'Preencher REG-034 (Limpeza e Higienização)',
  AT_HIGIENIZAR: 'Marcar higienizado no REG-016',
  EM_ANALISE: 'Em análise na bancada (AT)',
  PERG_GARANTIA: 'Análise completa — Trata-se de garantia?',
  PERG_ENVIO: 'Trata-se de envio à fábrica?',
  AGUARDA_ENVIO: 'Stand-by — Aguardando envio à fábrica',
  AGUARDA_RETORNO: 'Stand-by — Enviado à fábrica (aguardando retorno)',
  O_CONTATO: 'Orçamento — ADM contatar cliente',
  O_APROVACAO: 'Orçamento — Aguardando aprovação do cliente',
  O_REPROVADO: 'Orçamento reprovado — Aguardando ciência da AT',
  P_TRIAGEM: 'Separação de peças (Almoxarifado)',
  P_COMPRA: 'Stand-by — Aguardando peças / compra (POP 009)',
  P_ENTREGA: 'Peças disponíveis — Confirmar recebimento (AT)',
  EM_EXECUCAO: 'Em execução de reparo / manutenção (AT)',
  FIM_VERDE: 'Serviço finalizado (Etiqueta VERDE)',
  FIM_VERMELHA: 'Orçamento não aprovado (Etiqueta VERMELHA)',
};

export function mapearNoV4ParaPassoLegado(
  no: string,
  cancelada: boolean,
): CodigoPassoFluxoOS {
  if (cancelada) return 'CANCELADA';
  switch (no) {
    case 'AGUARDA_REG016':
      return 'A1_CRIADA_NO_REG022';
    case 'AT_RECEBER':
      return 'A2_BRANCA_NOTIFICA_AT';
    case 'AT_REG034':
      return 'A3_AT_CONFIRMOU_PREENCHER_REG034';
    case 'AT_HIGIENIZAR':
      return 'A4_REG034_PREENCHIDO';
    case 'EM_ANALISE':
      return 'A5_VIOLETA_HIGIENIZADO';
    case 'PERG_GARANTIA':
      return 'A6_CINZA_ANALISE_CONCLUIDA';
    case 'PERG_ENVIO':
      return 'B2_PERGUNTA_ENVIO_FABRICA';
    case 'AGUARDA_ENVIO':
    case 'AGUARDA_RETORNO':
      return 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA';
    case 'O_CONTATO':
      return 'C_AGUARDANDO_ORCAMENTO_ADM';
    case 'O_APROVACAO':
      return 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE';
    case 'O_REPROVADO':
      return 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT';
    case 'P_TRIAGEM':
      return 'D1_ALMOX_DECIDINDO_PECAS';
    case 'P_COMPRA':
      return 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS';
    case 'P_ENTREGA':
      return 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT';
    case 'EM_EXECUCAO':
      return 'D5_AT_PRONTO_PARA_FINALIZAR';
    case 'FIM_VERDE':
    case 'FIM_VERMELHA':
      return 'FINALIZADA';
    default:
      return 'A1_CRIADA_NO_REG022';
  }
}

export function etiquetaV4ParaTagColor(etiqueta: string | null | undefined): TagColor | null {
  if (!etiqueta) return null;
  const upper = etiqueta.toUpperCase();
  return ETIQUETA_V4_PARA_TAG_COLOR[upper] ?? (TAG_SPECS[upper as TagColor] ? (upper as TagColor) : null);
}

export function formatarAcaoEventoV4(ev: Evento): string {
  switch (ev.tipo) {
    case 'CANCELAR':
      return `OS cancelada${ev.motivo ? ` — ${ev.motivo}` : ''}`;
    case 'REABRIR':
      return `OS reaberta${ev.motivo ? ` — ${ev.motivo}` : ''}`;
    case 'CORRIGIR':
      return `Correção do autor${ev.motivo ? ` — ${ev.motivo}` : ''}`;
    case 'ESTORNAR':
      return `Estorno pelo ADM para "${NODE_LABEL_PT[ev.para ?? ''] ?? ev.para}"${ev.motivo ? ` — ${ev.motivo}` : ''}`;
    case 'ACAO': {
      switch (ev.acao) {
        case 'ABRIR_REG016':
          return 'Abriu REG-016 (Etiqueta BRANCA — Aguardando análise)';
        case 'RECEBER_OS':
          return 'AT recebeu a OS e iniciou etapa do REG-034';
        case 'REG034_SALVO':
          return 'REG-034 (Limpeza e Higienização) salvo';
        case 'MARCAR_HIGIENIZADO':
          return 'Marcou equipamento higienizado (Etiqueta VIOLETA)';
        case 'ANALISE_COMPLETA':
          return 'Análise técnica concluída (Etiqueta CINZA)';
        case 'RESPONDER_GARANTIA':
          return ev.valor
            ? 'Garantia = SIM (Etiqueta LARANJA — Almoxarifado notificado)'
            : 'Garantia = NÃO';
        case 'RESPONDER_ENVIO':
          return ev.valor
            ? `Envio à fábrica = SIM (Transporte: ${ev.campos?.transporte ?? '—'})`
            : 'Envio à fábrica = NÃO (encaminhado ao ADM para orçamento)';
        case 'RESPONDER_ENVIADO':
          return ev.valor
            ? 'Equipamento enviado ao fabricante (Etiqueta MARROM)'
            : `Envio não realizado → ${ev.campos?.final ?? 'FINAL'}${ev.campos?.justificativa ? ` (${ev.campos.justificativa})` : ''}`;
        case 'FINALIZAR_RETORNO_FABRICA':
          return 'Equipamento retornou da fábrica — Serviço finalizado (Etiqueta VERDE)';
        case 'AGUARDAR_APROVACAO':
          return 'ADM contatou cliente — Aguardando aprovação (Etiqueta AMARELA)';
        case 'RESPONDER_ORCAMENTO':
          return ev.valor
            ? 'Orçamento APROVADO pelo cliente (Etiqueta AZUL — Almoxarifado notificado)'
            : 'Orçamento REPROVADO pelo cliente (AT notificada)';
        case 'CIENTE_REPROVACAO':
          return 'AT registrou ciência da reprovação (Etiqueta VERMELHA — Item 5 bloqueado)';
        case 'PECAS_DISPONIVEIS':
          return 'Almoxarifado marcou peças disponíveis (AT notificada)';
        case 'AGUARDANDO_PECAS':
          return 'Almoxarifado marcou falta de peças (Etiqueta PRETA — stand-by POP 009)';
        case 'PECAS_RECEBIDAS':
          return 'AT confirmou recebimento das peças';
        case 'SERVICO_FINALIZADO':
          return 'AT finalizou o serviço (Etiqueta VERDE)';
        default:
          return ev.acao ?? 'Ação registrada';
      }
    }
  }
}

export interface OsV4PersistidaMeta {
  id: string;
  numeroOs: string;
  identificacao: IdentificacaoEquipamentoOS;
  criadaPorId: string;
  criadaPorNome: string;
  criadaEm: string | Date;
}

/**
 * Constrói um `OrdemServicoFluxoState` completo (compatível com toda a UI atual e
 * enriquecido com os campos nativos da v4: `v4No`, `v4Estado`, `v4Eventos`) a partir
 * da lista append-only de eventos v4.
 */
export function buildOrdemServicoFluxoFromV4(params: {
  meta: OsV4PersistidaMeta;
  eventos: Evento[];
  notificacoes?: NotificacaoSetorOS[];
  reg034Salvo?: boolean;
  item5Preenchido?: boolean;
}): OrdemServicoFluxoState {
  const { meta, eventos, notificacoes = [] } = params;
  const s = estadoDe(eventos);
  const tagColor = etiquetaV4ParaTagColor(s.etiqueta);

  const acoesEfetivas = s.efetivos.filter((e) => e.tipo === 'ACAO');
  const reg034Done =
    Boolean(params.reg034Salvo) || acoesEfetivas.some((e) => e.acao === 'REG034_SALVO');
  const reg016Done =
    s.no !== 'AGUARDA_REG016' ||
    acoesEfetivas.some((e) => e.acao === 'ABRIR_REG016');

  const envioRes = acoesEfetivas.findLast((e) => e.acao === 'RESPONDER_ENVIO');
  const enviadoRes = acoesEfetivas.findLast((e) => e.acao === 'RESPONDER_ENVIADO');
  const garantiaRes = acoesEfetivas.findLast((e) => e.acao === 'RESPONDER_GARANTIA');
  const orcamentoRes = acoesEfetivas.findLast((e) => e.acao === 'RESPONDER_ORCAMENTO');
  const pecasRes = acoesEfetivas.findLast(
    (e) => e.acao === 'PECAS_DISPONIVEIS' || e.acao === 'AGUARDANDO_PECAS',
  );

  let ramificacao: 1 | 2 | 3 | null = null;
  if (garantiaRes?.valor === true || s.origem === 'garantia') ramificacao = 1;
  else if (envioRes?.valor === true) ramificacao = 2;
  else if (envioRes?.valor === false || s.origem === 'orcamento') ramificacao = 3;

  const setorPendente = s.setor ?? 'NENHUM';
  const msgTela = NODE_LABEL_PT[s.no] ?? s.no;
  const lastEvent = eventos.at(-1);

  const anuladosSet = new Set(s.anuladosIds);
  const historico: EventoHistoricoOS[] = eventos.map((ev) => ({
    id: ev.id,
    numeroOs: meta.numeroOs,
    codigoPasso: ev.regraId ?? ev.tipo,
    tipo:
      ev.tipo === 'CANCELAR'
        ? 'CANCELAMENTO'
        : ev.tipo === 'REABRIR'
          ? 'REABERTURA'
          : ev.tipo === 'CORRIGIR'
            ? 'CORRECAO_MARCACAO'
            : ev.tipo === 'ACAO'
              ? 'MARCACAO_ETIQUETA'
              : 'CORRECAO_MARCACAO',
    chaveAcao: ev.acao,
    valorAnterior: ev.de ?? null,
    valorNovo: ev.para ?? (anuladosSet.has(ev.id) ? 'ANULADO' : ev.tipo),
    etiquetaAnterior: ev.de ? etiquetaV4ParaTagColor(etiquetaDoNo(ev.de, s.origem)) : null,
    etiquetaNova: ev.para ? etiquetaV4ParaTagColor(etiquetaDoNo(ev.para, s.origem)) : tagColor,
    setorPendenteAnterior: ev.de ? (FLUXO.nos[ev.de]?.setor ?? 'NENHUM') : 'ADM',
    setorPendenteNovo: setorPendente,
    usuarioId: ev.usuario.id,
    usuarioNome: ev.usuario.nome ?? ev.usuario.perfil,
    usuarioPerfil:
      ev.usuario.perfil === 'AT'
        ? 'tecnico'
        : ev.usuario.perfil === 'ADM'
          ? 'adm'
          : 'estoquista',
    dataHora: new Date(ev.em),
    observacao: formatarAcaoEventoV4(ev),
  }));

  return {
    id: meta.id,
    numeroOs: meta.numeroOs,
    numeroOsNormalizado: normalizarNumero(meta.numeroOs).toUpperCase(),
    identificacao: meta.identificacao,
    etiquetaAtual: tagColor,
    etiquetaAnteriorStandByPecas:
      s.origem === 'garantia' ? 'ORANGE' : s.origem === 'orcamento' ? 'BLUE' : null,
    estadoGeral: s.estadoGeral,
    setorPendente,
    passoAtual: mapearNoV4ParaPassoLegado(s.no, s.cancelada),
    ramificacao,
    trataSeGarantia: garantiaRes ? Boolean(garantiaRes.valor) : null,
    trataSeEnvioFabrica: envioRes ? Boolean(envioRes.valor) : null,
    tipoTransporteFabrica: (envioRes?.campos?.transporte?.toLowerCase() ?? null) as any,
    equipamentoEnviadoFabrica: enviadoRes ? Boolean(enviadoRes.valor) : null,
    justificativaNaoEnviado: enviadoRes?.campos?.justificativa ?? null,
    orcamentoAprovado: orcamentoRes ? Boolean(orcamentoRes.valor) : null,
    statusPecasAlmoxarifado:
      pecasRes?.acao === 'AGUARDANDO_PECAS'
        ? 'aguardando_pecas'
        : pecasRes?.acao === 'PECAS_DISPONIVEIS'
          ? 'pecas_disponiveis'
          : null,
    reg022Preenchido: true,
    reg034Preenchido: reg034Done,
    reg016Iniciado: reg016Done,
    item5Liberado: !s.item5Bloqueado,
    item5Preenchido: Boolean(params.item5Preenchido),
    item5FormularioTipo: determinarFormularioItem5PorMarca(meta.identificacao.marca),
    etiquetaIdentificacaoLiberada: Boolean(FLUXO.nos[s.no]?.libera_impressao_etiqueta),
    mensagemTelaAtual: s.cancelada ? 'OS Cancelada' : msgTela,
    perguntaPendenteAtual:
      s.no === 'PERG_GARANTIA'
        ? 'Trata-se de garantia?'
        : s.no === 'PERG_ENVIO'
          ? 'Trata-se de envio à fábrica?'
          : s.no === 'AGUARDA_ENVIO'
            ? 'O equipamento foi enviado?'
            : s.no === 'O_APROVACAO'
              ? 'O orçamento foi aprovado?'
              : null,
    criadaPorId: meta.criadaPorId,
    criadaPorNome: meta.criadaPorNome,
    criadaEm: new Date(meta.criadaEm),
    atualizadaEm: new Date(lastEvent?.em ?? meta.criadaEm),
    estadoAntesCancelamento: null,
    historico,
    notificacoes,
    versao: s.versao,
    // Campos nativos v4 para a UI usar diretamente sem ambiguidade:
    v4No: s.no,
    v4Estado: s,
    v4Eventos: eventos,
  };
}

/**
 * Converte uma OS salva apenas no modelo antigo (`os_fluxo`) para uma sequência
 * coerente de `Evento[]` da v4 para transição limpa sem perder OS em andamento
 * (ex.: OS-203101 criada antes da v4).
 */
export function converterEstadoLegadoParaEventosV4(legado: OrdemServicoFluxoState): Evento[] {
  const baseEm = new Date(legado.criadaEm || Date.now());
  let stepMs = 1000;
  const nextEm = () => {
    const d = new Date(baseEm.getTime() + stepMs);
    stepMs += 1000;
    return d.toISOString();
  };

  const admActor = {
    id: legado.criadaPorId || 'legacy-adm',
    perfil: 'ADM' as Perfil,
    nome: legado.criadaPorNome || 'ADM',
  };
  const atActor = {
    id:
      legado.historico?.find((h) => h.usuarioPerfil === 'tecnico')?.usuarioId ||
      'legacy-at',
    perfil: 'AT' as Perfil,
    nome:
      legado.historico?.find((h) => h.usuarioPerfil === 'tecnico')?.usuarioNome ||
      'Assistência Técnica',
  };
  const almoxActor = {
    id:
      legado.historico?.find((h) => h.usuarioPerfil === 'estoquista')?.usuarioId ||
      'legacy-almox',
    perfil: 'ALMOXARIFADO' as Perfil,
    nome:
      legado.historico?.find((h) => h.usuarioPerfil === 'estoquista')?.usuarioNome ||
      'Almoxarifado',
  };

  const eventos: Evento[] = [];
  let seq = 1;
  const pushAcao = (
    regraId: string,
    usuario: { id: string; perfil: Perfil; nome: string },
    valor?: boolean,
    campos?: Record<string, string>,
  ) => {
    const regra = FLUXO.acoes.find((a) => a.id === regraId);
    if (!regra) return;
    let para = regra.para!;
    if (regra.para_escolhido) {
      para = campos?.final === 'VERDE' ? 'FIM_VERDE' : 'FIM_VERMELHA';
    }
    eventos.push({
      id: `legacy-${legado.numeroOsNormalizado}-${seq++}`,
      tipo: 'ACAO',
      acao: regra.acao,
      valor,
      campos,
      regraId: regra.id,
      de: regra.de,
      para,
      usuario,
      em: nextEm(),
    });
  };

  const passo = legado.passoAtual;
  if (passo === 'A1_CRIADA_NO_REG022') return eventos;

  // A01 -> AT_RECEBER (BRANCA)
  pushAcao('A01', admActor);
  if (passo === 'A2_BRANCA_NOTIFICA_AT') return eventos;

  // A02 -> AT_REG034
  pushAcao('A02', atActor);
  if (passo === 'A3_AT_CONFIRMOU_PREENCHER_REG034') return eventos;

  // A03 -> AT_HIGIENIZAR
  pushAcao('A03', atActor);
  if (passo === 'A4_REG034_PREENCHIDO') return eventos;

  // A04 -> EM_ANALISE (VIOLETA)
  pushAcao('A04', atActor);
  if (passo === 'A5_VIOLETA_HIGIENIZADO') return eventos;

  // A05 -> PERG_GARANTIA (CINZA)
  pushAcao('A05', atActor);
  if (passo === 'A6_CINZA_ANALISE_CONCLUIDA') return eventos;

  if (legado.trataSeGarantia === true) {
    pushAcao('B01', atActor, true);
  } else {
    pushAcao('B02', atActor, false);
    if (passo === 'B2_PERGUNTA_ENVIO_FABRICA') return eventos;

    if (legado.trataSeEnvioFabrica === true) {
      const transp = String(
        legado.tipoTransporteFabrica || 'TRANSPORTADORA_LINKMED',
      ).toUpperCase();
      pushAcao('B04', atActor, true, { transporte: transp });
      if (
        passo === 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA' &&
        legado.equipamentoEnviadoFabrica == null
      ) {
        return eventos;
      }

      if (legado.equipamentoEnviadoFabrica === true) {
        pushAcao('B05', atActor, true);
        if (legado.etiquetaAtual === 'GREEN' || passo === 'FINALIZADA') {
          pushAcao('B07', atActor);
        }
        return eventos;
      }
      if (legado.equipamentoEnviadoFabrica === false) {
        pushAcao('B06', atActor, false, {
          justificativa: legado.justificativaNaoEnviado || 'Registro migrado',
          final: legado.etiquetaAtual === 'RED' ? 'VERMELHA' : 'VERDE',
        });
        return eventos;
      }
      return eventos;
    }

    pushAcao('B03', atActor, false);
    if (passo === 'C_AGUARDANDO_ORCAMENTO_ADM') return eventos;

    pushAcao('C01', admActor);
    if (passo === 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE') return eventos;

    if (legado.orcamentoAprovado === false) {
      pushAcao('C03', admActor, false);
      if (passo === 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT') return eventos;
      pushAcao('C04', atActor);
      return eventos;
    }

    pushAcao('C02', admActor, true);
  }

  // Bloco P
  if (passo === 'D_AGUARDANDO_CONFIRMACAO_ALMOX' || passo === 'D1_ALMOX_DECIDINDO_PECAS') {
    return eventos;
  }
  if (passo === 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS') {
    pushAcao('P02', almoxActor);
    return eventos;
  }
  if (legado.statusPecasAlmoxarifado === 'aguardando_pecas') {
    pushAcao('P02', almoxActor);
    pushAcao('P03', almoxActor);
  } else {
    pushAcao('P01', almoxActor);
  }
  if (passo === 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT') return eventos;

  pushAcao('P04', atActor);
  if (passo === 'D5_AT_PRONTO_PARA_FINALIZAR') return eventos;

  if (passo === 'FINALIZADA' || legado.etiquetaAtual === 'GREEN') {
    pushAcao('P05', atActor);
  }
  return eventos;
}
