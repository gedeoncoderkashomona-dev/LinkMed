import type { Perfil } from '@/core/domain/enums/user';

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
  anterior: OrdemServicoFluxoState | null;
  proximo: OrdemServicoFluxoState;
}): ResultadoGuardaOs {
  const { perfil, anterior, proximo } = params;
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
      return negar('Uma OS nova só pode ser criada no estado inicial (REG-022 / Etiqueta BRANCA).');
    }
    if (proximo.historico.length === 0 || proximo.historico.length > 3) {
      return negar('Histórico inicial da OS inconsistente.');
    }
    if (proximo.estadoGeral !== 'em_andamento') {
      return negar('Uma OS nova deve iniciar em andamento.');
    }
    if (!supervisor && perfil !== 'adm' && perfil !== 'tecnico') {
      return negar('Você não tem permissão para criar Ordens de Serviço.');
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

  for (const ev of novos) {
    const autor = ev.usuarioPerfil as string;
    if (autor !== 'sistema' && autor !== perfil) {
      return negar('Evento registrado em nome de outro perfil.');
    }

    if (ev.tipo === 'CANCELAMENTO') {
      if (!supervisor && perfil !== 'adm') {
        return negar('Você não tem permissão para cancelar esta Ordem de Serviço.');
      }
    } else if (ev.tipo === 'REABERTURA') {
      if (perfil === 'estoquista') return negar('Você não tem permissão para reabrir esta Ordem de Serviço.');
    } else {
      if (finalizadaOuCancelada && anterior.estadoGeral === 'cancelada') {
        return negar('OS cancelada: reabra a OS antes de continuar o fluxo.');
      }
      if (autor !== 'sistema' && !supervisor) {
        if (!meuSetor || String(ev.setorPendenteAnterior) !== meuSetor) {
          return negar(
            `Você não tem permissão para realizar esta etapa. Esta ação é de responsabilidade do setor ${String(ev.setorPendenteAnterior)}.`,
          );
        }
      }
    }

    if (autor !== 'sistema' && !supervisor && ev.tipo !== 'CANCELAMENTO' && ev.tipo !== 'REABERTURA') {
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
