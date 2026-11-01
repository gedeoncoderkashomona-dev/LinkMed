import {
  calcularEntregaNotificacao,
  extrairPartesBR,
  type SetorOperacional,
} from '@/core/domain/access-schedule';

export { calcularEntregaNotificacao, type SetorOperacional };

function dataIsoParaUtcMs(dataIso: string): number {
  const [y, m, d] = dataIso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * Calcula a diferença em dias corridos (calendário em Brasília) entre duas datas.
 */
export function diffDiasDatas(inicio: Date, fim: Date): number {
  const d1 = extrairPartesBR(inicio).dataISO;
  const d2 = extrairPartesBR(fim).dataISO;
  return Math.round((dataIsoParaUtcMs(d2) - dataIsoParaUtcMs(d1)) / 86_400_000);
}

