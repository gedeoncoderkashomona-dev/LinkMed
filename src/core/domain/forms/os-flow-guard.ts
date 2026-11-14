import type { Perfil } from '@/core/domain/enums/user';

import { formatarNomeSetorCompleto } from './os-schedule-helpers';
import type { OrdemServicoFluxoState } from './os-workflow';

/**
 * Guarda de integridade do fluxo da OS no SERVIDOR (defesa em profundidade).
 *
 * O navegador envia o estado completo da OS. Em vez de confiar nele, o servidor valida:
 *  - criação: apenas estado inicial (A1/A2), sem pular etapas;
 *  - identidade imutável (nº da OS, equipamento, cliente, criador);
 *  - histórico estritamente append-only (eventos anteriores intactos);
 *  - cada evento novo foi gerado pelo perfil autenticado (ou pelo sistema);
 *  - o setor responsável pela etapa é o do perfil autenticado (Diretor/Gestor supervisionam);
 *  - cancelamento/reabertura restritos aos perfis autorizados;
 *  - coerência entre o último evento e o estado resultante (etiqueta e setor pendente).
 */

const SUPERVISORES: Perfil[] = ['diretor', 'gestor'];

const SETOR_POR_PERFIL: Partial<Record<Perfil, string>> = {
  adm: 'ADM',
  tecnico: 'AT',
  estoquista: 'ALMOXARIFADO',
};

const PASSOS_INICIAIS = new Set(['A1_CRIADA_NO_REG022', 'A2_BRANCA_NOTIFICA_AT']);

export interface ResultadoGuardaOs {
  permitido: boolean;
  motivo?: string;
}

function negar(motivo: string): ResultadoGuardaOs {
  return { permitido: false, motivo };
}

export function validarTransicaoOsNoServidor(params: {
  perfil: Perfil;
  usuarioId?: string;
  anterior: OrdemServicoFluxoState | null;
  proximo: OrdemServicoFluxoState;
}): ResultadoGuardaOs {
  const { perfil, usuarioId, anterior, proximo } = params;
  const supervisor = SUPERVISORES.includes(perfil);
  const meuSetor = SETOR_POR_PERFIL[perfil];

  if (!proximo || typeof proximo !== 'object' || !Array.isArray(proximo.historico)) {
    return negar('Estado da OS inválido ou sem histórico.');
  }
  if (!Array.isArray(proximo.notificacoes)) {
    return negar('Estado da OS inválido: notificações ausentes.');
  }

  // ---- Criação ----
  if (!anterior) {
    if (!PASSOS_INICIAIS.has(proximo.passoAtual)) {
      return negar(
        'Acesso ou transição não concluída: toda OS nova só pode ser criada no estado inicial (REG-022 / Etiqueta BRANCA). Responsável inicial: Setor Administrativo (ADM). Abra o formulário REG-022 (Inspeção de Recebimento) para iniciar esta OS.',
      );
    }
    if (proximo.historico.length === 0 || proximo.historico.length > 3) {
      return negar(
        'Não foi possível criar a OS porque o histórico inicial está inconsistente. Inicie o fluxo novamente a partir do REG-022 (Setor Administrativo - ADM).',
      );
    }
    if (proximo.estadoGeral !== 'em_andamento') {
      return negar(
        'Toda OS nova precisa iniciar "Em andamento" após o preenchimento do REG-022 pelo Setor Administrativo (ADM).',
      );
    }
    if (!supervisor && perfil !== 'adm' && perfil !== 'tecnico') {
      return negar(
        'Você não tem permissão para criar Ordens de Serviço. Toda OS deve começar no REG-022 (Inspeção de Recebimento), sob responsabilidade do Setor Administrativo (ADM) ou Assistência Técnica (AT).',
      );
    }
    return { permitido: true };
  }

  // ---- Identidade imutável ----
  if (anterior.numeroOs !== proximo.numeroOs) return negar('O número da OS não pode ser alterado.');
  if (anterior.criadaPorId !== proximo.criadaPorId) {
    return negar('O criador da OS não pode ser alterado.');
  }
  if (JSON.stringify(anterior.identificacao) !== JSON.stringify(proximo.identificacao)) {
    return negar('Os dados de identificação do equipamento não podem ser alterados pelo fluxo.');
  }

  // ---- Histórico append-only ----
  if (proximo.historico.length < anterior.historico.length) {
    return negar('O histórico imutável da OS não pode ser reduzido.');
  }
  for (let i = 0; i < anterior.historico.length; i++) {
    if (anterior.historico[i]?.id !== proximo.historico[i]?.id) {
      return negar('O histórico imutável da OS não pode ser reescrito.');
    }
  }

  const novos = proximo.historico.slice(anterior.historico.length);
  if (novos.length === 0) {
    // Sem eventos novos: nenhuma mudança estrutural permitida.
    if (
      anterior.passoAtual !== proximo.passoAtual ||
      anterior.etiquetaAtual !== proximo.etiquetaAtual ||
      anterior.setorPendente !== proximo.setorPendente ||
      anterior.estadoGeral !== proximo.estadoGeral
    ) {
      return negar('Alteração de etapa, etiqueta ou setor sem evento correspondente no histórico.');
    }
    return { permitido: true };
  }
  if (novos.length > 6) return negar('Quantidade de eventos por requisição acima do permitido.');

  let setorCorrente: string = String(anterior.setorPendente);
  const finalizadaOuCancelada =
    anterior.estadoGeral === 'finalizada' || anterior.estadoGeral === 'cancelada';
  const ehLoteCorrecaoDono = novos[novos.length - 1]?.tipo === 'CORRECAO_MARCACAO';

  for (const ev of novos) {
    const autor = ev.usuarioPerfil as string;
    if (autor !== 'sistema' && autor !== perfil) {
      return negar('Evento registrado em nome de outro perfil.');
    }

    if (ev.tipo === 'CANCELAMENTO') {
      if (!supervisor && perfil !== 'adm' && perfil !== 'tecnico') {
        return negar(
          'Você não tem permissão para cancelar esta Ordem de Serviço. O cancelamento é restrito ao Setor Administrativo (ADM), Assistência Técnica (AT) ou Diretoria/Gestão.',
        );
      }
    } else if (ev.tipo === 'REABERTURA') {
      if (perfil === 'estoquista') {
        return negar(
          'Você não tem permissão para reabrir esta Ordem de Serviço. Solicite ao Setor Administrativo (ADM), Assistência Técnica (AT) ou Diretoria/Gestão.',
        );
      }
    } else if (ev.tipo === 'CORRECAO_MARCACAO') {
      if (anterior.estadoGeral === 'cancelada') {
        return negar(
          'Esta Ordem de Serviço está cancelada. Reabra a OS antes de corrigir marcações.',
        );
      }
      if (!supervisor) {
        const possuiRegistroProprio = anterior.historico.some(
          (h) =>
            h.usuarioPerfil === perfil &&
            (!usuarioId || !h.usuarioId || h.usuarioId === usuarioId) &&
            (!ev.chaveAcao || !h.chaveAcao || h.chaveAcao === ev.chaveAcao),
        );
        if (!possuiRegistroProprio) {
          return negar(
            'Apenas o próprio usuário que realizou o registro original pode corrigi-lo.',
          );
        }
      }
    } else {
      if (finalizadaOuCancelada && anterior.estadoGeral === 'cancelada') {
        return negar(
          'Esta Ordem de Serviço está cancelada. Solicite ao Setor Administrativo (ADM), Assistência Técnica (AT) ou Gestor que reabra a OS antes de continuar o fluxo.',
        );
      }
      if (autor !== 'sistema' && !supervisor) {
        const isItem5PosVerde =
          ev.codigoPasso === 'ITEM5_REG016' &&
          (ev.etiquetaAnterior === 'GREEN' || anterior.etiquetaAtual === 'GREEN') &&
          anterior.item5Liberado;
        if (isItem5PosVerde) {
          if (perfil !== 'tecnico') {
            return negar(
              'Somente a Assistência Técnica (AT), Gestor ou Diretor podem preencher o REG-035 (Item 5) após a Etiqueta VERDE no REG-016.',
            );
          }
        } else if (!meuSetor || (!ehLoteCorrecaoDono && String(ev.setorPendenteAnterior) !== meuSetor)) {
          const nomeSetor = formatarNomeSetorCompleto(String(ev.setorPendenteAnterior));
          return negar(
            `Você não tem permissão para realizar esta etapa. Esta ação é de responsabilidade do setor ${nomeSetor}. Toda OS começa no REG-022 (ADM) e avança conforme a vez de cada setor.`,
          );
        } else if (ehLoteCorrecaoDono && String(ev.setorPendenteAnterior) !== meuSetor) {
          return negar('A correção de etapa é permitida apenas para ações do seu próprio setor.');
        }
      }
    }

    if (
      autor !== 'sistema' &&
      !supervisor &&
      !ehLoteCorrecaoDono &&
      ev.tipo !== 'CANCELAMENTO' &&
      ev.tipo !== 'REABERTURA'
    ) {
      // Encadeamento coerente de setor entre eventos da mesma requisição.
      if (String(ev.setorPendenteAnterior) !== setorCorrente && novos.length > 1) {
        if (String(ev.setorPendenteAnterior) !== meuSetor) {
          return negar('Sequência de eventos incoerente com o setor pendente.');
        }
      }
    }
    setorCorrente = String(ev.setorPendenteNovo);
  }

  // ---- Coerência final ----
  const ultimo = novos[novos.length - 1];
  if (String(ultimo.setorPendenteNovo) !== String(proximo.setorPendente)) {
    return negar('Setor pendente incoerente com o último evento.');
  }
  if ((ultimo.etiquetaNova ?? null) !== (proximo.etiquetaAtual ?? null)) {
    return negar('Etiqueta atual incoerente com o último evento.');
  }

  return { permitido: true };
}
