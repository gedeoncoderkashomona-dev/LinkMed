import { describe, expect, it } from 'vitest';

import { validarTransicaoOsNoServidor } from '@/core/domain/forms/os-flow-guard';
import {
  admMarcarEtiquetaBrancaNoReg016,
  atFinalizarServicoComEtiquetaVerde,
  atMarcarEtiquetaCinzaAnaliseCompleta,
  atMarcarEtiquetaVioleta,
  atResponderPerguntaGarantia,
  cancelarOs,
  confirmarNotificacaoSetor,
  corrigirMarcacaoOuRespostaPeloDono,
  criarOsViaReg022,
  type AtorAcaoOS,
} from '@/core/domain/forms/os-workflow';

const ATOR_ADM: AtorAcaoOS = {
  usuarioId: 'usr-adm-01',
  usuarioNome: 'Setor ADM',
  perfil: 'adm',
};

const ATOR_AT: AtorAcaoOS = {
  usuarioId: 'usr-at-01',
  usuarioNome: 'Assistência Técnica',
  perfil: 'tecnico',
};

const ATOR_ALMOX: AtorAcaoOS = {
  usuarioId: 'usr-almox-01',
  usuarioNome: 'Almoxarifado',
  perfil: 'estoquista',
};

describe('Segurança no Servidor: Guarda de Integridade de OS (os-flow-guard)', () => {
  it('permite criação de OS válida no estado inicial pelo ADM', () => {
    const osCriada = criarOsViaReg022({
      numeroOs: 'OS-TEST-001',
      identificacao: {
        cliente: 'Hospital Central',
        equipamento: 'Eletrocardiógrafo',
        marca: 'TEB',
        modelo: 'ECGPC',
        numeroSerie: 'SN-001',
      },
      ator: ATOR_ADM,
    });

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'adm',
      anterior: null,
      proximo: osCriada,
    });

    expect(resultado.permitido).toBe(true);
  });

  it('bloqueia criação de OS com perfil não autorizado (estoquista)', () => {
    const osCriadaPeloAdm = criarOsViaReg022({
      numeroOs: 'OS-TEST-002',
      identificacao: {
        cliente: 'Hospital Central',
        equipamento: 'Monitor',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-002',
      },
      ator: ATOR_ADM,
    });

    // Atacante logado como estoquista tenta submeter criação de OS
    const resultado = validarTransicaoOsNoServidor({
      perfil: 'estoquista',
      anterior: null,
      proximo: osCriadaPeloAdm,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/não tem permissão para criar Ordens de Serviço/i);
  });

  it('bloqueia adulteração do número da OS entre requisições', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-003',
      identificacao: {
        cliente: 'Clínica A',
        equipamento: 'Holter',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-003',
      },
      ator: ATOR_ADM,
    });

    const osAdulterada = { ...osOriginal, numeroOs: 'OS-HACK-999' };

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'adm',
      anterior: osOriginal,
      proximo: osAdulterada,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/número da OS não pode ser alterado/i);
  });

  it('bloqueia apagamento ou redução do histórico imutável', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-004',
      identificacao: {
        cliente: 'Clínica B',
        equipamento: 'Incubadora',
        marca: 'OLIDEF',
        modelo: 'RN-2000',
        numeroSerie: 'SN-004',
      },
      ator: ATOR_ADM,
    });

    const osComEtiquetaBranca = admMarcarEtiquetaBrancaNoReg016(osOriginal, ATOR_ADM);

    // Tentativa de rollback do histórico enviando o histórico vazio
    const osComHistoricoVazio = { ...osComEtiquetaBranca, historico: [] };

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'adm',
      anterior: osComEtiquetaBranca,
      proximo: osComHistoricoVazio,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/histórico imutável da OS não pode ser reduzido/i);
  });

  it('bloqueia perfil de outro setor tentando executar etapa alheia', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-005',
      identificacao: {
        cliente: 'Hospital C',
        equipamento: 'Holter',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-005',
      },
      ator: ATOR_ADM,
    });

    const osEtiquetaBranca = admMarcarEtiquetaBrancaNoReg016(osOriginal, ATOR_ADM);
    // Setor pendente é 'AT' (Assistência Técnica).

    // O atacante logado como estoquista forja um evento no histórico tentando avançar
    const osForjadaPeloEstoquista = {
      ...osEtiquetaBranca,
      setorPendente: 'AT' as const,
      historico: [
        ...osEtiquetaBranca.historico,
        {
          id: 'ev-fake-1',
          numeroOs: osEtiquetaBranca.numeroOs,
          codigoPasso: 'A3_FAKE',
          tipo: 'CONFIRMACAO_NOTIFICACAO' as const,
          valorAnterior: 'A2',
          valorNovo: 'A3',
          etiquetaAnterior: 'WHITE' as const,
          etiquetaNova: 'WHITE' as const,
          setorPendenteAnterior: 'AT' as const,
          setorPendenteNovo: 'AT' as const,
          usuarioId: ATOR_ALMOX.usuarioId,
          usuarioNome: ATOR_ALMOX.usuarioNome,
          usuarioPerfil: 'estoquista' as const,
          dataHora: new Date(),
          observacao: 'Tentativa de adulterar etapa alheia',
        },
      ],
    };

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'estoquista',
      anterior: osEtiquetaBranca,
      proximo: osForjadaPeloEstoquista,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/responsabilidade do setor AT/i);
  });

  it('permite que o setor correspondente avance a etapa sob sua responsabilidade', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-006',
      identificacao: {
        cliente: 'Hospital D',
        equipamento: 'Holter',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-006',
      },
      ator: ATOR_ADM,
    });

    const osEtiquetaBranca = admMarcarEtiquetaBrancaNoReg016(osOriginal, ATOR_ADM);

    // AT confirma notificação (etapa sob responsabilidade da AT)
    const osConfirmadaPelaAt = confirmarNotificacaoSetor(osEtiquetaBranca, ATOR_AT);

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'tecnico',
      anterior: osEtiquetaBranca,
      proximo: osConfirmadaPelaAt,
    });

    expect(resultado.permitido).toBe(true);
  });

  it('orienta com REG-022 e setor ADM ao tentar criar OS fora do estado inicial', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-007',
      identificacao: {
        cliente: 'Hospital E',
        equipamento: 'Monitor',
        marca: 'TEB',
        modelo: 'M-10',
        numeroSerie: 'SN-007',
      },
      ator: ATOR_ADM,
    });
    const osAvancada = admMarcarEtiquetaBrancaNoReg016(osOriginal, ATOR_ADM);
    const osPassoForaDoInicial = {
      ...osAvancada,
      passoAtual: 'A5_VIOLETA_HIGIENIZADO' as const,
    };

    const resultado = validarTransicaoOsNoServidor({
      perfil: 'adm',
      anterior: null,
      proximo: osPassoForaDoInicial,
    });

    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/REG-022/i);
    expect(resultado.motivo).toMatch(/Administrativo \(ADM\)/i);
  });

  it('permite que a Assistência Técnica (tecnico) cancele uma OS e bloqueia estoquista', () => {
    const osOriginal = criarOsViaReg022({
      numeroOs: 'OS-TEST-008',
      identificacao: {
        cliente: 'Hospital F',
        equipamento: 'Holter',
        marca: 'Cardios',
        modelo: 'H-2',
        numeroSerie: 'SN-008',
      },
      ator: ATOR_ADM,
    });

    const osCanceladaPelaAt = cancelarOs(
      osOriginal,
      'Equipamento retirado antes da análise pelo cliente',
      ATOR_AT,
    );

    const resAt = validarTransicaoOsNoServidor({
      perfil: 'tecnico',
      anterior: osOriginal,
      proximo: osCanceladaPelaAt,
    });
    expect(resAt.permitido).toBe(true);

    const resAlmox = validarTransicaoOsNoServidor({
      perfil: 'estoquista',
      anterior: osOriginal,
      proximo: {
        ...osCanceladaPelaAt,
        historico: [
          ...osOriginal.historico,
          {
            ...osCanceladaPelaAt.historico[osCanceladaPelaAt.historico.length - 1]!,
            usuarioPerfil: 'estoquista',
          },
        ],
      },
    });
    expect(resAlmox.permitido).toBe(false);
    expect(resAlmox.motivo).toMatch(/Administrativo \(ADM\)/i);
  });

  it('permite correção E3 (CORRECAO_MARCACAO) somente pelo próprio autor da ação e bloqueia outro usuário', () => {
    const osInicial = criarOsViaReg022({
      numeroOs: 'OS-TEST-E3',
      identificacao: {
        cliente: 'Clínica São Lucas',
        equipamento: 'Oxímetro',
        marca: 'Contec',
        modelo: 'CMS50',
        numeroSerie: 'SN-E3',
      },
      ator: ATOR_ADM,
    });
    const osBranca = admMarcarEtiquetaBrancaNoReg016(structuredClone(osInicial), ATOR_ADM);
    const osConfirmada = confirmarNotificacaoSetor(structuredClone(osBranca), ATOR_AT);
    const osVioleta = atMarcarEtiquetaVioleta(structuredClone(osConfirmada), ATOR_AT);
    const osCinza = atMarcarEtiquetaCinzaAnaliseCompleta(structuredClone(osVioleta), ATOR_AT);
    const osGarantia = atResponderPerguntaGarantia(structuredClone(osCinza), true, ATOR_AT);

    expect(osGarantia.etiquetaAtual).toBe('ORANGE');
    expect(osGarantia.setorPendente).toBe('ALMOXARIFADO');

    const eventoB1 = osGarantia.historico.find((h) => h.codigoPasso === 'B1');
    expect(eventoB1).toBeDefined();

    const osCorrigidaPeloDono = corrigirMarcacaoOuRespostaPeloDono(
      structuredClone(osGarantia),
      {
        eventoId: eventoB1!.id,
        observacaoCorrecao: 'Equipamento fora da garantia do fabricante',
        executarNovaAcao: (osRestaurada) => {
          atResponderPerguntaGarantia(osRestaurada, false, ATOR_AT);
        },
      },
      ATOR_AT,
    );

    // Mesmo com setorPendente anterior em ALMOXARIFADO, o servidor autoriza o autor AT corrigir via E3
    const resDono = validarTransicaoOsNoServidor({
      perfil: 'tecnico',
      usuarioId: ATOR_AT.usuarioId,
      anterior: osGarantia,
      proximo: osCorrigidaPeloDono,
    });
    expect(resDono.permitido).toBe(true);

    // Outro colaborador AT não pode passar E3 no servidor se o registro original pertence a ATOR_AT
    const resOutroAt = validarTransicaoOsNoServidor({
      perfil: 'tecnico',
      usuarioId: 'usr-at-outro-99',
      anterior: osGarantia,
      proximo: osCorrigidaPeloDono,
    });
    expect(resOutroAt.permitido).toBe(false);
    expect(resOutroAt.motivo).toMatch(/próprio usuário/i);
  });
});
