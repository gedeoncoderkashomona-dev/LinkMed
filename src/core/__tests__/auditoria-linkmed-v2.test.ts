import { describe, expect, it } from 'vitest';

import {
  calcularEntregaNotificacao,
  estaDentroDoHorarioComercial,
  notificacaoEstaEntregue,
  perfilParaSetorOperacional,
  verificarAcessoHorario,
} from '@/core/domain/access-schedule';
import {
  calcularCargaHorariaAutomatica,
  DOCUMENTOS_OFICIAIS_POR_MODULO,
} from '@/core/domain/entities/operacional';
import {
  calcularProximaCalibracao,
  getCampos,
  getFormDef,
  INSTRUMENTOS_PADRAO_REG015,
  obterFormularioItem5PorMarca,
  validarDados,
  verificarBloqueioItem5Reg016,
} from '@/core/domain/forms/definitions';
import { PERFIL_LABEL, PERFIS } from '@/core/domain/enums/user';
import {
  admMarcarEtiquetaAmarelaOrcamento,
  admMarcarEtiquetaBrancaNoReg016,
  admResponderOrcamentoAprovado,
  almoxarifadoDecidirPecas,
  almoxarifadoRetomarOsDeAguardandoPecas,
  atFinalizarServicoComEtiquetaVerde,
  atMarcarEtiquetaCinzaAnaliseCompleta,
  atMarcarEtiquetaVioleta,
  atPreencherItem5Reg016,
  atRegistrarReg034,
  atResponderEquipamentoEnviadoFabrica,
  atResponderPerguntaEnvioFabrica,
  atResponderPerguntaGarantia,
  cancelarOs,
  confirmarNotificacaoSetor,
  corrigirMarcacaoOuRespostaPeloDono,
  criarOsViaReg022,
  reabrirOs,
  verificarDuplicidadeOs,
  verificarEGerarLembretes7Dias,
  type AtorAcaoOS,
} from '@/core/domain/forms/os-workflow';
import {
  alertaPulseiraAntiestatica,
  verificarAtividadesObrigatoriasDiariasPorSetor,
} from '@/core/domain/forms/alerts';
import {
  gerarAssinaturaEletronicaLgpd,
  verificarIntegridadeAssinaturaLgpd,
} from '@/core/domain/signatures/electronic-signature';

const atorAdm: AtorAcaoOS = {
  usuarioId: 'u-adm-1',
  usuarioNome: 'Fernanda ADM',
  perfil: 'adm',
  dataHora: new Date('2026-10-28T13:00:00Z'), // Quarta 10:00 BRT
};

const atorAt1: AtorAcaoOS = {
  usuarioId: 'u-at-1',
  usuarioNome: 'Carlos Menezes (AT)',
  perfil: 'tecnico',
  dataHora: new Date('2026-10-28T14:00:00Z'),
};

const atorAt2: AtorAcaoOS = {
  usuarioId: 'u-at-2',
  usuarioNome: 'Rafael Souza (AT)',
  perfil: 'tecnico',
  dataHora: new Date('2026-10-28T14:30:00Z'),
};

const atorAlmox: AtorAcaoOS = {
  usuarioId: 'u-almox-1',
  usuarioNome: 'João Silva (Almoxarifado)',
  perfil: 'estoquista',
  dataHora: new Date('2026-10-28T15:00:00Z'),
};

function executarEtapaInicialAteAnaliseConcluida(
  numeroOs: string,
  marca: 'Cardios' | 'TEB' | 'OLIDEF' = 'OLIDEF',
) {
  // A1: ADM preenche REG 022
  const os = criarOsViaReg022({
    numeroOs,
    identificacao: {
      cliente: 'Hospital Santa Casa',
      equipamento: 'Incubadora Neonatal',
      marca,
      modelo: 'SCT-8',
      numeroSerie: `SN-${numeroOs}`,
    },
    ator: atorAdm,
  });
  expect(os.etiquetaAtual).toBeNull();
  expect(os.setorPendente).toBe('ADM');
  expect(os.mensagemTelaAtual).toBe('Preencha o REG 016');

  // A2: ADM marca etiqueta BRANCA no REG 016
  admMarcarEtiquetaBrancaNoReg016(os, atorAdm);
  expect(os.etiquetaAtual).toBe('WHITE');
  expect(os.setorPendente).toBe('AT');

  // A3: AT confirma recebimento da notificação
  confirmarNotificacaoSetor(os, atorAt1);
  expect(os.mensagemTelaAtual).toBe('Preencha o REG 034 - Limpeza de equipamentos');

  // A4: AT preenche REG 034
  atRegistrarReg034(os, atorAt1);
  expect(os.reg034Preenchido).toBe(true);
  expect(os.mensagemTelaAtual).toBe(
    'Preencha os próximos passos do REG 016 - etapas da manutenção',
  );

  // A5: AT marca etiqueta VIOLETA
  atMarcarEtiquetaVioleta(os, atorAt1);
  expect(os.etiquetaAtual).toBe('VIOLET');
  expect(os.mensagemTelaAtual).toBe('Siga para a análise do equipamento');

  // A6: AT analisa na bancada e marca etiqueta CINZA
  atMarcarEtiquetaCinzaAnaliseCompleta(os, atorAt1);
  expect(os.etiquetaAtual).toBe('GRAY');
  expect(os.etiquetaIdentificacaoLiberada).toBe(true);
  expect(os.perguntaPendenteAtual).toBe('Trata-se de garantia?');

  return os;
}

describe('Subtarefa 1 — Perfis (ADM, AT, Almoxarifado), Horário de Acesso (T14) e Retenção de Notificações (T15)', () => {
  it('inclui o perfil Administrativo (adm) junto com AT (tecnico) e Almoxarifado (estoquista)', () => {
    expect(PERFIS).toContain('adm');
    expect(PERFIS).toContain('tecnico');
    expect(PERFIS).toContain('estoquista');
    expect(PERFIL_LABEL.adm).toContain('Administrativo');

    expect(perfilParaSetorOperacional('tecnico')).toBe('AT');
    expect(perfilParaSetorOperacional('adm')).toBe('ADM');
    expect(perfilParaSetorOperacional('estoquista')).toBe('ALMOXARIFADO');
    expect(perfilParaSetorOperacional('diretor')).toBeNull();
  });

  it('T14 — bloqueia acesso às 20:00 ou no sábado para AT, ADM e Almoxarifado e libera entre 07:30h e 19:30h (seg-sex)', () => {
    const quarta20h = new Date('2026-10-28T23:00:00Z');
    expect(estaDentroDoHorarioComercial(quarta20h)).toBe(false);

    for (const perfil of ['tecnico', 'adm', 'estoquista'] as const) {
      const res20h = verificarAcessoHorario(perfil, quarta20h);
      expect(res20h.permitido).toBe(false);
      expect(res20h.mensagem).toContain('07:30h às 19:30h');
      expect(res20h.proximaAberturaLabel).toBe('29/10/2026 às 07:30h');
    }

    const sabado10h = new Date('2026-10-31T13:00:00Z');
    expect(estaDentroDoHorarioComercial(sabado10h)).toBe(false);

    for (const perfil of ['tecnico', 'adm', 'estoquista'] as const) {
      const resSabado = verificarAcessoHorario(perfil, sabado10h);
      expect(resSabado.permitido).toBe(false);
      expect(resSabado.mensagem).toContain('segunda a sexta-feira');
      expect(resSabado.proximaAberturaLabel).toBe('02/11/2026 às 07:30h');
    }

    const quarta0730 = new Date('2026-10-28T10:30:00Z');
    const quarta1930 = new Date('2026-10-28T22:30:00Z');
    expect(verificarAcessoHorario('tecnico', quarta0730).permitido).toBe(true);
    expect(verificarAcessoHorario('adm', quarta1930).permitido).toBe(true);
    expect(verificarAcessoHorario('estoquista', quarta0730).permitido).toBe(true);
  });

  it('T15 — retém notificação gerada às 20:00 ou fim de semana e entrega às 07:30h do próximo dia útil', () => {
    const geradaQuarta20h = new Date('2026-10-28T23:00:00Z');
    const entregaQuinta = calcularEntregaNotificacao(geradaQuarta20h);

    expect(entregaQuinta.retida).toBe(true);
    expect(entregaQuinta.entregueEmBR).toBe('29/10/2026 às 07:30h');
    expect(notificacaoEstaEntregue(entregaQuinta.entregueEm, new Date('2026-10-28T23:05:00Z'))).toBe(false);
    expect(notificacaoEstaEntregue(entregaQuinta.entregueEm, new Date('2026-10-29T10:30:00Z'))).toBe(true);

    const geradaSexta20h = new Date('2026-10-30T23:00:00Z');
    const entregaSegunda = calcularEntregaNotificacao(geradaSexta20h);
    expect(entregaSegunda.retida).toBe(true);
    expect(entregaSegunda.entregueEmBR).toBe('02/11/2026 às 07:30h');
  });
});

describe('Subtarefa 2 — Motor de Máquina de Estados da OS (Casos de Teste Oficiais T1 a T13 e T16)', () => {
  it('T1 — Garantia SIM, peças disponíveis -> LARANJA (auto), depois VERDE. Item 5 liberado', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T1', 'Cardios');

    // B1: Garantia = SIM -> LARANJA (auto), notifica Almoxarifado
    atResponderPerguntaGarantia(os, true, atorAt1);
    expect(os.etiquetaAtual).toBe('ORANGE');
    expect(os.setorPendente).toBe('ALMOXARIFADO');
    expect(os.item5Liberado).toBe(true);
    expect(os.item5FormularioTipo).toBe('REG-009'); // Marca Cardios -> REG 009

    // D1: Almoxarifado confirma recebimento
    confirmarNotificacaoSetor(os, atorAlmox);
    // D4: Almoxarifado marca peças disponíveis
    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    expect(os.setorPendente).toBe('AT');

    // D5: AT confirma recebimento das peças
    confirmarNotificacaoSetor(os, atorAt1);
    // Preenche Item 5 (REG 009 para Cardios) e finaliza em VERDE (D6)
    atPreencherItem5Reg016(os, 'Cardios', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
    expect(os.estadoGeral).toBe('finalizada');
    expect(os.setorPendente).toBe('NENHUM');
  });

  it('T2 — Garantia SIM, aguardando peças, depois peças disponíveis -> LARANJA, PRETA (stand-by), volta à anterior (LARANJA), VERDE', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T2', 'TEB');

    atResponderPerguntaGarantia(os, true, atorAt1);
    expect(os.etiquetaAtual).toBe('ORANGE');

    confirmarNotificacaoSetor(os, atorAlmox);
    // D2: Almoxarifado marca aguardando peças -> PRETA (stand-by)
    almoxarifadoDecidirPecas(os, 'aguardando_pecas', atorAlmox);
    expect(os.etiquetaAtual).toBe('BLACK');
    expect(os.estadoGeral).toBe('stand_by');
    expect(os.mensagemTelaAtual).toBe('Inicie o processo de compra conforme o POP 009');

    // D3: Peça chega ao estoque e Almoxarifado retoma a OS -> volta para LARANJA
    almoxarifadoRetomarOsDeAguardandoPecas(os, atorAlmox);
    expect(os.etiquetaAtual).toBe('ORANGE');
    expect(os.estadoGeral).toBe('em_andamento');

    // D4: Almoxarifado marca peças disponíveis
    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    confirmarNotificacaoSetor(os, atorAt1);
    atPreencherItem5Reg016(os, 'TEB', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
    expect(os.estadoGeral).toBe('finalizada');
  });

  it('T3 — Envio SIM, enviado SIM, orçamento aprovado, peças disponíveis -> MARROM, AMARELA, AZUL, VERDE. Item 5 liberado', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T3', 'OLIDEF');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'transportadora_linkmed' },
      atorAt1,
    );
    expect(os.estadoGeral).toBe('stand_by');
    expect(os.perguntaPendenteAtual).toBe('O equipamento foi enviado?');

    // B5: Enviado = SIM -> MARROM (auto), notifica ADM
    atResponderEquipamentoEnviadoFabrica(os, { foiEnviado: true }, atorAt1);
    expect(os.etiquetaAtual).toBe('BROWN');
    expect(os.setorPendente).toBe('ADM');
    expect(os.item5Liberado).toBe(true); // Marrom por si só não bloqueia Item 5

    // C1: ADM marca AMARELA
    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');

    // C2: ADM responde SIM ao orçamento -> AZUL (auto)
    admResponderOrcamentoAprovado(os, true, atorAdm);
    expect(os.etiquetaAtual).toBe('BLUE');
    expect(os.item5Liberado).toBe(true);
    expect(os.setorPendente).toBe('ALMOXARIFADO');

    // Bloco P
    confirmarNotificacaoSetor(os, atorAlmox);
    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    confirmarNotificacaoSetor(os, atorAt1);
    atPreencherItem5Reg016(os, 'OLIDEF', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
    expect(os.estadoGeral).toBe('finalizada');
  });

  it('T4 — Envio SIM, enviado SIM, orçamento aprovado, aguardando peças -> MARROM, AMARELA, AZUL, PRETA, volta à anterior (AZUL), VERDE', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T4', 'OLIDEF');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'correios' },
      atorAt1,
    );
    atResponderEquipamentoEnviadoFabrica(os, { foiEnviado: true }, atorAt1);
    expect(os.etiquetaAtual).toBe('BROWN');

    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');

    admResponderOrcamentoAprovado(os, true, atorAdm);
    expect(os.etiquetaAtual).toBe('BLUE');

    confirmarNotificacaoSetor(os, atorAlmox);
    almoxarifadoDecidirPecas(os, 'aguardando_pecas', atorAlmox);
    expect(os.etiquetaAtual).toBe('BLACK');

    // Ao retomar, volta para AZUL (etiqueta anterior ao stand-by de peças)
    almoxarifadoRetomarOsDeAguardandoPecas(os, atorAlmox);
    expect(os.etiquetaAtual).toBe('BLUE');

    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    confirmarNotificacaoSetor(os, atorAt1);
    atPreencherItem5Reg016(os, 'OLIDEF', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
  });

  it('T5 — Envio SIM, enviado SIM, orçamento reprovado -> MARROM, AMARELA, VERMELHA. Item 5 bloqueado', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T5', 'Cardios');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'transportadora_cliente' },
      atorAt1,
    );
    atResponderEquipamentoEnviadoFabrica(os, { foiEnviado: true }, atorAt1);
    expect(os.etiquetaAtual).toBe('BROWN');

    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');

    // C3: ADM responde NÃO ao orçamento -> notifica AT (ainda AMARELA até confirmação da AT)
    admResponderOrcamentoAprovado(os, false, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');
    expect(os.setorPendente).toBe('AT');

    // C4: AT confirma a notificação de reprovação -> aplica VERMELHA (auto) e bloqueia Item 5
    confirmarNotificacaoSetor(os, atorAt1);
    expect(os.etiquetaAtual).toBe('RED');
    expect(os.item5Liberado).toBe(false);
    expect(os.estadoGeral).toBe('finalizada');

    // Tentativa de preencher Item 5 com etiqueta VERMELHA deve ser bloqueada
    expect(() => atPreencherItem5Reg016(os, 'Cardios', atorAt1)).toThrow(
      /Item 5 do REG 016 está bloqueado/,
    );
  });

  it('T6 — Envio SIM, enviado NÃO, escolhe VERMELHA -> VERMELHA, OS finalizada, item 5 bloqueado, sem não conformidade', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T6');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'transportadora_linkmed' },
      atorAt1,
    );

    // B6: Equipamento NÃO enviado, AT digita justificativa e escolhe VERMELHA
    atResponderEquipamentoEnviadoFabrica(
      os,
      {
        foiEnviado: false,
        justificativaNaoEnviado: 'Cliente desistiu do envio antes do despacho.',
        etiquetaEscolhidaSeNaoEnviado: 'RED',
      },
      atorAt1,
    );

    expect(os.etiquetaAtual).toBe('RED');
    expect(os.estadoGeral).toBe('finalizada');
    expect(os.item5Liberado).toBe(false);
    expect(os.mensagemTelaAtual).toContain('Não abre não conformidade automaticamente');
  });

  it('T7 — Envio SIM, enviado NÃO, escolhe VERDE -> VERDE, OS finalizada', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T7');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'correios' },
      atorAt1,
    );

    atResponderEquipamentoEnviadoFabrica(
      os,
      {
        foiEnviado: false,
        justificativaNaoEnviado: 'Ajuste solucionado internamente na bancada sem necessidade de fábrica.',
        etiquetaEscolhidaSeNaoEnviado: 'GREEN',
      },
      atorAt1,
    );

    expect(os.etiquetaAtual).toBe('GREEN');
    expect(os.estadoGeral).toBe('finalizada');
    expect(os.setorPendente).toBe('NENHUM');
  });

  it('T8 — Ramificação 3, orçamento aprovado, peças disponíveis -> AMARELA, AZUL, VERDE', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T8', 'TEB');

    atResponderPerguntaGarantia(os, false, atorAt1);
    // B3: Envio à fábrica = NÃO -> Ramificação 3 (Orçamento)
    atResponderPerguntaEnvioFabrica(os, { trataSeEnvioFabrica: false }, atorAt1);
    expect(os.ramificacao).toBe(3);
    expect(os.setorPendente).toBe('ADM');

    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');

    admResponderOrcamentoAprovado(os, true, atorAdm);
    expect(os.etiquetaAtual).toBe('BLUE');

    confirmarNotificacaoSetor(os, atorAlmox);
    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    confirmarNotificacaoSetor(os, atorAt1);
    atPreencherItem5Reg016(os, 'TEB', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
    expect(os.estadoGeral).toBe('finalizada');
  });

  it('T9 — Ramificação 3, orçamento aprovado, aguardando peças -> AMARELA, AZUL, PRETA, volta à anterior (AZUL), VERDE', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T9', 'OLIDEF');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(os, { trataSeEnvioFabrica: false }, atorAt1);

    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    admResponderOrcamentoAprovado(os, true, atorAdm);
    expect(os.etiquetaAtual).toBe('BLUE');

    confirmarNotificacaoSetor(os, atorAlmox);
    almoxarifadoDecidirPecas(os, 'aguardando_pecas', atorAlmox);
    expect(os.etiquetaAtual).toBe('BLACK');

    almoxarifadoRetomarOsDeAguardandoPecas(os, atorAlmox);
    expect(os.etiquetaAtual).toBe('BLUE');

    almoxarifadoDecidirPecas(os, 'pecas_disponiveis', atorAlmox);
    confirmarNotificacaoSetor(os, atorAt1);
    atPreencherItem5Reg016(os, 'OLIDEF', atorAt1);
    atFinalizarServicoComEtiquetaVerde(os, atorAt1);

    expect(os.etiquetaAtual).toBe('GREEN');
  });

  it('T10 — Ramificação 3, orçamento reprovado -> AMARELA, VERMELHA após a AT confirmar. Item 5 bloqueado', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T10', 'Cardios');

    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(os, { trataSeEnvioFabrica: false }, atorAt1);

    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');

    admResponderOrcamentoAprovado(os, false, atorAdm);
    expect(os.etiquetaAtual).toBe('YELLOW');
    expect(os.setorPendente).toBe('AT');

    confirmarNotificacaoSetor(os, atorAt1);
    expect(os.etiquetaAtual).toBe('RED');
    expect(os.item5Liberado).toBe(false);
    expect(os.estadoGeral).toBe('finalizada');
  });

  it('T11 — Cadastrar nº de OS já existente (inclusive cancelada ou finalizada) -> Bloqueado com mensagem e link', () => {
    const osExistente = executarEtapaInicialAteAnaliseConcluida('OS-2026-900');
    cancelarOs(osExistente, 'Cancelada a pedido do cliente', atorAdm);

    // Tentativa de cadastrar com espaços nas pontas e minúsculas ("  os-2026-900 ")
    const check = verificarDuplicidadeOs('  os-2026-900 ', [osExistente]);
    expect(check.duplicada).toBe(true);
    expect(check.mensagem).toContain('Já existe uma OS com este número');
    expect(check.linkOsExistente).toContain('OS-2026-900');

    expect(() =>
      criarOsViaReg022(
        {
          numeroOs: '  os-2026-900 ',
          identificacao: osExistente.identificacao,
          ator: atorAdm,
        },
        [osExistente],
      ),
    ).toThrow(/Já existe uma OS com este número/);
  });

  it('T12 — Outro usuário tenta corrigir uma marcação (negado); o dono do login corrige (permitido, com registro no histórico)', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T12');

    // atorAt1 responde SIM para garantia -> vai para LARANJA
    atResponderPerguntaGarantia(os, true, atorAt1);
    expect(os.etiquetaAtual).toBe('ORANGE');

    const eventoGarantia = os.historico.find((e) => e.chaveAcao === 'trata_se_garantia')!;
    expect(eventoGarantia).toBeDefined();

    // atorAt2 (outro usuário do mesmo setor) ou atorAdm tenta corrigir -> NEGADO!
    expect(() =>
      corrigirMarcacaoOuRespostaPeloDono(
        os,
        {
          eventoId: eventoGarantia.id,
          observacaoCorrecao: 'Tentativa por outro login',
          executarNovaAcao: (s) => atResponderPerguntaGarantia(s, false, atorAt2),
        },
        atorAt2,
      ),
    ).toThrow(/Apenas o próprio usuário que realizou este registro/);

    // O dono do login (atorAt1) corrige sua própria resposta de SIM para NÃO -> PERMITIDO!
    corrigirMarcacaoOuRespostaPeloDono(
      os,
      {
        eventoId: eventoGarantia.id,
        observacaoCorrecao: 'Correção: equipamento fora do prazo de garantia na NF.',
        executarNovaAcao: (s) => atResponderPerguntaGarantia(s, false, atorAt1),
      },
      atorAt1,
    );

    expect(os.etiquetaAtual).toBe('GRAY');
    expect(os.setorPendente).toBe('AT');
    expect(os.historico.some((e) => e.tipo === 'CORRECAO_MARCACAO')).toBe(true);
  });

  it('T13 — Notificação sem confirmação por 7 dias -> Lembrete enviado ao setor responsável pela ação, dentro do horário', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T13');
    atResponderPerguntaGarantia(os, true, atorAt1); // Gera notificação para ALMOXARIFADO em 28/10/2026

    // Passam 6 dias (03/11/2026) -> ainda não envia lembrete
    const lembretes6d = verificarEGerarLembretes7Dias(os, new Date('2026-11-03T14:00:00Z'));
    expect(lembretes6d).toHaveLength(0);

    // Passam 7 dias corridos (04/11/2026 às 11:00 BRT) -> envia lembrete ao Almoxarifado!
    const lembretes7d = verificarEGerarLembretes7Dias(os, new Date('2026-11-04T14:00:00Z'));
    expect(lembretes7d).toHaveLength(1);
    expect(lembretes7d[0]!.destinatario).toBe('ALMOXARIFADO');
    expect(lembretes7d[0]!.mensagem).toContain('aguarda ação do setor há 7 dias');
  });

  it('T16 — Cancelar e reabrir uma OS em AMARELA -> Cancelada, sem lembretes. Ao reabrir, volta a AMARELA com o ADM pendente e eventos no histórico', () => {
    const os = executarEtapaInicialAteAnaliseConcluida('OS-T16');
    atResponderPerguntaGarantia(os, false, atorAt1);
    atResponderPerguntaEnvioFabrica(os, { trataSeEnvioFabrica: false }, atorAt1);
    admMarcarEtiquetaAmarelaOrcamento(os, atorAdm);

    expect(os.etiquetaAtual).toBe('YELLOW');
    expect(os.setorPendente).toBe('ADM');

    // Almoxarifado tenta cancelar -> negado (apenas ADM e AT podem cancelar/reabrir)
    expect(() => cancelarOs(os, 'Tentativa almox', atorAlmox)).toThrow(
      /Apenas os perfis Administrativo \(ADM\) e Assistência Técnica \(AT\)/,
    );

    // ADM cancela a OS com motivo
    cancelarOs(os, 'Cliente solicitou suspensão temporária do orçamento', atorAdm);
    expect(os.estadoGeral).toBe('cancelada');
    expect(os.setorPendente).toBe('NENHUM');

    // Enquanto cancelada, não gera lembretes de 7 dias
    const lembretesCancelada = verificarEGerarLembretes7Dias(
      os,
      new Date('2026-11-15T14:00:00Z'),
    );
    expect(lembretesCancelada).toHaveLength(0);

    // AT ou ADM reabre a OS com motivo -> volta a AMARELA com ADM pendente
    reabrirOs(os, 'Cliente autorizou retomar a negociação do orçamento', atorAt1);
    expect(os.estadoGeral).toBe('em_andamento');
    expect(os.etiquetaAtual).toBe('YELLOW');
    expect(os.setorPendente).toBe('ADM');

    const tiposEventos = os.historico.map((h) => h.tipo);
    expect(tiposEventos).toContain('CANCELAMENTO');
    expect(tiposEventos).toContain('REABERTURA');
  });
});

describe('Subtarefa 3 — Assinatura Eletrônica Segura LGPD e Integridade Criptográfica', () => {
  it('gera selo criptográfico determinístico com rubrica em tela e valida integridade contra adulteração', () => {
    const assinatura = gerarAssinaturaEletronicaLgpd({
      signatarioNome: 'Filipe Gerson Farias',
      signatarioId: 'usr-filipe-01',
      funcaoOuPerfil: 'Responsável Técnico / Diretor',
      documentoCodigo: 'POP-020',
      entidadeId: 'pop-020-rev03',
      rubricaDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
      timestampIso: '2026-10-28T14:15:00.000Z',
      aceiteTermoLgpd: true,
    });

    expect(assinatura.protocolo).toMatch(/^SIG-POP-020-[0-9A-F]{10}$/);
    expect(assinatura.hashIntegridade).toHaveLength(64);
    expect(assinatura.baseLegalLgpd).toContain('LGPD Art. 7º, II');
    expect(assinatura.resumoFormatado).toContain('Rubrica em Tela + Token');
    expect(verificarIntegridadeAssinaturaLgpd(assinatura)).toBe(true);

    // Qualquer adulteração no nome, documento ou data invalida o selo criptográfico
    const adulterada = { ...assinatura, signatarioNome: 'Outro Usuário' };
    expect(verificarIntegridadeAssinaturaLgpd(adulterada)).toBe(false);
  });

  it('bloqueia geração de assinatura caso o termo LGPD seja recusado ou nome esteja vazio', () => {
    expect(() =>
      gerarAssinaturaEletronicaLgpd({
        signatarioNome: '',
        funcaoOuPerfil: 'Técnico',
        documentoCodigo: 'REG-008',
      }),
    ).toThrow(/Informe o nome completo/);

    expect(() =>
      gerarAssinaturaEletronicaLgpd({
        signatarioNome: 'Carlos Menezes',
        funcaoOuPerfil: 'Técnico',
        documentoCodigo: 'REG-008',
        aceiteTermoLgpd: false,
      }),
    ).toThrow(/LGPD Art\. 7º, II/);
  });
});

describe('Subtarefa 4 — Módulo Treinamentos (Seção 2) e Catálogo Oficial de Módulos (Seção 1)', () => {
  it('calcula automaticamente a Carga Horária a partir de Horário Inicial e Horário Final', () => {
    expect(calcularCargaHorariaAutomatica('08:30', '12:30')).toBe(4);
    expect(calcularCargaHorariaAutomatica('13:00', '17:30')).toBe(4.5);
    expect(calcularCargaHorariaAutomatica('08:00', '09:15')).toBe(1.25);
    expect(calcularCargaHorariaAutomatica('', '12:00')).toBeNull();
    expect(calcularCargaHorariaAutomatica('14:00', '12:00')).toBeNull();
  });

  it('lista exatamente os documentos oficiais por módulo conforme Seção 1 da Auditoria Linkmed', () => {
    const popsCodigos = DOCUMENTOS_OFICIAIS_POR_MODULO.documentosPops.map((p) => p.codigo);
    expect(popsCodigos).toEqual([
      'POP-004',
      'POP-006',
      'POP-007',
      'POP-011',
      'POP-012',
      'POP-014',
      'POP-019',
      'POP-020',
    ]);

    const formsCodigos = DOCUMENTOS_OFICIAIS_POR_MODULO.formularios.map((f) => f.codigo);
    expect(formsCodigos).toEqual([
      'REG-018',
      'REG-017',
      'REG-040',
      'REG-030',
      'REG-015',
      'REG-016',
    ]);

    const ncsCodigos = DOCUMENTOS_OFICIAIS_POR_MODULO.naoConformidades.map((n) => n.codigo);
    expect(ncsCodigos).toEqual(['REG-038', 'REG-047']);

    const treinamentosCodigos = DOCUMENTOS_OFICIAIS_POR_MODULO.treinamentos.map((t) => t.codigo);
    expect(treinamentosCodigos).toEqual(['REG-008', 'REG-036', 'REG-045']);
  });
});

describe('Subtarefa 5 — Formulário REG 015 (Validade de Calibração, 17 Instrumentos Pré-cadastrados e Certificados)', () => {
  it('atribui o código REG-015 (Pasta POP 011) ao módulo validade-calibracao e pré-carrega os 17 instrumentos da planilha LinkMed', () => {
    const reg015 = getFormDef('validade-calibracao')!;
    expect(reg015.reg).toBe('REG-015');
    expect(reg015.pastaPop).toBe('POP-011');

    expect(INSTRUMENTOS_PADRAO_REG015).toHaveLength(17);
    expect(INSTRUMENTOS_PADRAO_REG015[0]!.equipamento).toBe('Simulador de ECG');
    expect(INSTRUMENTOS_PADRAO_REG015[0]!.certificado).toBe('12405/2025');
    expect(INSTRUMENTOS_PADRAO_REG015[16]!.equipamento).toContain('Manômetro Digital');

    expect(calcularProximaCalibracao('2025-04-11', 12)).toBe('2026-04-11');
    expect(calcularProximaCalibracao('2026-01-15', 12)).toBe('2027-01-15');
  });
});

describe('Subtarefa 6 — REG 022 (ADM) e REG 016 (Item 5 por Marca: Cardios/REG 009, TEB/REG 035, OLIDEF/REG 035 + Bloqueio Vermelha)', () => {
  it('disponibiliza o REG 022 ao perfil Administrativo (ADM) com identificação obrigatória do Nº da OS', () => {
    const reg022 = getFormDef('inspecao-recebimento')!;
    expect(reg022.reg).toBe('REG-022');
    expect(reg022.setores).toEqual(['administrativo']);
    expect(reg022.perfis).toContain('adm');
    expect(reg022.perfis).not.toContain('tecnico');

    const campoOs = getCampos(reg022).find((c) => c.name === 'numero_os')!;
    expect(campoOs).toBeDefined();
    expect(campoOs.required).toBe(true);
  });

  it('mapeia corretamente a marca no Item 5 do REG 016 (Cardios -> REG 009, TEB -> REG 035 TEB, OLIDEF -> REG 035 OLIDEF) e bloqueia quando a etiqueta é VERMELHA', () => {
    expect(obterFormularioItem5PorMarca('Cardios')).toBe('REG-009');
    expect(obterFormularioItem5PorMarca('TEB')).toBe('REG-035 (TEB)');
    expect(obterFormularioItem5PorMarca('OLIDEF')).toBe('REG-035 (OLIDEF)');

    // MARROM sozinha ou AZUL (aprovado) mantém Item 5 liberado
    expect(verificarBloqueioItem5Reg016({ etiquetaAtual: 'BROWN' }).bloqueado).toBe(false);
    expect(verificarBloqueioItem5Reg016({ etiquetaAtual: 'BLUE' }).bloqueado).toBe(false);

    // VERMELHA ou orçamento reprovado bloqueia o Item 5
    const bloqRed = verificarBloqueioItem5Reg016({ etiquetaAtual: 'RED' });
    expect(bloqRed.bloqueado).toBe(true);
    expect(bloqRed.motivo).toContain('VERMELHA');

    const reg016 = getFormDef('etapas-manutencao')!;
    const erros = validarDados(reg016, null, {
      cliente: 'Hosp Teste',
      data_abertura: '2026-10-28',
      numero_os: 'OS-RED-01',
      equipamento: 'Monitor',
      orcamento_reprovado: 'C',
      item5_marca: 'Cardios',
    });
    expect(erros.item5_marca).toContain('VERMELHA');
  });
});

describe('Subtarefa 7 — Atividades Obrigatórias Diárias por Setor (Seção 5.2: AT -> REG 017 + REG 040; Almoxarifado -> REG 017)', () => {
  it('verifica atividades diárias obrigatórias para AT (REG 017 + REG 040) e Almoxarifado (REG 017) com notificação às 07:30h do dia seguinte', () => {
    const dataRef = new Date('2026-10-28T13:00:00Z'); // Quarta 10:00 BRT -> 2026-10-28
    const almoxVazio = verificarAtividadesObrigatoriasDiariasPorSetor([], 'ALMOXARIFADO', dataRef);
    expect(almoxVazio.setor).toBe('ALMOXARIFADO');
    expect(almoxVazio.todasConcluidas).toBe(false);
    expect(almoxVazio.atividades).toHaveLength(1);
    expect(almoxVazio.atividades[0]!.codigo).toBe('REG-017');
    expect(almoxVazio.atividades[0]!.concluidaHoje).toBe(false);
    expect(almoxVazio.atividades[0]!.mensagemNotificacao0730).toContain('07:30h');

    const atVazio = verificarAtividadesObrigatoriasDiariasPorSetor([], 'AT', dataRef);
    expect(atVazio.setor).toBe('AT');
    expect(atVazio.todasConcluidas).toBe(false);
    expect(atVazio.atividades.map((a) => a.codigo)).toEqual(['REG-017', 'REG-040']);

    // Simulando preenchimento de REG-017 pelo Almoxarifado e REG-040 pela AT no dia 2026-10-28
    const registrosParciais = [
      {
        tipo: 'temperatura-umidade',
        dataRef: '2026-10-28',
        dados: { setor_medicao: 'Almoxarifado', temperatura_atual: 22, umidade_atual: 50 },
      },
      {
        tipo: 'pulseira-antiestatica',
        dataRef: '2026-10-28',
        dados: { resultado_teste: 'C' },
      },
    ];

    const almoxOk = verificarAtividadesObrigatoriasDiariasPorSetor(
      registrosParciais,
      'ALMOXARIFADO',
      dataRef,
    );
    expect(almoxOk.todasConcluidas).toBe(true);
    expect(almoxOk.atividades[0]!.concluidaHoje).toBe(true);

    const atParcial = verificarAtividadesObrigatoriasDiariasPorSetor(
      registrosParciais,
      'AT',
      dataRef,
    );
    expect(atParcial.todasConcluidas).toBe(false);
    expect(atParcial.atividades.find((a) => a.codigo === 'REG-017')!.concluidaHoje).toBe(false);
    expect(atParcial.atividades.find((a) => a.codigo === 'REG-040')!.concluidaHoje).toBe(true);
  });

  it('gera alerta diário quando o teste da pulseira elétrica (REG 040) está pendente na Assistência Técnica', () => {
    const quarta10hBrt = new Date('2026-10-28T13:00:00Z');
    const alertaPendente = alertaPulseiraAntiestatica([], quarta10hBrt);
    expect(alertaPendente).not.toBeNull();
    expect(alertaPendente!.id).toBe('pulseira-antiestatica');
    expect(alertaPendente!.setorDestino).toBe('AT');

    const alertaConcluido = alertaPulseiraAntiestatica(
      [{ tipo: 'pulseira-antiestatica', dataRef: '2026-10-28', dados: {} }],
      quarta10hBrt,
    );
    expect(alertaConcluido).toBeNull();
  });
});
