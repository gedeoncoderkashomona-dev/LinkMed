import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes Tailwind sem conflitos.
 * Uso: cn('p-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata datas ISO (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ss.sssZ`) para `DD/MM/AAAA`
 * sem corromper o dia com o sufixo `T...Z`.
 */
export function formatarDataCurtaBR(valor?: string | Date | null): string {
  if (!valor) return '—';
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(valor);
  }
  const limpo = String(valor).trim();
  if (!limpo) return '—';
  const isoDate = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  }
  const dt = new Date(limpo);
  if (!Number.isNaN(dt.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dt);
  }
  return limpo;
}

/**
 * Formata o identificador da OS evitando prefixo duplicado (`OS OS-2026-0101`).
 */
export function formatarCodigoOs(numeroOs?: string | null): string {
  const limpo = String(numeroOs ?? '').trim();
  if (!limpo || limpo.toUpperCase() === 'S/N') return 'OS S/N';
  if (/^OS[\s\-_]/i.test(limpo) || /^OS\d/i.test(limpo)) {
    return limpo.toUpperCase();
  }
  return `OS ${limpo}`;
}