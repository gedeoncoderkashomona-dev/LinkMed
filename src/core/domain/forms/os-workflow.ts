import type { FormRecord } from '@/core/domain/entities/operacional';
import type { FormTipo } from './definitions';

/**
 * Cores das Etiquetas Físicas / Visuais definidas no REG-016 e POP-020.
 */
export type TagColor =
  | 'VIOLET' // Higienizado (REG-034)
  | 'WHITE' // Aguardando Análise
  | 'GRAY' // Análise Completa
  | 'ORANGE' // Em Garantia de Fábrica
  | 'YELLOW' // Aguardando Aprovação de Orçamento
  | 'BROWN' // Enviado à Fábrica
  | 'BLUE' // Orçamento Aprovado
  | 'BLACK' // Aguardando Peças (Estoque Zerado)
  | 'RED' // Orçamento Não Aprovado / Recusado
  | 'GREEN'; // Serviço Finalizado e Aprovado no CQ

export type OSStatus =
  | 'HIGIENIZADO'
  | 'AGUARDANDO_ANALISE'
  | 'ANALISE_CONCLUIDA'
  | 'EM_GARANTIA'
  | 'AGUARDANDO_APROVACAO_ORCAMENTO'
  | 'ENVIADO_FABRICA'
  | 'ORCAMENTO_APROVADO'
  | 'AGUARDANDO_PECAS'
  | 'ORCAMENTO_RECUSADO'
  | 'SERVICO_FINALIZADO';

export interface TagSpec {
  color: TagColor;
  status: OSStatus;
  nomeCor: string;
  labelStatus: string;
  hex: string;
  regraOperacional: string;
  badgeClass: string;
  dotClass: string;
}

export const TAG_SPECS: Record<TagColor, TagSpec> = {
  VIOLET: {
    color: 'VIOLET',
    status: 'HIGIENIZADO',
    nomeCor: 'Violeta',
    labelStatus: 'Equipamento Higienizado',
    hex: '#8A2BE2',
    regraOperacional: 'Aplicada após limpeza com Álcool 70% e registro no REG-034.',
    badgeClass: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dotClass: 'bg-violet-600',
  },
  WHITE: {
    color: 'WHITE',
    status: 'AGUARDANDO_ANALISE',
    nomeCor: 'Branca / Transparente',
    labelStatus: 'Aguardando Análise',
    hex: '#FFFFFF',
    regraOperacional: 'Status inicial no REG-016 aguardando triagem do técnico na bancada.',
    badgeClass: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    dotClass: 'bg-slate-300 border border-slate-500',
  },
  GRAY: {
    color: 'GRAY',
    status: 'ANALISE_CONCLUIDA',
    nomeCor: 'Cinza',
    labelStatus: 'Análise Completa',
    hex: '#808080',
    regraOperacional: 'Diagnóstico concluído, falhas identificadas e lançadas na OS.',
    badgeClass: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
    dotClass: 'bg-zinc-500',
  },
  ORANGE: {
    color: 'ORANGE',
    status: 'EM_GARANTIA',
    nomeCor: 'Laranja',
    labelStatus: 'Equipamento em Garantia',
    hex: '#FFA500',
    regraOperacional: 'Equipamento dentro do prazo de garantia (validado via NF de compra).',
    badgeClass: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
  YELLOW: {
    color: 'YELLOW',
    status: 'AGUARDANDO_APROVACAO_ORCAMENTO',
    nomeCor: 'Amarela',
    labelStatus: 'Aguardando Aprovação do Orçamento',
    hex: '#FFD700',
    regraOperacional: 'Orçamento gerado e enviado ao cliente para aprovação.',
    badgeClass: 'border-amber-500/40 bg-amber-400/20 text-amber-800 dark:text-amber-300',
    dotClass: 'bg-amber-400',
  },
  BROWN: {
    color: 'BROWN',
    status: 'ENVIADO_FABRICA',
    nomeCor: 'Marrom',
    labelStatus: 'Enviado à Fábrica',
    hex: '#8B4513',
    regraOperacional: 'Encaminhado ao fabricante; exige seleção da modalidade de transporte.',
    badgeClass: 'border-amber-800/40 bg-amber-900/15 text-amber-900 dark:text-amber-200',
    dotClass: 'bg-amber-800',
  },
  BLUE: {
    color: 'BLUE',
    status: 'ORCAMENTO_APROVADO',
    nomeCor: 'Azul',
    labelStatus: 'Orçamento Aprovado',
    hex: '#0000FF',
    regraOperacional: 'Cliente autorizou o serviço; libera separação de peças no Armazém 1.',
    badgeClass: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-600',
  },
  BLACK: {
    color: 'BLACK',
    status: 'AGUARDANDO_PECAS',
    nomeCor: 'Preta',
    labelStatus: 'Aguardando Peças',
    hex: '#000000',
    regraOperacional: 'Falta de componente em estoque; dispara pedido para Compras (POP-009).',
    badgeClass: 'border-neutral-800 bg-neutral-900 text-white dark:border-neutral-600',
    dotClass: 'bg-neutral-950',
  },
  RED: {
    color: 'RED',
    status: 'ORCAMENTO_RECUSADO',
    nomeCor: 'Vermelha',
    labelStatus: 'Orçamento Não Aprovado',
    hex: '#FF0000',
    regraOperacional: 'Cliente recusou o orçamento; envia para Expedição e registro PSIE/INMETRO.',
    badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-600',
  },
  GREEN: {
    color: 'GREEN',
    status: 'SERVICO_FINALIZADO',
    nomeCor: 'Verde',
    labelStatus: 'Serviço Finalizado / CQ Aprovado',
    hex: '#008000',
    regraOperacional: 'Aprovado no Controle de Qualidade, testes funcionais e calibração (REG-030).',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-600',
  },
};

export const TAG_SPECS_LIST: TagSpec[] = Object.values(TAG_SPECS);

/**
 * Contexto Unificado de uma Ordem de Serviço / Equipamento, agregado
 * automaticamente a partir dos formulários operacionais (REG-022, REG-034,
 * REG-016, REG-035, REG-030).
 */
export interface ServiceOrderContext {
  chave: string;
  numeroOs: string;
  cliente: string;
  equipamento: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  acessorios: string;
  relatoCliente: string;
  diagnosticoTecnico: string;
  emGarantia: boolean;
  enviadoFabrica: boolean;
  tipoTransporte?: string;
  tagColor: TagColor;
  osStatus: OSStatus;
  ultimaAtualizacao: string;
  etapasConcluidas: {
    reg022Recebimento: boolean;
    reg034Limpeza: boolean;
    reg016Etapas: boolean;
    reg035Manutencao: boolean;
    reg030Calibracao: boolean;
  };
}

function inferirTagDoReg016(dados: Record<string, unknown>): TagColor {
  if (dados.liberado_qualidade === 'C' || dados.etiqueta_verde_sem_defeito === 'C') return 'GREEN';
  if (dados.orcamento_reprovado === 'C') return 'RED';
  if (dados.falta_itens_estoque === 'C') return 'BLACK';
  if (dados.orcamento_aprovado === 'C') return 'BLUE';
  if (Boolean(dados.enviado_fabrica)) return 'BROWN';
  if (dados.orcamento_enviado === 'C') return 'YELLOW';
  if (dados.etiqueta_laranja === 'C') return 'ORANGE';
  if (dados.etiqueta_cinza === 'C') return 'GRAY';
  if (dados.etiqueta_violeta === 'C') return 'VIOLET';
  return 'WHITE';
}

/**
 * Consolida os registros de formulários em uma lista de Ordens de Serviço / Equipamentos
 * com rastreabilidade das 5 etapas técnicas e etiqueta de cor atual (REG-016).
 */
export function aggregateServiceOrders(records: FormRecord[]): ServiceOrderContext[] {
  const map = new Map<string, ServiceOrderContext>();

  // Ordenar do mais antigo ao mais recente para evoluir o estado cumulativamente
  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const r of sorted) {
    const d = r.dados ?? {};
    const numOs = String(d.numero_os ?? '').trim();
    const numSerie = String(d.numero_serie ?? '').trim();
    const equip = String(d.equipamento ?? '').trim();

    if (!numOs && !numSerie) continue;

    // Procura primeiro por OS existente ou por número de série
    let chave = numOs ? `OS:${numOs.toUpperCase()}` : `SN:${numSerie.toUpperCase()}`;
    if (numOs && numSerie) {
      const snKey = `SN:${numSerie.toUpperCase()}`;
      if (map.has(snKey) && !map.has(chave)) {
        const anterior = map.get(snKey)!;
        map.delete(snKey);
        anterior.chave = chave;
        anterior.numeroOs = numOs;
        map.set(chave, anterior);
      }
    } else if (!numOs && numSerie) {
      // Se já existe uma OS com esse número de série, associa a ela
      for (const [k, v] of map.entries()) {
        if (v.numeroSerie.toUpperCase() === numSerie.toUpperCase()) {
          chave = k;
          break;
        }
      }
    }

    const atual: ServiceOrderContext = map.get(chave) ?? {
      chave,
      numeroOs: numOs || 'S/N',
      cliente: '',
      equipamento: '',
      marca: '',
      modelo: '',
      numeroSerie: numSerie,
      acessorios: '',
      relatoCliente: '',
      diagnosticoTecnico: '',
      emGarantia: false,
      enviadoFabrica: false,
      tagColor: 'WHITE',
      osStatus: 'AGUARDANDO_ANALISE',
      ultimaAtualizacao: r.dataRef,
      etapasConcluidas: {
        reg022Recebimento: false,
        reg034Limpeza: false,
        reg016Etapas: false,
        reg035Manutencao: false,
        reg030Calibracao: false,
      },
    };

    if (numOs) atual.numeroOs = numOs;
    if (numSerie) atual.numeroSerie = numSerie;
    if (d.cliente) atual.cliente = String(d.cliente);
    if (d.equipamento) atual.equipamento = String(d.equipamento);
    if (d.marca) atual.marca = String(d.marca);
    if (d.modelo) atual.modelo = String(d.modelo);
    if (d.marca_modelo && !atual.modelo) atual.modelo = String(d.marca_modelo);
    if (d.acessorios) atual.acessorios = String(d.acessorios);
    if (d.relato_cliente) atual.relatoCliente = String(d.relato_cliente);
    if (d.problema_cliente) atual.relatoCliente = String(d.problema_cliente);
    if (d.problema_tecnico) atual.diagnosticoTecnico = String(d.problema_tecnico);
    if (r.dataRef >= atual.ultimaAtualizacao) atual.ultimaAtualizacao = r.dataRef;

    switch (r.tipo) {
      case 'inspecao-recebimento':
        atual.etapasConcluidas.reg022Recebimento = true;
        break;
      case 'limpeza-equipamento':
        atual.etapasConcluidas.reg034Limpeza = true;
        if (atual.tagColor === 'WHITE') {
          atual.tagColor = 'VIOLET';
          atual.osStatus = TAG_SPECS.VIOLET.status;
        }
        break;
      case 'checklist-manutencao':
        atual.etapasConcluidas.reg035Manutencao = true;
        if (d.tipo_manutencao === 'garantia') {
          atual.emGarantia = true;
          atual.tagColor = 'ORANGE';
          atual.osStatus = TAG_SPECS.ORANGE.status;
        } else if (atual.tagColor === 'WHITE' || atual.tagColor === 'VIOLET') {
          atual.tagColor = 'GRAY';
          atual.osStatus = TAG_SPECS.GRAY.status;
        }
        break;
      case 'etapas-manutencao': {
        atual.etapasConcluidas.reg016Etapas = true;
        const cor = inferirTagDoReg016(d);
        atual.tagColor = cor;
        atual.osStatus = TAG_SPECS[cor].status;
        atual.enviadoFabrica = Boolean(d.enviado_fabrica);
        if (d.tipo_transporte) atual.tipoTransporte = String(d.tipo_transporte);
        if (d.etiqueta_laranja === 'C') atual.emGarantia = true;
        break;
      }
      case 'verificacao-calibracao':
        atual.etapasConcluidas.reg030Calibracao = true;
        if (d.resultado_final === 'conforme' || d.resultado_final === 'ajustado_aprovado') {
          atual.tagColor = 'GREEN';
          atual.osStatus = TAG_SPECS.GREEN.status;
        }
        break;
      default:
        break;
    }

    if (!atual.equipamento && equip) atual.equipamento = equip;
    map.set(chave, atual);
  }

  return [...map.values()].sort((a, b) => b.ultimaAtualizacao.localeCompare(a.ultimaAtualizacao));
}

/**
 * Gera os campos herdados automaticamente para autopreenchimento de um formulário
 * com base no Contexto Mestre da OS selecionada.
 */
export function hydrateFormFieldsFromOs(
  formTipo: FormTipo,
  ctx: ServiceOrderContext,
): Record<string, string | boolean> {
  const base: Record<string, string | boolean> = {};
  if (ctx.numeroOs && ctx.numeroOs !== 'S/N') base.numero_os = ctx.numeroOs;
  if (ctx.cliente) base.cliente = ctx.cliente;
  if (ctx.equipamento) base.equipamento = ctx.equipamento;
  if (ctx.marca) base.marca = ctx.marca;
  if (ctx.modelo) base.modelo = ctx.modelo;
  if (ctx.marca || ctx.modelo) {
    base.marca_modelo = [ctx.marca, ctx.modelo].filter(Boolean).join(' / ');
  }
  if (ctx.numeroSerie) base.numero_serie = ctx.numeroSerie;
  if (ctx.acessorios) base.acessorios = ctx.acessorios;
  if (ctx.relatoCliente) {
    base.relato_cliente = ctx.relatoCliente;
    base.problema_cliente = ctx.relatoCliente;
  }
  if (ctx.diagnosticoTecnico) {
    base.problema_tecnico = ctx.diagnosticoTecnico;
  }

  if (formTipo === 'etapas-manutencao') {
    if (ctx.etapasConcluidas.reg034Limpeza) base.etiqueta_violeta = 'C';
    if (ctx.etapasConcluidas.reg035Manutencao) base.etiqueta_cinza = 'C';
    if (ctx.emGarantia) base.etiqueta_laranja = 'C';
    if (ctx.etapasConcluidas.reg030Calibracao) base.etiqueta_calibracao = 'C';
  }

  return base;
}
