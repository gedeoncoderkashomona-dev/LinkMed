'use client';

export type RuleNoticeSeverity = 'warning' | 'blocked' | 'info';

export interface RuleNoticePayload {
  title?: string;
  message: string;
  sectorLabel?: string;
  hint?: string;
  severity?: RuleNoticeSeverity;
}

export interface ResolvedRuleNotice {
  id: number;
  title: string;
  message: string;
  sectorLabel: string | null;
  hint: string | null;
  severity: RuleNoticeSeverity;
}

type Listener = (queue: ResolvedRuleNotice[]) => void;

let nextNoticeId = 1;
let queue: ResolvedRuleNotice[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  const snapshot = [...queue];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function inferSectorLabel(text: string): string | null {
  const lower = text.toLowerCase();
  const hasAdm =
    /\badm\b/.test(lower) ||
    lower.includes('setor administrativo') ||
    lower.includes('reg-022') ||
    lower.includes('reg 022');
  const hasAt =
    /\bat\b/.test(lower) ||
    lower.includes('assistência técnica') ||
    lower.includes('assistencia tecnica') ||
    lower.includes('técnico') ||
    lower.includes('tecnico') ||
    lower.includes('reg-034') ||
    lower.includes('reg 034') ||
    lower.includes('reg-016') ||
    lower.includes('reg 016') ||
    lower.includes('reg-035') ||
    lower.includes('reg 035');
  const hasAlmox =
    lower.includes('almoxarifado') ||
    lower.includes('estoquista') ||
    lower.includes('peças') ||
    lower.includes('pecas');

  const partes: string[] = [];
  if (hasAdm && lower.includes('responsabilidade do setor adm')) {
    return 'Setor Administrativo (ADM)';
  }
  if (hasAt && lower.includes('responsabilidade do setor at')) {
    return 'Assistência Técnica (AT)';
  }
  if (hasAlmox && lower.includes('responsabilidade do setor almoxarifado')) {
    return 'Almoxarifado / Estoque';
  }

  if (lower.includes('setor adm') || lower.includes('administrativo (adm)')) {
    partes.push('Administrativo (ADM)');
  }
  if (lower.includes('assistência técnica (at)') || lower.includes('setor at')) {
    partes.push('Assistência Técnica (AT)');
  }
  if (lower.includes('almoxarifado')) {
    partes.push('Almoxarifado');
  }

  if (partes.length > 0) {
    return Array.from(new Set(partes)).join(' · ');
  }
  if (hasAdm && !hasAt) return 'Setor Administrativo (ADM)';
  if (hasAt && !hasAdm) return 'Assistência Técnica (AT)';
  if (hasAlmox) return 'Almoxarifado / Estoque';
  return null;
}

function inferTitleAndHint(
  message: string,
  overrides?: Partial<RuleNoticePayload>,
): { title: string; hint: string | null; severity: RuleNoticeSeverity } {
  const lower = message.toLowerCase();

  let title = overrides?.title?.trim() || 'Regra do Fluxo Operacional';
  let hint: string | null = overrides?.hint?.trim() || null;
  let severity: RuleNoticeSeverity = overrides?.severity ?? 'warning';

  if (lower.includes('vermelha') || lower.includes('reprovado')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'OS com Orçamento Reprovado (Etiqueta Vermelha)';
    if (!hint) {
      hint =
        'Toda OS inicia no REG-022 (ADM) e o REG-035 só fica disponível quando o serviço é aprovado e finalizado pela AT com Etiqueta VERDE.';
    }
  } else if (lower.includes('acesso ou transição não concluída') || lower.includes('estado inicial')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Acesso ou Transição Não Concluída';
    if (!hint) {
      hint =
        'Para que o fluxo ocorra corretamente, toda OS deve começar no REG-022 (Inspeção de Recebimento) preenchido pelo Setor Administrativo (ADM).';
    }
  } else if (lower.includes('responsabilidade do setor') || lower.includes('não tem permissão')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Ação Exclusiva de Outro Setor';
    if (!hint) {
      hint =
        'Cada setor assume sua etapa na trilha POP-020 (REG-022 ADM → REG-034 AT → REG-016 Central → REG-035 Pós-Serviço). Aguarde o setor responsável concluir ou acesse com o perfil correspondente.';
    }
  } else if (lower.includes('pré-requisito') || lower.includes('conclua primeiro')) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'Etapa Anterior Obrigatória';
    if (!hint) {
      hint =
        'Siga a ordem oficial do POP-020: 1º REG-022 (ADM) → 2º REG-034 (AT) → 3º REG-016 (Central AT) → 4º REG-035 (após Etiqueta VERDE).';
    }
  } else if (lower.includes('horário') || lower.includes('horario')) {
    severity = overrides?.severity ?? 'info';
    if (!overrides?.title) title = 'Fora do Horário Comercial';
  }

  return { title, hint, severity };
}

/**
 * Exibe um pop-up centralizado responsivo que só fecha ao clicar em "Entendi".
 */
export function showRuleNotice(input: string | RuleNoticePayload): void {
  const payload: RuleNoticePayload = typeof input === 'string' ? { message: input } : input;
  const cleanMessage = String(payload.message ?? '').trim();
  if (!cleanMessage) return;

  const { title, hint, severity } = inferTitleAndHint(cleanMessage, payload);
  const sectorLabel = payload.sectorLabel?.trim() || inferSectorLabel(cleanMessage);

  // Evita duplicar exatamente o mesmo aviso no topo da fila
  const current = queue[0];
  if (current && current.message === cleanMessage && current.title === title) {
    return;
  }

  queue = [
    ...queue,
    {
      id: nextNoticeId++,
      title,
      message: cleanMessage,
      sectorLabel,
      hint,
      severity,
    },
  ];
  notify();
}

export function dismissCurrentRuleNotice(): void {
  if (queue.length === 0) return;
  queue = queue.slice(1);
  notify();
}

export function subscribeRuleNotices(listener: Listener): () => void {
  listeners.add(listener);
  listener([...queue]);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Identifica se uma mensagem de erro pertence às regras de fluxo POP-020,
 * permissões setoriais ou pré-requisitos operacionais (exibindo no pop-up "Entendi").
 */
export function isRuleErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('pop-020') ||
    lower.includes('reg-022') ||
    lower.includes('reg 022') ||
    lower.includes('reg-034') ||
    lower.includes('reg 034') ||
    lower.includes('reg-016') ||
    lower.includes('reg 016') ||
    lower.includes('reg-035') ||
    lower.includes('reg 035') ||
    lower.includes('etiqueta') ||
    lower.includes('pré-requisito') ||
    lower.includes('responsabilidade do setor') ||
    lower.includes('não tem permissão') ||
    lower.includes('acesso ou transição') ||
    lower.includes('cancelada') ||
    lower.includes('já existe uma os') ||
    lower.includes('apenas o próprio usuário') ||
    lower.includes('bloqueado') ||
    lower.includes('etapa') ||
    lower.includes('fluxo')
  );
}
