import { describe, expect, it } from 'vitest';

import { getFormDef, validarDados } from '@/core/domain/forms/definitions';
import { validarTransicaoOsNoServidor } from '@/core/domain/forms/os-flow-guard';
import {
  buildReg016DadosFromOsFluxo,
  contarPendenciasOsPorPerfil,
  hydrateFormFieldsFromOsFluxo,
  mergeOsFluxoIntoServiceOrders,
  osDeveSincronizarReg016,
} from '@/core/domain/forms/os-reg016-sync';
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
  criarOsViaReg022,
  reabrirOs,
  type AtorAcaoOS,
} from '@/core/domain/forms/os-workflow';

const ATOR_ADM: AtorAcaoOS = {
  usuarioId: 'u-adm',
  usuarioNome: 'Fernanda (ADM)',
  perfil: 'adm',
};

const ATOR_AT: AtorAcaoOS = {
  usuarioId: 'u-at',
  usuarioNome: 'Carlos (AT)',
  perfil: 'tecnico',
};

const ATOR_ALMOX: AtorAcaoOS = {
  usuarioId: 'u-almox',
  usuarioNome: 'João (Almoxarifado)',
  perfil: 'estoquista',
};

const ATOR_DIRETOR: AtorAcaoOS = {
  usuarioId: 'u-dir',
  usuarioNome: 'Pedro (Diretor)',
  perfil: 'diretor',
};

const ATOR_GESTOR: AtorAcaoOS = {
  usuarioId: 'u-gest',
  usuarioNome: 'Vanessa (Qualidade)',
  perfil: 'gestor',
};

describe('Sincronização OS Fluxo <-> REG-016 <-> Notificações Setoriais', () => {
  it('Ramificação 1 (Garantia -> LARANJA -> Peças OK -> Item 5 -> VERDE): pré-preenche REG-016 completo em cada etapa', () => {
    const reg016Def = getFormDef('etapas-manutencao')!;

    // A1: OS criada no REG-022 ainda aguarda Etiqueta BRANCA do ADM
    let os = criarOsViaReg022({
      numeroOs: 'OS-2026-101',
      identificacao: {
        cliente: 'Hospital São Lucas',
        equipamento: 'Incubadora Neonatal',
        marca: 'OLIDEF',
        modelo: 'SCT-8',
        numeroSerie: 'SN-OLI-101',
        acessorios: 'Sensor cutâneo',
        relatoCliente: 'Aquecimento instável',
      },
      ator: ATOR_ADM,
    });
    expect(osDeveSincronizarReg016(os)).toBe(false);

    // A2: ADM marca Etiqueta BRANCA -> REG-016 é criado automaticamente
    os = admMarcarEtiquetaBrancaNoReg016(os, ATOR_ADM);
    expect(osDeveSincronizarReg016(os)).toBe(true);
    let sync = buildReg016DadosFromOsFluxo({ os });
    expect(sync.dados.numero_os).toBe('OS-2026-101');
    expect(sync.dados.cliente).toBe('Hospital São Lucas');
    expect(sync.dados.conferencia_pecas).toBe('C');
    expect(sync.dados.etiqueta_branca_adm).toBe('C');
    expect(sync.dados.etiqueta_atual).toBe('WHITE');
    expect(sync.dados.etiqueta_violeta).toBeUndefined();

    // A3 -> A4 -> A5 (VIOLETA) -> A6 (CINZA) -> B1 Garantia SIM (LARANJA)
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atRegistrarReg034(os, ATOR_AT);
    os = atMarcarEtiquetaVioleta(os, ATOR_AT);
    os = atMarcarEtiquetaCinzaAnaliseCompleta(os, ATOR_AT);
    os = atResponderPerguntaGarantia(os, true, ATOR_AT);

    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.etiqueta_violeta).toBe('C');
    expect(sync.dados.etiqueta_cinza).toBe('C');
    expect(sync.dados.etiqueta_laranja).toBe('C');
    expect(sync.dados.orcamento_enviado).toBe('NA');
    expect(sync.dados.orcamento_aprovado).toBe('NA');
    expect(sync.dados.orcamento_reprovado).toBe('NA');
    expect(sync.dados.enviado_fabrica).toBe(false);
    expect(sync.dados.etiqueta_atual).toBe('ORANGE');

    // D1 -> D4 (Almoxarifado Peças Disponíveis) -> D5 AT confirma -> D6 VERDE -> libera Item 5 / REG 035
    os = confirmarNotificacaoSetor(os, ATOR_ALMOX);
    os = almoxarifadoDecidirPecas(os, 'pecas_disponiveis', ATOR_ALMOX);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    expect(() => atPreencherItem5Reg016(structuredClone(os), 'OLIDEF', ATOR_AT)).toThrow(
      /Etiqueta VERDE/,
    );
    os = atFinalizarServicoComEtiquetaVerde(os, ATOR_AT);
    os = atPreencherItem5Reg016(os, 'OLIDEF', ATOR_AT);

    // Simula que o técnico também concluiu o checklist OLIDEF (REG-035) e calibração (REG-030)
    const reg035OlidefDef = getFormDef('checklist-manutencao')!;
    const reg035Sub = reg035OlidefDef.subtipos!.find((s) => s.key === 'olidef')!;
    const reg035Dados: Record<string, unknown> = {
      numero_os: 'OS-2026-101',
      problema_cliente: 'Aquecimento instável',
      problema_tecnico: 'Sensor calibrado e resistência revisada com sucesso.',
    };
    for (const sec of reg035Sub.secoes) {
      for (const campo of sec.campos) {
        if (campo.type === 'cnc') reg035Dados[campo.name] = 'C';
      }
    }

    sync = buildReg016DadosFromOsFluxo({
      os,
      dadosExistentes: sync.dados,
      reg035Dados,
      reg035Subtipo: 'olidef',
      reg030Dados: { numero_os: 'OS-2026-101', resultado_final: 'conforme' },
    });

    expect(sync.status).toBe('conforme');
    expect(sync.dados.liberado_qualidade).toBe('C');
    expect(sync.dados.etiqueta_verde_sem_defeito).toBe('NA');
    expect(sync.dados.falta_itens_estoque).toBe('NA');
    expect(sync.dados.etiqueta_calibracao).toBe('C');
    expect(sync.dados.inspecao_final).toBe('C');
    expect(sync.dados.assinatura_tecnico).toBe('Carlos (AT)');
    expect(sync.dados.item5_marca).toBe('OLIDEF');
    expect(sync.dados.item5_olidef_laudo).toBe('Sensor calibrado e resistência revisada com sucesso.');
    expect(sync.dados.etiqueta_atual).toBe('GREEN');

    const errosValidacao = validarDados(reg016Def, null, sync.dados);
    expect(errosValidacao).toEqual({});
  });

  it('Ramificação 2 (Envio à Fábrica MARROM -> Orçamento AMARELA -> Reprovado VERMELHA): aplica etiqueta VERMELHA e bloqueia Item 5', () => {
    const reg016Def = getFormDef('etapas-manutencao')!;
    let os = criarOsViaReg022({
      numeroOs: 'OS-2026-202',
      identificacao: {
        cliente: 'Clínica Vida',
        equipamento: 'Gravador Holter Digital',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-CRD-202',
      },
      ator: ATOR_ADM,
    });

    os = admMarcarEtiquetaBrancaNoReg016(os, ATOR_ADM);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atRegistrarReg034(os, ATOR_AT);
    os = atMarcarEtiquetaVioleta(os, ATOR_AT);
    os = atMarcarEtiquetaCinzaAnaliseCompleta(os, ATOR_AT);
    os = atResponderPerguntaGarantia(os, false, ATOR_AT);
    os = atResponderPerguntaEnvioFabrica(
      os,
      { trataSeEnvioFabrica: true, tipoTransporte: 'correios' },
      ATOR_AT,
    );
    os = atResponderEquipamentoEnviadoFabrica(os, { foiEnviado: true }, ATOR_AT);

    let sync = buildReg016DadosFromOsFluxo({ os });
    expect(sync.dados.enviado_fabrica).toBe(true);
    expect(sync.dados.tipo_transporte).toBe('correios');
    expect(sync.dados.etiqueta_atual).toBe('BROWN');

    // C -> C1 (Orçamento AMARELA) -> Reprovado C3 -> AT confirma reprovação (VERMELHA)
    os = confirmarNotificacaoSetor(os, ATOR_ADM);
    os = admMarcarEtiquetaAmarelaOrcamento(os, ATOR_ADM);
    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.orcamento_enviado).toBe('C');
    expect(sync.dados.etiqueta_atual).toBe('YELLOW');

    os = admResponderOrcamentoAprovado(os, false, ATOR_ADM);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    sync = buildReg016DadosFromOsFluxo({
      os,
      dadosExistentes: { ...sync.dados, item5_marca: 'Cardios' },
    });

    expect(sync.dados.orcamento_aprovado).toBe('NA');
    expect(sync.dados.orcamento_reprovado).toBe('C');
    expect(sync.dados.liberado_qualidade).toBe('NA');
    expect(sync.dados.item5_marca).toBeUndefined();
    expect(sync.dados.etiqueta_atual).toBe('RED');
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});
  });

  it('Ramificação 3 (Peças Stand-by PRETA -> Retomada AZUL -> REG-035 TEB copiado para Item 5 -> VERDE)', () => {
    let os = criarOsViaReg022({
      numeroOs: 'OS-2026-303',
      identificacao: {
        cliente: 'Instituto do Coração',
        equipamento: 'Eletrocardiógrafo',
        marca: 'TEB',
        modelo: 'ECGPC',
        numeroSerie: 'SN-TEB-303',
      },
      ator: ATOR_ADM,
    });

    os = admMarcarEtiquetaBrancaNoReg016(os, ATOR_ADM);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atRegistrarReg034(os, ATOR_AT);
    os = atMarcarEtiquetaVioleta(os, ATOR_AT);
    os = atMarcarEtiquetaCinzaAnaliseCompleta(os, ATOR_AT);
    os = atResponderPerguntaGarantia(os, false, ATOR_AT);
    os = atResponderPerguntaEnvioFabrica(os, { trataSeEnvioFabrica: false }, ATOR_AT);
    os = confirmarNotificacaoSetor(os, ATOR_ADM);
    os = admMarcarEtiquetaAmarelaOrcamento(os, ATOR_ADM);
    os = admResponderOrcamentoAprovado(os, true, ATOR_ADM);

    // Almoxarifado marca falta de peças -> PRETA (Stand-by POP 009)
    os = confirmarNotificacaoSetor(os, ATOR_ALMOX);
    os = almoxarifadoDecidirPecas(os, 'aguardando_pecas', ATOR_ALMOX);
    let sync = buildReg016DadosFromOsFluxo({ os });
    expect(sync.dados.orcamento_aprovado).toBe('C');
    expect(sync.dados.falta_itens_estoque).toBe('C');
    expect(sync.dados.etiqueta_atual).toBe('BLACK');

    // Peças chegaram -> restaura etiqueta AZUL e remove marcação de falta
    os = almoxarifadoRetomarOsDeAguardandoPecas(os, ATOR_ALMOX);
    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.etiqueta_atual).toBe('BLUE');
    expect(sync.dados.falta_itens_estoque).toBe('NA');

    // Almoxarifado confirma peças disponíveis -> AT confirma peças -> copia REG-035 TEB automaticamente
    os = almoxarifadoDecidirPecas(os, 'pecas_disponiveis', ATOR_ALMOX);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    sync = buildReg016DadosFromOsFluxo({
      os,
      dadosExistentes: sync.dados,
      reg035Dados: {
        teb_cabos_e_acessorios: 'C',
        teb_cabo_de_paciente: 'C',
        problema_tecnico: 'Cabo paciente substituído e ECG validado.',
      },
      reg035Subtipo: 'teb',
    });

    expect(sync.dados.item5_marca).toBe('TEB');
    expect(sync.dados.item5_teb_laudo).toBe('Cabo paciente substituído e ECG validado.');

    // Cancelamento e Reabertura preservam a etapa
    os = cancelarOs(os, 'Solicitação temporária', ATOR_ADM);
    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.etiqueta_cinza).toBe('C');
    os = reabrirOs(os, 'Cliente liberou retomada', ATOR_ADM);
    os = atFinalizarServicoComEtiquetaVerde(os, ATOR_AT);
    os = atPreencherItem5Reg016(os, 'TEB', ATOR_AT);

    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.liberado_qualidade).toBe('C');
    expect(sync.dados.etiqueta_atual).toBe('GREEN');
  });

  it('mergeOsFluxoIntoServiceOrders e hydrateFormFieldsFromOsFluxo mantêm REG-016 sincronizado mesmo sem submissão manual prévia', () => {
    let os = criarOsViaReg022({
      numeroOs: 'OS-2026-404',
      identificacao: {
        cliente: 'Santa Casa Norte',
        equipamento: 'Monitor ECG',
        marca: 'Cardios',
        modelo: 'CardioSmart',
        numeroSerie: 'SN-CRD-404',
      },
      ator: ATOR_ADM,
    });
    os = admMarcarEtiquetaBrancaNoReg016(os, ATOR_ADM);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atRegistrarReg034(os, ATOR_AT);
    os = atMarcarEtiquetaVioleta(os, ATOR_AT);

    const mescladas = mergeOsFluxoIntoServiceOrders([os], []);
    expect(mescladas).toHaveLength(1);
    const ctx = mescladas[0]!;
    expect(ctx.tagColor).toBe('VIOLET');
    expect(ctx.etapasConcluidas.reg022Recebimento).toBe(true);
    expect(ctx.etapasConcluidas.reg034Limpeza).toBe(true);
    expect(ctx.etapasConcluidas.reg016Etapas).toBe(true);

    const prefill = hydrateFormFieldsFromOsFluxo('etapas-manutencao', ctx, { osFluxo: os });
    expect(prefill.numero_os).toBe('OS-2026-404');
    expect(prefill.etiqueta_branca_adm).toBe('C');
    expect(prefill.conferencia_pecas).toBe('C');
    expect(prefill.etiqueta_violeta).toBe('C');
  });

  it('contarPendenciasOsPorPerfil e os-flow-guard suportam fluxo intersetorial e supervisão de Diretor/Qualidade', () => {
    const osInicial = criarOsViaReg022({
      numeroOs: 'OS-2026-505',
      identificacao: {
        cliente: 'Clínica Sul',
        equipamento: 'Incubadora',
        marca: 'OLIDEF',
        modelo: 'RN-2000',
        numeroSerie: 'SN-OLI-505',
      },
      ator: ATOR_DIRETOR,
    });
    const osBranca = admMarcarEtiquetaBrancaNoReg016(structuredClone(osInicial), ATOR_DIRETOR);

    expect(contarPendenciasOsPorPerfil([osBranca], 'tecnico')).toBe(1);
    expect(contarPendenciasOsPorPerfil([osBranca], 'adm')).toBe(0);
    expect(contarPendenciasOsPorPerfil([osBranca], 'estoquista')).toBe(0);
    expect(contarPendenciasOsPorPerfil([osBranca], 'diretor')).toBe(1);

    // Validação do servidor aceita transição executada por Diretor ou Qualidade com seu próprio perfil real
    const resDiretor = validarTransicaoOsNoServidor({
      anterior: structuredClone(osInicial),
      proximo: structuredClone(osBranca),
      perfil: 'diretor',
    });
    expect(resDiretor.permitido).toBe(true);

    const osConfirmadaGestor = confirmarNotificacaoSetor(structuredClone(osBranca), ATOR_GESTOR);
    const resGestor = validarTransicaoOsNoServidor({
      anterior: structuredClone(osBranca),
      proximo: structuredClone(osConfirmadaGestor),
      perfil: 'gestor',
    });
    expect(resGestor.permitido).toBe(true);

    // Após REG-034 concluir, Etiqueta VIOLETA fica marcada no REG-016 enquanto CINZA segue desmarcada
    let osReg034 = confirmarNotificacaoSetor(structuredClone(osBranca), ATOR_AT);
    osReg034 = atRegistrarReg034(osReg034, ATOR_AT);
    const reg016Apos034 = buildReg016DadosFromOsFluxo({ os: osReg034 });
    expect(reg016Apos034.dados.etiqueta_violeta).toBe('C');
    expect(reg016Apos034.dados.etiqueta_cinza).toBeUndefined();
    expect(reg016Apos034.dados.item5_marca).toBeUndefined();

    // Guarda de servidor permite que AT preencha REG-035 / Item 5 imediatamente após Etiqueta VERDE
    let osPronta = atMarcarEtiquetaVioleta(osReg034, ATOR_AT);
    osPronta = atMarcarEtiquetaCinzaAnaliseCompleta(osPronta, ATOR_AT);
    osPronta = atResponderPerguntaGarantia(osPronta, true, ATOR_AT);
    osPronta = confirmarNotificacaoSetor(osPronta, ATOR_ALMOX);
    osPronta = almoxarifadoDecidirPecas(osPronta, 'pecas_disponiveis', ATOR_ALMOX);
    osPronta = confirmarNotificacaoSetor(osPronta, ATOR_AT);
    const osVerde = atFinalizarServicoComEtiquetaVerde(structuredClone(osPronta), ATOR_AT);
    const osItem5PosVerde = atPreencherItem5Reg016(structuredClone(osVerde), 'OLIDEF', ATOR_AT);
    const resItem5PosVerde = validarTransicaoOsNoServidor({
      anterior: osVerde,
      proximo: osItem5PosVerde,
      perfil: 'tecnico',
    });
    expect(resItem5PosVerde.permitido).toBe(true);
  });
});
