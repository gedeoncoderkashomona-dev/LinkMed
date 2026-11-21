import type { Perfil } from '@/core/domain/enums/user';
import { NODE_LABEL_PT, etiquetaV4ParaTagColor } from '@/core/domain/os-v4/adapter';
import { perfilSistemaParaSetorV4 } from '@/core/domain/os-v4/nucleo';

import {
  TAG_SPECS,
  determinarFormularioItem5PorMarca,
  type OrdemServicoFluxoState,
  type SetorOperacional,
  type TagColor,
  type TagSpec,
} from './os-workflow';

export interface AvisoOsEstruturado {
  id: string;
  tipoAviso: 'pendencia_etapa' | 'comunicacao_intersetorial';
  numeroOs: string;
  destinatarioSetor: SetorOperacional;
  titulo: string;
  descricao: string;
  etapaAtualPt: string;
  acaoSugeridaLabel: string;
  acaoSugeridaHref: string;
  formularioSecundarioLabel: string | null;
  formularioSecundarioHref: string | null;
  equipamentoResumo: string;
  tagColor: TagColor | null;
  tagSpec: TagSpec | null;
  ehLembrete: boolean;
  retidaAteIso: string | null;
  entregueEmIso: string | null;
  confirmadaEm: string | null;
  confirmadaPorNome: string | null;
  notifIdReal: string | null;
  nivel: 'info' | 'warning' | 'danger';
}

const INSTRUCAO_POR_NO: Record<string, string> = {
  AGUARDA_REG016:
    'Abrir o REG-016 no painel da OS para gerar a Etiqueta BRANCA e encaminhar à Assistência Técnica.',
  AT_RECEBER:
    'Confirmar recebimento da OS pela Assistência Técnica (AT) para iniciar a higienização no REG-034.',
  AT_REG034:
    'Preencher e salvar o formulário REG-034 (Limpeza e Higienização com Álcool 70%) desta OS.',
  AT_HIGIENIZAR:
    'Marcar o equipamento como higienizado no painel da OS para aplicar a Etiqueta VIOLETA.',
  EM_ANALISE:
    'Executar a análise técnica em bancada e concluir a análise para gerar a Etiqueta CINZA.',
  PERG_GARANTIA: 'Responder no painel da OS se o equipamento trata-se de garantia (Etiqueta LARANJA).',
  PERG_ENVIO: 'Definir se o equipamento terá envio à fábrica (com transporte) ou seguirá para orçamento.',
  AGUARDA_ENVIO:
    'Informar se o equipamento foi efetivamente enviado à fábrica (MARROM) ou justificar e encerrar.',
  AGUARDA_RETORNO:
    'Aguardar o retorno do equipamento da fábrica e finalizar o atendimento no painel (Etiqueta VERDE).',
  O_CONTATO: 'Setor ADM: contatar o cliente com o orçamento (Etiqueta AMARELA).',
  O_APROVACAO: 'Registrar a resposta do cliente: orçamento aprovado (AZUL) ou reprovado.',
  O_REPROVADO:
    'AT: confirmar ciência da reprovação do orçamento para encerrar com Etiqueta VERMELHA.',
  P_TRIAGEM:
    'Almoxarifado: verificar disponibilidade de peças (liberar peças ou aguardar compra — Etiqueta PRETA).',
  P_COMPRA:
    'Almoxarifado: ao concluir a compra/chegada das peças, liberar para a Assistência Técnica (POP 009).',
  P_ENTREGA:
    'AT: confirmar o recebimento das peças do Almoxarifado para iniciar a execução do reparo.',
  EM_EXECUCAO:
    'Concluir manutenção, preencher o Item 5 (REG-009/REG-035) e finalizar com Etiqueta VERDE.',
};

function calcularAtalhosFormularioPorSetor(
  os: OrdemServicoFluxoState,
  destinatario: SetorOperacional,
): {
  principalLabel: string;
  principalHref: string;
  secundarioLabel: string | null;
  secundarioHref: string | null;
} {
  const encodedOs = encodeURIComponent(os.numeroOs);
  const v4No = os.v4No;
  const tagColor =
    etiquetaV4ParaTagColor(os.v4Estado?.etiqueta ?? null) ?? os.etiquetaAtual ?? null;
  const item5Bloqueado = os.v4Estado?.item5Bloqueado ?? tagColor === 'RED';
  const item5Form = determinarFormularioItem5PorMarca(os.identificacao.marca);

  if (destinatario === 'AT') {
    if (v4No === 'AT_REG034' || (!os.reg034Preenchido && v4No !== 'AT_RECEBER')) {
      return {
        principalLabel: 'Preencher REG-034 Agora',
        principalHref: `/formularios/limpeza-equipamento?os=${encodedOs}`,
        secundarioLabel: 'Painel da OS',
        secundarioHref: `/equipamentos?os=${encodedOs}`,
      };
    }

    const deveSugerirItem5 =
      !item5Bloqueado &&
      !os.item5Preenchido &&
      (v4No === 'EM_EXECUCAO' || v4No === 'AGUARDA_ENVIO');

    if (deveSugerirItem5) {
      return {
        principalLabel: `Preencher ${item5Form} (Item 5)`,
        principalHref: `/formularios/checklist-manutencao?os=${encodedOs}`,
        secundarioLabel: 'Finalizar no Painel da OS',
        secundarioHref: `/equipamentos?os=${encodedOs}`,
      };
    }

    return {
      principalLabel: 'Executar Etapa na OS',
      principalHref: `/equipamentos?os=${encodedOs}`,
      secundarioLabel: 'REG-016',
      secundarioHref: `/formularios/etapas-manutencao?os=${encodedOs}`,
    };
  }

  if (destinatario === 'ADM') {
    return {
      principalLabel: v4No === 'AGUARDA_REG016' ? 'Abrir REG-016 Agora' : 'Atuar na OS (ADM)',
      principalHref:
        v4No === 'AGUARDA_REG016'
          ? `/formularios/etapas-manutencao?os=${encodedOs}`
          : `/equipamentos?os=${encodedOs}`,
      secundarioLabel: 'Dossiê / REG-016',
      secundarioHref: `/formularios/etapas-manutencao?os=${encodedOs}`,
    };
  }

  // ALMOXARIFADO nunca deve receber atalho de REG-034/REG-035; vai direto ao painel da OS
  return {
    principalLabel: 'Separar / Liberar Peças na OS',
    principalHref: `/equipamentos?os=${encodedOs}`,
    secundarioLabel: null,
    secundarioHref: null,
  };
}

export function usuarioPodeConfirmarAvisoSetor(
  perfil: Perfil | null | undefined,
  destinatario: SetorOperacional,
): boolean {
  const setor = perfilSistemaParaSetorV4(perfil);
  return setor === destinatario;
}

/**
 * Gera a lista limpa de avisos reais de OS a partir exclusivamente do estado v4 do servidor.
 * Não utiliza dados fictícios/semente nem localStorage antigo.
 */
export function gerarAvisosOsV4(
  ordens: OrdemServicoFluxoState[],
  now: Date = new Date(),
): AvisoOsEstruturado[] {
  const avisos: AvisoOsEstruturado[] = [];
  const nowMs = now.getTime();
  const idsNotifVistos = new Set<string>();

  for (const os of ordens) {
    const tagColor =
      etiquetaV4ParaTagColor(os.v4Estado?.etiqueta ?? null) ?? os.etiquetaAtual ?? null;
    const tagSpec = tagColor ? TAG_SPECS[tagColor] : null;
    const v4No = os.v4No ?? '';
    const etapaAtualPt =
      NODE_LABEL_PT[v4No] ??
      (os.estadoGeral === 'cancelada'
        ? 'OS Cancelada'
        : os.estadoGeral === 'finalizada'
          ? 'OS Finalizada'
          : 'Fluxo em andamento');
    const equipamentoResumo = `${os.identificacao.equipamento || 'Equipamento'}${
      os.identificacao.marca ? ` · ${os.identificacao.marca}` : ''
    }${os.identificacao.cliente ? ` — ${os.identificacao.cliente}` : ''}`;

    // 1. Comunicações intersetoriais persistidas (padrão Outbox)
    for (const notif of os.notificacoes ?? []) {
      const id = `os:dyn:${notif.id}`;
      if (idsNotifVistos.has(id)) continue;
      idsNotifVistos.add(id);

      const entregueMs = new Date(notif.entregueEm).getTime();
      const retida = !notif.confirmadaEm && entregueMs > nowMs;
      const ehLembrete =
        (notif.quantidadeLembretes ?? 0) > 0 ||
        notif.mensagem.startsWith('Lembrete (7 dias):');
      const atalhos = calcularAtalhosFormularioPorSetor(os, notif.destinatario);

      avisos.push({
        id,
        tipoAviso: 'comunicacao_intersetorial',
        numeroOs: os.numeroOs,
        destinatarioSetor: notif.destinatario,
        titulo: `${os.numeroOs} — Aviso para Setor ${notif.destinatario}`,
        descricao: notif.mensagem,
        etapaAtualPt,
        acaoSugeridaLabel: atalhos.principalLabel,
        acaoSugeridaHref: atalhos.principalHref,
        formularioSecundarioLabel: atalhos.secundarioLabel,
        formularioSecundarioHref: atalhos.secundarioHref,
        equipamentoResumo,
        tagColor,
        tagSpec,
        ehLembrete,
        retidaAteIso: retida ? new Date(notif.entregueEm).toISOString() : null,
        entregueEmIso: new Date(notif.entregueEm).toISOString(),
        confirmadaEm: notif.confirmadaEm ? new Date(notif.confirmadaEm).toISOString() : null,
        confirmadaPorNome: notif.confirmadaPorNome ?? null,
        notifIdReal: notif.id,
        nivel: ehLembrete ? 'danger' : retida ? 'warning' : 'info',
      });
    }

    // 2. Tarefa pendente ativa do setor na OS (garante clareza de "O que fazer agora")
    if (
      os.estadoGeral !== 'finalizada' &&
      os.estadoGeral !== 'cancelada' &&
      os.setorPendente !== 'NENHUM'
    ) {
      const atalhos = calcularAtalhosFormularioPorSetor(os, os.setorPendente);
      const instrucao =
        INSTRUCAO_POR_NO[v4No] ??
        os.mensagemTelaAtual ??
        `Atuação pendente do setor ${os.setorPendente}.`;

      avisos.push({
        id: `os:pendencia:${os.numeroOsNormalizado}:${v4No || os.passoAtual}`,
        tipoAviso: 'pendencia_etapa',
        numeroOs: os.numeroOs,
        destinatarioSetor: os.setorPendente,
        titulo: `${os.numeroOs} — Ação Pendente (${os.setorPendente})`,
        descricao: instrucao,
        etapaAtualPt,
        acaoSugeridaLabel: atalhos.principalLabel,
        acaoSugeridaHref: atalhos.principalHref,
        formularioSecundarioLabel: atalhos.secundarioLabel,
        formularioSecundarioHref: atalhos.secundarioHref,
        equipamentoResumo,
        tagColor,
        tagSpec,
        ehLembrete: false,
        retidaAteIso: null,
        entregueEmIso: null,
        confirmadaEm: null,
        confirmadaPorNome: null,
        notifIdReal: null,
        nivel: os.estadoGeral === 'stand_by' ? 'warning' : 'info',
      });
    }
  }

  return avisos;
}
