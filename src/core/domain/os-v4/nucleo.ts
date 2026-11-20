// Núcleo oficial do fluxo da OS (v4) — Linkmed / RDC 665/22
// Funções puras: não acessam banco, tela nem relógio.
// Toda a regra de negócio do fluxo vive aqui e é dirigida pelo os_flow_v4.json.

import type { Perfil as PerfilSistema } from '@/core/domain/enums/user';

import fluxoV4Raw from './os_flow_v4.json';

export interface NoFlowDef {
  etiqueta: string | null;
  setor: Perfil | null;
  estado: 'em_andamento' | 'stand_by' | 'finalizada';
  bloco: string;
  exige_reg_para_sair?: string;
  libera_impressao_etiqueta?: boolean;
}

export interface AcaoFlowDef {
  id: string;
  de: string;
  acao: string;
  valor?: boolean;
  perfil: Perfil;
  para?: string;
  para_escolhido?: string[];
  define_origem?: 'garantia' | 'orcamento';
  exige_campo?: Record<string, string[] | string>;
  exige_item5?: boolean;
  exige_item5_se?: string;
  tela?: string;
  obs?: string;
  notifica?: { para: Perfil; msg: string };
}

export const FLUXO = fluxoV4Raw as {
  versao: string;
  data: string;
  descricao: string;
  perfis: Perfil[];
  etiquetas: Record<string, string>;
  no_inicial: string;
  nos: Record<string, NoFlowDef>;
  etiqueta_por_origem: Record<'garantia' | 'orcamento', string>;
  acoes: AcaoFlowDef[];
  acoes_transversais: Record<string, unknown>;
  regras: Array<{ id: string; regra: string }>;
};

export type Perfil = 'AT' | 'ADM' | 'ALMOXARIFADO';
export type Usuario = { id: string; perfil: Perfil; nome?: string };

export type Evento = {
  id: string;
  tipo: 'ACAO' | 'CANCELAR' | 'REABRIR' | 'CORRIGIR' | 'ESTORNAR';
  acao?: string;
  valor?: boolean;
  campos?: Record<string, string>;
  regraId?: string;
  de?: string;
  para?: string;
  anula?: string[];
  motivo?: string;
  usuario: Usuario;
  em: string;
};

export type Comando =
  | { tipo: 'ACAO'; acao: string; valor?: boolean; campos?: Record<string, string> }
  | { tipo: 'CANCELAR' | 'REABRIR' | 'CORRIGIR'; motivo: string }
  | { tipo: 'ESTORNAR'; paraNo: string; motivo: string };

export type Contexto = {
  agora: Date;
  feriados?: string[]; // 'AAAA-MM-DD'
  reg034Salvo?: boolean;
  item5Preenchido?: boolean;
  versaoVista: number;
  /**
   * Em produção/homologação, controla se a trava de horário (R06/D9) bloqueia ações
   * fora de seg-sex 07:30-19:30. Nos testes automatizados e após validação completa, é true.
   */
  enforceJanelaHorario?: boolean;
};

export type Estado = {
  no: string;
  origem: 'garantia' | 'orcamento' | null;
  cancelada: boolean;
  etiqueta: string | null;
  setor: Perfil | null;
  estadoGeral: 'em_andamento' | 'stand_by' | 'finalizada' | 'cancelada';
  etiquetasEfetivas: string[]; // em ordem, sem repetição consecutiva
  item5Bloqueado: boolean;
  versao: number; // = nº de eventos
  efetivos: Evento[]; // eventos não anulados
  anuladosIds: string[]; // ids anulados por CORRIGIR/ESTORNAR (para riscar na linha do tempo)
  visitados: { no: string; entrouPor: string | null }[];
};

export type CodigoRecusaOS =
  | 'versao'
  | 'horario'
  | 'perfil'
  | 'transicao'
  | 'campo'
  | 'reg'
  | 'item5'
  | 'correcao'
  | 'estorno'
  | 'motivo'
  | 'estado';

export class Recusado extends Error {
  codigo: CodigoRecusaOS | string;
  constructor(codigo: CodigoRecusaOS | string, msg: string) {
    super(msg);
    this.name = 'Recusado';
    this.codigo = codigo;
  }
}

export function perfilSistemaParaSetorV4(perfil?: PerfilSistema | string | null): Perfil | null {
  switch (perfil) {
    case 'adm':
    case 'ADM':
      return 'ADM';
    case 'tecnico':
    case 'AT':
      return 'AT';
    case 'estoquista':
    case 'ALMOXARIFADO':
      return 'ALMOXARIFADO';
    default:
      return null;
  }
}

// ---------- Etiqueta calculada pelo nó (decisão D3) ----------
export function etiquetaDoNo(no: string, origem: Estado['origem']): string | null {
  const def = FLUXO.nos[no];
  if (!def) return null;
  const e = def.etiqueta;
  if (e === '@origem') return origem ? FLUXO.etiqueta_por_origem[origem] : null;
  return e;
}

// ---------- Reducer: eventos -> estado ----------
export function estadoDe(eventos: Evento[]): Estado {
  const anulados = new Set(eventos.flatMap((e) => e.anula ?? []));
  let no = FLUXO.no_inicial;
  let origem: Estado['origem'] = null;
  let cancelada = false;
  const etiquetas: string[] = [];
  const efetivos: Evento[] = [];
  const visitados: Estado['visitados'] = [{ no, entrouPor: null }];

  for (const ev of eventos) {
    if (anulados.has(ev.id)) continue;
    efetivos.push(ev);
    if (ev.tipo === 'CANCELAR') cancelada = true;
    if (ev.tipo === 'REABRIR') cancelada = false;
    if (ev.tipo !== 'ACAO') continue;
    const regra = FLUXO.acoes.find((a) => a.id === ev.regraId);
    if (regra?.define_origem) origem = regra.define_origem;
    no = ev.para!;
    visitados.push({ no, entrouPor: ev.id });
    const et = etiquetaDoNo(no, origem);
    if (et && etiquetas.at(-1) !== et) etiquetas.push(et);
  }

  const n = FLUXO.nos[no] ?? FLUXO.nos[FLUXO.no_inicial]!;
  return {
    no,
    origem,
    cancelada,
    etiqueta: etiquetaDoNo(no, origem),
    setor: cancelada ? null : n.setor,
    estadoGeral: cancelada ? 'cancelada' : n.estado,
    etiquetasEfetivas: etiquetas,
    item5Bloqueado: etiquetas.includes('VERMELHA'), // decisão D4
    versao: eventos.length,
    efetivos,
    anuladosIds: Array.from(anulados),
    visitados,
  };
}

// ---------- Janela de horário (R06 / D9) ----------
const OFFSET_RECIFE_MIN = -180; // America/Recife (UTC-3)
function local(d: Date) {
  return new Date(d.getTime() + OFFSET_RECIFE_MIN * 60000);
}

export function dataLocalRecifeISO(d: Date): string {
  return local(d).toISOString().slice(0, 10);
}

export function dentroDaJanela(d: Date, feriados: string[] = []): boolean {
  const l = local(d);
  const dia = l.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  if (feriados.includes(l.toISOString().slice(0, 10))) return false;
  const min = l.getUTCHours() * 60 + l.getUTCMinutes();
  return min >= 7 * 60 + 30 && min < 19 * 60 + 30;
}

/** Momento de entrega de uma notificação criada em `d` (próxima abertura da janela). */
export function entregarEm(d: Date, feriados: string[] = []): Date {
  if (dentroDaJanela(d, feriados)) return d;
  let l = local(d);
  const min = l.getUTCHours() * 60 + l.getUTCMinutes();
  if (min >= 7 * 60 + 30) l = new Date(l.getTime() + 864e5);
  for (let i = 0; i < 60; i++) {
    const abertura = new Date(
      Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), 7, 30) -
        OFFSET_RECIFE_MIN * 60000,
    );
    if (dentroDaJanela(abertura, feriados)) return abertura;
    l = new Date(l.getTime() + 864e5);
  }
  throw new Error('janela não encontrada');
}

// ---------- Decisão: estado + comando -> novos eventos ----------
export function decidir(
  eventos: Evento[],
  cmd: Comando,
  u: Usuario,
  ctx: Contexto,
): Omit<Evento, 'id'>[] {
  const s = estadoDe(eventos);
  const em = ctx.agora.toISOString();

  if (ctx.versaoVista !== s.versao) {
    throw new Recusado('versao', 'A OS mudou desde que você abriu. Recarregue a tela.');
  }
  if (ctx.enforceJanelaHorario !== false && !dentroDaJanela(ctx.agora, ctx.feriados)) {
    throw new Recusado(
      'horario',
      'Acesso permitido de segunda a sexta, das 07:30 às 19:30.',
    );
  }

  if (cmd.tipo === 'CANCELAR' || cmd.tipo === 'REABRIR') {
    if (!['ADM', 'AT'].includes(u.perfil)) {
      throw new Recusado('perfil', 'Só ADM e AT cancelam ou reabrem.');
    }
    if (!cmd.motivo?.trim()) {
      throw new Recusado('motivo', 'Informe o motivo.');
    }
    if (cmd.tipo === 'CANCELAR' && (s.cancelada || s.estadoGeral === 'finalizada')) {
      throw new Recusado('estado', 'Só uma OS em andamento pode ser cancelada.');
    }
    if (cmd.tipo === 'REABRIR' && !s.cancelada) {
      throw new Recusado('estado', 'A OS não está cancelada.');
    }
    return [{ tipo: cmd.tipo, motivo: cmd.motivo.trim(), usuario: u, em }];
  }

  if (cmd.tipo === 'CORRIGIR') {
    if (!cmd.motivo?.trim()) {
      throw new Recusado('motivo', 'Informe o motivo da correção.');
    }
    const ultimo = [...s.efetivos].reverse().find((e) => e.tipo !== 'CORRIGIR');
    if (!ultimo || ultimo.tipo !== 'ACAO') {
      throw new Recusado('correcao', 'Não há ação para corrigir.');
    }
    if (ultimo.usuario.id !== u.id) {
      throw new Recusado(
        'correcao',
        'Só o dono do login corrige, e só antes de outra pessoa agir. Peça um estorno ao ADM.',
      );
    }
    return [{ tipo: 'CORRIGIR', anula: [ultimo.id], motivo: cmd.motivo.trim(), usuario: u, em }];
  }

  if (cmd.tipo === 'ESTORNAR') {
    if (u.perfil !== 'ADM') {
      throw new Recusado('perfil', 'Só o ADM estorna.');
    }
    if (!cmd.motivo?.trim()) {
      throw new Recusado('motivo', 'Informe a justificativa do estorno.');
    }
    if (s.cancelada) {
      throw new Recusado('estado', 'Reabra a OS antes de estornar.');
    }
    const alvo = s.visitados.slice(0, -1).findLast((v) => v.no === cmd.paraNo);
    if (!alvo) {
      throw new Recusado('estorno', 'A OS nunca passou por esse nó.');
    }
    const corte = alvo.entrouPor
      ? s.efetivos.findIndex((e) => e.id === alvo.entrouPor) + 1
      : 0;
    const anula = s.efetivos
      .slice(corte)
      .filter((e) => e.tipo === 'ACAO')
      .map((e) => e.id);
    return [
      {
        tipo: 'ESTORNAR',
        anula,
        para: cmd.paraNo,
        motivo: cmd.motivo.trim(),
        usuario: u,
        em,
      },
    ];
  }

  // ---- Ação do fluxo ----
  if (cmd.tipo !== 'ACAO') {
    throw new Recusado('estado', 'Comando inválido.');
  }
  if (s.cancelada) {
    throw new Recusado('estado', 'OS cancelada. Reabra para continuar.');
  }
  const candidatas = FLUXO.acoes.filter(
    (a) =>
      a.de === s.no &&
      a.acao === cmd.acao &&
      (a.valor === undefined || a.valor === cmd.valor),
  );
  if (candidatas.length !== 1) {
    throw new Recusado('transicao', `Ação ${cmd.acao} não é permitida no nó ${s.no}.`);
  }
  const regra = candidatas[0]!;
  if (regra.perfil !== u.perfil) {
    throw new Recusado('perfil', `Esta ação é do perfil ${regra.perfil}.`);
  }

  const campos = cmd.campos ?? {};
  for (const [campo, regraCampo] of Object.entries(regra.exige_campo ?? {})) {
    const v = campos[campo]?.trim();
    if (!v) throw new Recusado('campo', `Preencha: ${campo}.`);
    if (Array.isArray(regraCampo) && !regraCampo.includes(v)) {
      throw new Recusado('campo', `Valor inválido para ${campo}.`);
    }
  }
  if (regra.acao === 'REG034_SALVO' && !ctx.reg034Salvo) {
    throw new Recusado('reg', 'Salve o REG 034 antes de avançar.');
  }

  let para = regra.para!;
  if (regra.para_escolhido) {
    para = campos.final === 'VERDE' ? 'FIM_VERDE' : 'FIM_VERMELHA';
  }
  const exigeItem5 =
    Boolean(regra.exige_item5) ||
    (Boolean(regra.exige_item5_se) && campos.final === regra.exige_item5_se);
  if (exigeItem5 && !ctx.item5Preenchido) {
    throw new Recusado('item5', 'Preencha o item 5 do REG 016 antes de finalizar.');
  }

  return [
    {
      tipo: 'ACAO',
      acao: regra.acao,
      valor: cmd.valor,
      campos,
      regraId: regra.id,
      de: s.no,
      para,
      usuario: u,
      em,
    },
  ];
}

// ---------- Notificações geradas por um evento (Padrão Outbox) ----------
export type Notificacao = {
  para: string;
  msg: string;
  criadaEm: string;
  entregarEm: string;
};

export function notificacoesDe(
  ev: Evento,
  numeroOS: string,
  eventosAntes: Evento[],
  feriados: string[] = [],
): Notificacao[] {
  const criada = new Date(ev.em);
  const entrega = entregarEm(criada, feriados).toISOString();
  const nota = (para: string, msg: string) => ({
    para,
    msg: msg.replace('{os}', numeroOS),
    criadaEm: ev.em,
    entregarEm: entrega,
  });

  if (ev.tipo === 'ACAO') {
    const regra = FLUXO.acoes.find((a) => a.id === ev.regraId);
    return regra?.notifica ? [nota(regra.notifica.para, regra.notifica.msg)] : [];
  }

  // Cancelamento, reabertura, correção e estorno avisam o setor que fica com a ação.
  const depois = estadoDe([...eventosAntes, ev]);
  const antes = estadoDe(eventosAntes);
  const setor = depois.setor ?? antes.setor;
  if (!setor) return [];
  const textos: Record<string, string> = {
    CANCELAR: 'A OS {os} foi cancelada',
    REABRIR: 'A OS {os} foi reaberta',
    CORRIGIR: 'Uma etapa da OS {os} foi corrigida',
    ESTORNAR: 'A OS {os} foi estornada e voltou para o seu setor',
  };
  return [nota(setor, textos[ev.tipo]!)];
}

/**
 * Lembrete de 7 dias corridos (R05): devido se a notificação foi entregue há 7+ dias
 * desde a entrega ou último lembrete e ainda não foi confirmada.
 * Não gera lembrete com OS cancelada ou finalizada.
 */
export function lembreteDevido(
  entregueEm: Date,
  confirmada: boolean,
  s: Estado,
  agora: Date,
  ultimoLembrete?: Date,
): boolean {
  if (confirmada || s.estadoGeral === 'cancelada' || s.estadoGeral === 'finalizada') {
    return false;
  }
  const base = ultimoLembrete ?? entregueEm;
  return agora.getTime() - base.getTime() >= 7 * 864e5;
}

// ---------- Número de OS (R07) ----------
export const normalizarNumero = (n: string) => n.trim().toLowerCase();

// ---------- Ações permitidas no nó atual para a tela ----------
export function acoesPermitidasParaPerfil(
  estado: Estado,
  perfilSistema: PerfilSistema | string | null | undefined,
  usuarioId?: string,
) {
  const setorUsuario = perfilSistemaParaSetorV4(perfilSistema);
  const acoesFluxo =
    !estado.cancelada && setorUsuario
      ? FLUXO.acoes.filter((a) => a.de === estado.no && a.perfil === setorUsuario)
      : [];

  const ultimoNaoCorrigido = [...estado.efetivos]
    .reverse()
    .find((e) => e.tipo !== 'CORRIGIR');

  const podeCorrigir =
    Boolean(usuarioId) &&
    Boolean(ultimoNaoCorrigido) &&
    ultimoNaoCorrigido?.tipo === 'ACAO' &&
    ultimoNaoCorrigido.usuario.id === usuarioId;

  const podeCancelar =
    Boolean(setorUsuario && ['ADM', 'AT'].includes(setorUsuario)) &&
    !estado.cancelada &&
    estado.estadoGeral !== 'finalizada';

  const podeReabrir =
    Boolean(setorUsuario && ['ADM', 'AT'].includes(setorUsuario)) && estado.cancelada;

  const nosEstornaveis =
    setorUsuario === 'ADM' && !estado.cancelada
      ? Array.from(
          new Map(
            estado.visitados
              .slice(0, -1)
              .map((v) => [
                v.no,
                {
                  no: v.no,
                  etiqueta: etiquetaDoNo(v.no, estado.origem),
                  setor: FLUXO.nos[v.no]?.setor ?? null,
                },
              ]),
          ).values(),
        )
      : [];

  return {
    setorUsuario,
    acoesFluxo,
    podeCorrigir,
    ultimoEventoCorrigivel: podeCorrigir ? ultimoNaoCorrigido ?? null : null,
    podeCancelar,
    podeReabrir,
    podeEstornar: nosEstornaveis.length > 0,
    nosEstornaveis,
    liberaImpressaoEtiqueta: Boolean(FLUXO.nos[estado.no]?.libera_impressao_etiqueta),
  };
}
