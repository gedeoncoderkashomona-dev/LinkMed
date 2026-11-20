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
  if (
    lower.includes('responsabilidade do setor adm') ||
    lower.includes('perfil adm') ||
    lower.includes('só o adm') ||
    lower.includes('ao adm')
  ) {
    return 'Setor Administrativo (ADM)';
  }
  if (
    lower.includes('responsabilidade do setor at') ||
    lower.includes('perfil at')
  ) {
    return 'Assistência Técnica (AT)';
  }
  if (
    lower.includes('responsabilidade do setor almoxarifado') ||
    lower.includes('perfil almoxarifado')
  ) {
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
        'Quando uma OS possui Etiqueta VERMELHA no histórico efetivo, o Item 5 (REG-009 / REG-035) fica bloqueado definitivamente.';
    }
  } else if (lower.includes('os mudou') || lower.includes('(versao)') || lower.includes('recarregue a tela')) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'OS Atualizada por Outro Setor';
    if (!hint) {
      hint =
        'Outro usuário registrou uma transição nesta OS após você abrir a tela. Os dados serão recarregados com a versão mais recente.';
    }
  } else if (lower.includes('item 5') || lower.includes('item5')) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'Preenchimento Obrigatório do Item 5 (REG-009 / REG-035)';
    if (!hint) {
      hint =
        'Antes de concluir o serviço com Etiqueta VERDE, preencha a seção "5. Item 5" no REG-016 ou o checklist equivalente por marca.';
    }
  } else if (lower.includes('dono do login corrige') || lower.includes('correção') || lower.includes('(correcao)')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Correção Exclusiva do Autor';
    if (!hint) {
      hint =
        'Apenas quem executou a última ação pode corrigi-la antes que outro setor atue. Para retornar a etapas anteriores, solicite estorno ao ADM.';
    }
  } else if (lower.includes('estorn') || lower.includes('(estorno)')) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'Regra de Estorno (ADM)';
    if (!hint) {
      hint =
        'O estorno é exclusivo do perfil ADM e exige informar a justificativa e um nó já percorrido pela OS.';
    }
  } else if (lower.includes('não é permitida no nó') || lower.includes('(transicao)')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Etapa Fora da Sequência da OS';
    if (!hint) {
      hint =
        'AOS atual avançou ou encontra-se em outra etapa do fluxo v4. Utilize apenas as ações liberadas na seção "Próxima ação".';
    }
  } else if (lower.includes('acesso ou transição não concluída') || lower.includes('estado inicial')) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Acesso ou Transição Não Concluída';
    if (!hint) {
      hint =
        'Para que o fluxo ocorra corretamente, toda OS deve começar no REG-022 (Inspeção de Recebimento) preenchido pelo Setor Administrativo (ADM).';
    }
  } else if (
    lower.includes('responsabilidade do setor') ||
    lower.includes('não tem permissão') ||
    lower.includes('esta ação é do perfil') ||
    lower.includes('só o adm') ||
    lower.includes('só adm') ||
    lower.includes('governança')
  ) {
    severity = overrides?.severity ?? 'blocked';
    if (!overrides?.title) title = 'Ação Exclusiva de Outro Setor';
    if (!hint) {
      hint =
        'Cada setor executa somente as etapas atribuídas ao seu perfil (ADM, AT ou Almoxarifado) no fluxo oficial da OS.';
    }
  } else if (
    lower.includes('pré-requisito') ||
    lower.includes('conclua primeiro') ||
    lower.includes('salve o reg 034') ||
    lower.includes('(reg)')
  ) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'Etapa Anterior Obrigatória';
    if (!hint) {
      hint =
        'Salve o formulário exigido (ex.: REG-022 pelo ADM ou REG-034 pela AT) antes de avançar para a próxima etapa.';
    }
  } else if (lower.includes('horário') || lower.includes('horario') || lower.includes('segunda a sexta')) {
    severity = overrides?.severity ?? 'info';
    if (!overrides?.title) title = 'Fora da Janela de Horário Comercial';
    if (!hint) {
      hint = 'O fluxo operacional funciona de segunda a sexta-feira, das 07:30 às 19:30 (horário do Recife/PE, exceto feriados).';
    }
  } else if (lower.includes('informe o motivo') || lower.includes('preencha:') || lower.includes('(motivo)') || lower.includes('(campo)')) {
    severity = overrides?.severity ?? 'warning';
    if (!overrides?.title) title = 'Informação Obrigatória Pendente';
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
    lower.includes('reg-009') ||
    lower.includes('reg 009') ||
    lower.includes('item 5') ||
    lower.includes('etiqueta') ||
    lower.includes('pré-requisito') ||
    lower.includes('responsabilidade do setor') ||
    lower.includes('não tem permissão') ||
    lower.includes('esta ação é do perfil') ||
    lower.includes('só o adm') ||
    lower.includes('só adm') ||
    lower.includes('dono do login') ||
    lower.includes('estorn') ||
    lower.includes('não é permitida no nó') ||
    lower.includes('os mudou') ||
    lower.includes('recarregue a tela') ||
    lower.includes('acesso ou transição') ||
    lower.includes('acesso permitido de segunda') ||
    lower.includes('cancelada') ||
    lower.includes('já existe uma os') ||
    lower.includes('apenas o próprio usuário') ||
    lower.includes('apenas o setor') ||
    lower.includes('informe o motivo') ||
    lower.includes('informe a justificativa') ||
    lower.includes('preencha:') ||
    lower.includes('bloqueado') ||
    lower.includes('etapa') ||
    lower.includes('fluxo') ||
    lower.includes('governança') ||
    /\((versao|horario|perfil|transicao|campo|reg|item5|correcao|estorno|motivo|estado)\)/.test(
      lower,
    )
  );
}
