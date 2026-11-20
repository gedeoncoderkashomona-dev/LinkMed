import type { Perfil } from './enums/user';
import { FERIADOS_DATAS_PADRAO } from './os-v4/feriados';
import { dentroDaJanela, entregarEm } from './os-v4/nucleo';

/**
 * Regras de horário de acesso e entrega de notificações (Seção 5.1 / Decisão D9 / R06).
 *
 * - Horário permitido para AT, ADM e Almoxarifado: Segunda a sexta-feira, das 07:30h às 19:30h
 *   (America/Recife, 19:30 exclusivo, excluindo feriados nacionais e Recife/PE configuráveis).
 * - Ativação controlada por `NEXT_PUBLIC_ENABLE_SCHEDULE_RESTRICTION === 'true'` (liberada
 *   em homologação 24h até validação final do cliente, mantida nos testes unitários).
 * - Notificações geradas fora da janela ficam retidas até às 07:30h do próximo dia útil.
 */

export type SetorOperacional = 'AT' | 'ADM' | 'ALMOXARIFADO';

export const SETOR_OPERACIONAL_LABEL: Record<SetorOperacional, string> = {
  AT: 'Assistência Técnica (AT)',
  ADM: 'Administrativo (ADM)',
  ALMOXARIFADO: 'Almoxarifado',
};

const TZ = 'America/Recife';

export const HORARIO_ABERTURA_MINUTOS = 7 * 60 + 30; // 07:30 = 450 min
export const HORARIO_FECHAMENTO_MINUTOS = 19 * 60 + 30; // 19:30 = 1170 min (exclusivo no v4)

const DIAS_SEMANA_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export interface PartesDataBR {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  diaSemana: number; // 0 = Domingo, 1 = Segunda ... 6 = Sábado
  dataISO: string; // YYYY-MM-DD
  horaFormatada: string; // HH:MM
}

export function extrairPartesBR(date: Date = new Date()): PartesDataBR {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const ano = Number(get('year'));
  const mes = Number(get('month'));
  const dia = Number(get('day'));
  const hora = Number(get('hour')) % 24;
  const minuto = Number(get('minute'));
  const segundo = Number(get('second'));
  const diaSemana = weekdays.indexOf(get('weekday'));

  return {
    ano,
    mes,
    dia,
    hora,
    minuto,
    segundo,
    diaSemana,
    dataISO: `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    horaFormatada: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
  };
}

/**
 * Converte perfil de usuário no setor operacional correspondente (se aplicável).
 */
export function perfilParaSetorOperacional(perfil: Perfil): SetorOperacional | null {
  switch (perfil) {
    case 'tecnico':
      return 'AT';
    case 'adm':
      return 'ADM';
    case 'estoquista':
      return 'ALMOXARIFADO';
    default:
      return null;
  }
}

/**
 * Verifica se o perfil possui restrição de janela de horário (AT, ADM e Almoxarifado).
 */
export function isPerfilRestritoHorario(perfil: Perfil): boolean {
  return perfil === 'tecnico' || perfil === 'adm' || perfil === 'estoquista';
}

/**
 * Verifica se o instante `now` está dentro do horário de funcionamento (R06 / D9):
 * Segunda a Sexta-feira (não feriado), das 07:30h às 19:30h (America/Recife, 19:30 exclusivo).
 */
export function estaDentroDoHorarioComercial(
  now: Date = new Date(),
  feriados: string[] = FERIADOS_DATAS_PADRAO,
): boolean {
  return dentroDaJanela(now, feriados);
}

/**
 * Calcula o instante exato em que uma notificação deve ser entregue.
 * - Se gerada dentro do horário comercial (seg-sex não feriado, 07:30 às 19:30), é entregue imediatamente.
 * - Se gerada fora do horário, fica retida e é entregue às 07:30h do próximo dia útil (não feriado).
 */
export function calcularEntregaNotificacao(
  criadaEm: Date = new Date(),
  feriados: string[] = FERIADOS_DATAS_PADRAO,
): {
  retida: boolean;
  entregueEm: Date;
  entregueEmBR: string;
} {
  const dentro = estaDentroDoHorarioComercial(criadaEm, feriados);
  const entregueEm = dentro ? new Date(criadaEm.getTime()) : entregarEm(criadaEm, feriados);
  const pFinal = extrairPartesBR(entregueEm);

  return {
    retida: !dentro,
    entregueEm,
    entregueEmBR: `${pFinal.dataISO.split('-').reverse().join('/')} às ${dentro ? `${pFinal.horaFormatada}h` : '07:30h'}`,
  };
}

export interface ResultadoVerificacaoHorario {
  permitido: boolean;
  restritoPorPerfil: boolean;
  setor: SetorOperacional | null;
  mensagem: string | null;
  diaSemanaLabel: string;
  horaAtualLabel: string;
  proximaAberturaLabel: string;
}

/**
 * Verifica se um perfil pode acessar a plataforma no instante informado.
 */
export function verificarAcessoHorario(
  perfil: Perfil,
  now: Date = new Date(),
  options?: { enforceSchedule?: boolean; feriados?: string[] },
): ResultadoVerificacaoHorario {
  const partes = extrairPartesBR(now);
  const diaSemanaLabel = DIAS_SEMANA_PT[partes.diaSemana] ?? 'Dia';
  const horaAtualLabel = `${partes.horaFormatada}h`;
  const setor = perfilParaSetorOperacional(perfil);
  const restrito = isPerfilRestritoHorario(perfil);
  const feriados = options?.feriados ?? FERIADOS_DATAS_PADRAO;

  // MODO TESTE / HOMOLOGAÇÃO:
  // Libera acesso 24h até validação final do cliente; após validação ativar NEXT_PUBLIC_ENABLE_SCHEDULE_RESTRICTION=true.
  const forcarAtivacao =
    options?.enforceSchedule ??
    ((typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_ENABLE_SCHEDULE_RESTRICTION === 'true') ||
      (typeof process !== 'undefined' && Boolean(process.env.VITEST)));

  if (!forcarAtivacao) {
    return {
      permitido: true,
      restritoPorPerfil: restrito,
      setor,
      mensagem: null,
      diaSemanaLabel,
      horaAtualLabel,
      proximaAberturaLabel: 'Acesso liberado 24h durante validação',
    };
  }

  if (!restrito) {
    return {
      permitido: true,
      restritoPorPerfil: false,
      setor,
      mensagem: null,
      diaSemanaLabel,
      horaAtualLabel,
      proximaAberturaLabel: 'Acesso integral liberado',
    };
  }

  if (estaDentroDoHorarioComercial(now, feriados)) {
    return {
      permitido: true,
      restritoPorPerfil: true,
      setor,
      mensagem: null,
      diaSemanaLabel,
      horaAtualLabel,
      proximaAberturaLabel: 'Dentro do horário comercial (07:30h às 19:30h)',
    };
  }

  const entrega = calcularEntregaNotificacao(now, feriados);
  const nomeSetor = setor ? SETOR_OPERACIONAL_LABEL[setor] : 'Operacional';

  return {
    permitido: false,
    restritoPorPerfil: true,
    setor,
    mensagem: `Acesso permitido de segunda a sexta, das 07:30 às 19:30 (${nomeSetor}).`,
    diaSemanaLabel,
    horaAtualLabel,
    proximaAberturaLabel: entrega.entregueEmBR,
  };
}

/**
 * Verifica se uma notificação já pode ser exibida como entregue ao setor destinatário (Caso T15).
 */
export function notificacaoEstaEntregue(
  entregueEm: Date | string,
  now: Date = new Date(),
): boolean {
  const dtEntrega = typeof entregueEm === 'string' ? new Date(entregueEm) : entregueEm;
  return now.getTime() >= dtEntrega.getTime();
}

