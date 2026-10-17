import {
  ALERTA_CALIBRACAO_DIAS,
  FAIXA_TEMPERATURA_MAX,
  FAIXA_UMIDADE,
} from './definitions';

/**
 * Regras de alerta dos formulários operacionais. Funções puras: recebem os
 * registros e a data atual e devolvem os alertas — fáceis de testar.
 */

export type NivelAlerta = 'info' | 'warning' | 'danger';

export interface Alerta {
  id: string;
  nivel: NivelAlerta;
  titulo: string;
  descricao: string;
  href: string;
}

/** Subconjunto mínimo de um registro necessário para calcular alertas. */
export interface RegistroParaAlerta {
  tipo: string;
  dataRef: string; // YYYY-MM-DD
  dados: Record<string, unknown>;
}

const TZ = 'America/Sao_Paulo';

/** Data (YYYY-MM-DD) e hora atuais no fuso de Brasília. */
export function agoraBR(now: Date = new Date()): { data: string; hora: number; diaSemana: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    data: `${get('year')}-${get('month')}-${get('day')}`,
    hora: Number(get('hour')) % 24,
    diaSemana: dias.indexOf(get('weekday')), // 0 = domingo
  };
}

function paraUtc(data: string): number {
  const [y, m, d] = data.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Diferença em dias inteiros: (b - a). */
export function diffDias(a: string, b: string): number {
  return Math.round((paraUtc(b) - paraUtc(a)) / 86_400_000);
}

/** Segunda-feira da semana de `data`. */
export function inicioDaSemana(data: string, diaSemana: number): string {
  const offset = (diaSemana + 6) % 7; // segunda = 0
  const d = new Date(paraUtc(data) - offset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function alertaHigienizacaoBancada(
  registros: RegistroParaAlerta[],
  now: Date = new Date(),
): Alerta | null {
  const { data, diaSemana } = agoraBR(now);
  const inicio = inicioDaSemana(data, diaSemana);
  const feito = registros.some(
    (r) => r.tipo === 'higienizacao-bancada' && r.dataRef >= inicio && r.dataRef <= data,
  );
  if (feito) return null;

  // Fim de semana: não cobra (a próxima cobrança é na segunda).
  if (diaSemana === 0 || diaSemana === 6) return null;

  const atrasada = diaSemana >= 3; // a partir de quarta, passou do "início da semana"
  return {
    id: 'higienizacao-bancada',
    nivel: atrasada ? 'danger' : 'warning',
    titulo: atrasada ? 'Higienização da bancada atrasada' : 'Higienização da bancada pendente',
    descricao: 'A higienização é feita 1x por semana, sempre no início da semana.',
    href: '/formularios/higienizacao-bancada',
  };
}

export function alertaTemperaturaUmidade(
  registros: RegistroParaAlerta[],
  now: Date = new Date(),
): Alerta | null {
  const { data, hora } = agoraBR(now);
  const hoje = registros.filter((r) => r.tipo === 'temperatura-umidade' && r.dataRef === data);
  const periodos = new Set(hoje.map((r) => String(r.dados.periodo)));

  const faltando: string[] = [];
  if (!periodos.has('manha')) faltando.push('manhã');
  if (!periodos.has('tarde') && hora >= 12) faltando.push('tarde');
  if (faltando.length === 0) return null;

  // Manhã sem registro só vira cobrança depois das 9h.
  if (faltando.length === 1 && faltando[0] === 'manhã' && hora < 9) return null;

  return {
    id: 'temperatura-umidade',
    nivel: hora >= 17 ? 'danger' : 'warning',
    titulo: 'Controle de temperatura e umidade pendente',
    descricao: `Registrar duas vezes ao dia. Pendente: ${faltando.join(' e ')}.`,
    href: '/formularios/temperatura-umidade',
  };
}

export function alertaLeituraForaDaFaixa(registros: RegistroParaAlerta[], now: Date = new Date()): Alerta | null {
  const { data } = agoraBR(now);
  const fora = registros.filter((r) => {
    if (r.tipo !== 'temperatura-umidade' || r.dataRef !== data) return false;
    const t = Number(r.dados.temperatura_atual);
    const u = Number(r.dados.umidade_atual);
    return t > FAIXA_TEMPERATURA_MAX || u < FAIXA_UMIDADE.min || u > FAIXA_UMIDADE.max;
  });
  if (fora.length === 0) return null;
  return {
    id: 'temperatura-fora-faixa',
    nivel: 'danger',
    titulo: 'Leitura fora dos limites permitidos',
    descricao: 'Faça outra medição em horário diferente do dia e registre a observação.',
    href: '/formularios/temperatura-umidade',
  };
}

export interface CalibracaoStatus {
  chave: string;
  equipamento: string;
  numeroSerie: string;
  validade: string;
  diasRestantes: number;
  situacao: 'vencida' | 'a_vencer' | 'vigente';
}

/** Última calibração de cada equipamento (por nº de série) e sua situação. */
export function statusCalibracoes(
  registros: RegistroParaAlerta[],
  now: Date = new Date(),
): CalibracaoStatus[] {
  const { data } = agoraBR(now);
  const ultimas = new Map<string, RegistroParaAlerta>();

  for (const r of registros) {
    if (r.tipo !== 'validade-calibracao') continue;
    const chave = `${String(r.dados.equipamento)}|${String(r.dados.numero_serie)}`.toLowerCase();
    const atual = ultimas.get(chave);
    if (!atual || String(r.dados.validade) > String(atual.dados.validade)) ultimas.set(chave, r);
  }

  return [...ultimas.entries()]
    .map(([chave, r]) => {
      const validade = String(r.dados.validade ?? '');
      const diasRestantes = diffDias(data, validade);
      const situacao: CalibracaoStatus['situacao'] =
        diasRestantes < 0 ? 'vencida' : diasRestantes <= ALERTA_CALIBRACAO_DIAS ? 'a_vencer' : 'vigente';
      return {
        chave,
        equipamento: String(r.dados.equipamento ?? ''),
        numeroSerie: String(r.dados.numero_serie ?? ''),
        validade,
        diasRestantes,
        situacao,
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

export function alertasCalibracao(registros: RegistroParaAlerta[], now: Date = new Date()): Alerta[] {
  return statusCalibracoes(registros, now)
    .filter((c) => c.situacao !== 'vigente')
    .map((c) => ({
      id: `calibracao-${c.chave}`,
      nivel: c.situacao === 'vencida' ? 'danger' : 'warning',
      titulo:
        c.situacao === 'vencida'
          ? `Calibração vencida: ${c.equipamento}`
          : `Calibração vence em ${c.diasRestantes} dia(s): ${c.equipamento}`,
      descricao: `Nº de série ${c.numeroSerie || '—'} · validade ${c.validade.split('-').reverse().join('/')}.`,
      href: '/formularios/validade-calibracao',
    }));
}

/** Todos os alertas operacionais, ordenados por gravidade. */
export function calcularAlertas(registros: RegistroParaAlerta[], now: Date = new Date()): Alerta[] {
  const lista: Alerta[] = [
    alertaHigienizacaoBancada(registros, now),
    alertaTemperaturaUmidade(registros, now),
    alertaLeituraForaDaFaixa(registros, now),
    ...alertasCalibracao(registros, now),
  ].filter((a): a is Alerta => a !== null);

  const peso: Record<NivelAlerta, number> = { danger: 0, warning: 1, info: 2 };
  return lista.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
