import type { Perfil } from './enums/user';

/**
 * Regras de horário de acesso e entrega de notificações (Seção 5.1 do Documento Principal
 * e Seção 3 do Documento de Apoio).
 *
 * - Horário permitido para AT, ADM e Almoxarifado: Segunda a sexta-feira, das 07:30h às 19:30h (America/Sao_Paulo).
 * - Fora do horário, os logins (AT, ADM e Almoxarifado) não conseguem acessar a plataforma e veem mensagem explicativa.
 * - Notificações só são entregues dentro do horário. As geradas fora dele ficam retidas e são entregues
 *   na abertura seguinte (07:30h do próximo dia útil).
 */

export type SetorOperacional = 'AT' | 'ADM' | 'ALMOXARIFADO';

export const SETOR_OPERACIONAL_LABEL: Record<SetorOperacional, string> = {
  AT: 'Assistência Técnica (AT)',
  ADM: 'Administrativo (ADM)',
  ALMOXARIFADO: 'Almoxarifado',
};

const TZ = 'America/Sao_Paulo';

export const HORARIO_ABERTURA_MINUTOS = 7 * 60 + 30; // 07:30 = 450 min
export const HORARIO_FECHAMENTO_MINUTOS = 19 * 60 + 30; // 19:30 = 1170 min

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
 * Verifica se o instante `now` está dentro do horário de funcionamento:
 * Segunda a Sexta-feira, das 07:30h às 19:30h (horário de Brasília).
 */
export function estaDentroDoHorarioComercial(now: Date = new Date()): boolean {
  const { diaSemana, hora, minuto } = extrairPartesBR(now);
  if (diaSemana === 0 || diaSemana === 6) {
    return false;
  }
  const minutosDoDia = hora * 60 + minuto;
  return (
    minutosDoDia >= HORARIO_ABERTURA_MINUTOS &&
    minutosDoDia <= HORARIO_FECHAMENTO_MINUTOS
  );
}

/**
 * Constrói um Date UTC correspondente a YYYY-MM-DD HH:MM:00 no fuso America/Sao_Paulo (-03:00).
 */
function criarDataBrasilia(ano: number, mes: number, dia: number, hora = 7, minuto = 30): Date {
  // 07:30 BRT (-03:00) = 10:30 UTC
  return new Date(Date.UTC(ano, mes - 1, dia, hora + 3, minuto, 0, 0));
}

/**
 * Calcula o instante exato em que uma notificação deve ser entregue.
 * - Se gerada dentro do horário comercial (seg-sex, 07:30 às 19:30), é entregue imediatamente.
 * - Se gerada fora do horário, fica retida e é entregue às 07:30h do próximo dia útil.
 */
export function calcularEntregaNotificacao(criadaEm: Date = new Date()): {
  retida: boolean;
  entregueEm: Date;
  entregueEmBR: string;
} {
  if (estaDentroDoHorarioComercial(criadaEm)) {
    const p = extrairPartesBR(criadaEm);
    return {
      retida: false,
      entregueEm: new Date(criadaEm.getTime()),
      entregueEmBR: `${p.dataISO.split('-').reverse().join('/')} às ${p.horaFormatada}h`,
    };
  }

  const { ano, mes, dia, diaSemana, hora, minuto } = extrairPartesBR(criadaEm);
  const minutosDoDia = hora * 60 + minuto;

  let diasParaSomar = 0;

  if (diaSemana >= 1 && diaSemana <= 5 && minutosDoDia < HORARIO_ABERTURA_MINUTOS) {
    // Mesmo dia útil às 07:30h
    diasParaSomar = 0;
  } else if (diaSemana >= 1 && diaSemana <= 4 && minutosDoDia > HORARIO_FECHAMENTO_MINUTOS) {
    // Segunda a quinta após 19:30h -> dia seguinte às 07:30h
    diasParaSomar = 1;
  } else if (diaSemana === 5 && minutosDoDia > HORARIO_FECHAMENTO_MINUTOS) {
    // Sexta após 19:30h -> segunda-feira (+3 dias) às 07:30h
    diasParaSomar = 3;
  } else if (diaSemana === 6) {
    // Sábado -> segunda-feira (+2 dias) às 07:30h
    diasParaSomar = 2;
  } else if (diaSemana === 0) {
    // Domingo -> segunda-feira (+1 dia) às 07:30h
    diasParaSomar = 1;
  }

  const baseUtc = new Date(Date.UTC(ano, mes - 1, dia + diasParaSomar, 10, 30, 0, 0));
  const pEntrega = extrairPartesBR(baseUtc);
  const entregueEm = criarDataBrasilia(pEntrega.ano, pEntrega.mes, pEntrega.dia, 7, 30);
  const pFinal = extrairPartesBR(entregueEm);

  return {
    retida: true,
    entregueEm,
    entregueEmBR: `${pFinal.dataISO.split('-').reverse().join('/')} às 07:30h`,
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
 * Verifica se um perfil pode acessar a plataforma no instante informado (Caso de teste T14).
 */
export function verificarAcessoHorario(
  perfil: Perfil,
  now: Date = new Date(),
): ResultadoVerificacaoHorario {
  const partes = extrairPartesBR(now);
  const diaSemanaLabel = DIAS_SEMANA_PT[partes.diaSemana] ?? 'Dia';
  const horaAtualLabel = `${partes.horaFormatada}h`;
  const setor = perfilParaSetorOperacional(perfil);
  const restrito = isPerfilRestritoHorario(perfil);

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

  if (estaDentroDoHorarioComercial(now)) {
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

  const entrega = calcularEntregaNotificacao(now);
  const nomeSetor = setor ? SETOR_OPERACIONAL_LABEL[setor] : 'Operacional';

  return {
    permitido: false,
    restritoPorPerfil: true,
    setor,
    mensagem: `Acesso restrito fora do horário de expediente para o perfil ${nomeSetor}. O uso da plataforma é permitido exclusivamente de segunda a sexta-feira, das 07:30h às 19:30h.`,
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

