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
import { buildOrdemServicoFluxoFromV4 } from '@/core/domain/os-v4/adapter';
import { decidir, type Comando, type Evento, type Perfil } from '@/core/domain/os-v4/nucleo';

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

function aplicarV4(
  eventos: Evento[],
  cmd: Comando,
  perfil: Perfil,
  opts?: { reg034Salvo?: boolean; item5Preenchido?: boolean },
): Evento[] {
  const novos = decidir(
    eventos,
    cmd,
    { id: `u-${perfil.toLowerCase()}`, perfil, nome: perfil },
    {
      agora: new Date('2026-11-18T14:00:00Z'),
      feriados: [],
      versaoVista: eventos.length,
      reg034Salvo: opts?.reg034Salvo,
      item5Preenchido: opts?.item5Preenchido,
      enforceJanelaHorario: true,
    },
  );
  return [
    ...eventos,
    ...novos.map((ev, idx) => ({ id: `ev-${eventos.length + idx + 1}`, ...ev })),
  ];
}

describe('Sincronização OS Fluxo v4 <-> REG-016 <-> Notificações Setoriais', () => {
  it('Ramificação 1 (Garantia -> LARANJA -> Peças OK -> Item 5 -> VERDE): sincroniza REG-016 limpo (sem campos de etiqueta/orçamento bloqueando)', () => {
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

    // A2: ADM marca Etiqueta BRANCA -> REG-016 é inicializado sem campos artificiais de etiqueta/orçamento
    os = admMarcarEtiquetaBrancaNoReg016(os, ATOR_ADM);
    expect(osDeveSincronizarReg016(os)).toBe(true);
    let sync = buildReg016DadosFromOsFluxo({ os });
    expect(sync.dados.numero_os).toBe('OS-2026-101');
    expect(sync.dados.cliente).toBe('Hospital São Lucas');
    expect(sync.dados.conferencia_pecas).toBe('C');
    expect(sync.dados.etiqueta_atual).toBe('WHITE');
    expect(sync.dados.etiqueta_branca_adm).toBeUndefined();
    expect(sync.dados.etiqueta_violeta).toBeUndefined();
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});

    // A3 -> A4 -> A5 (VIOLETA) -> A6 (CINZA) -> B1 Garantia SIM (LARANJA)
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atRegistrarReg034(os, ATOR_AT);
    os = atMarcarEtiquetaVioleta(os, ATOR_AT);
    os = atMarcarEtiquetaCinzaAnaliseCompleta(os, ATOR_AT);
    os = atResponderPerguntaGarantia(os, true, ATOR_AT);

    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.etiqueta_atual).toBe('ORANGE');
    expect(sync.dados.orcamento_enviado).toBeUndefined();
    expect(sync.dados.orcamento_aprovado).toBeUndefined();
    expect(sync.dados.orcamento_reprovado).toBeUndefined();
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});

    // D1 -> D4 (Almoxarifado Peças Disponíveis) -> D5 AT confirma -> D6 VERDE -> Item 5 / REG 035
    os = confirmarNotificacaoSetor(os, ATOR_ALMOX);
    os = almoxarifadoDecidirPecas(os, 'pecas_disponiveis', ATOR_ALMOX);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    os = atFinalizarServicoComEtiquetaVerde(os, ATOR_AT);
    os = atPreencherItem5Reg016(os, 'OLIDEF', ATOR_AT);

    // Simula preenchimento do checklist OLIDEF (REG-035)
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
    expect(sync.dados.etiqueta_calibracao).toBe('C');
    expect(sync.dados.inspecao_final).toBe('C');
    expect(sync.dados.assinatura_tecnico).toBe('Carlos (AT)');
    expect(sync.dados.item5_marca).toBe('OLIDEF');
    expect(sync.dados.item5_olidef_laudo).toBe('Sensor calibrado e resistência revisada com sucesso.');
    expect(sync.dados.etiqueta_atual).toBe('GREEN');
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});
  });

  it('Ramificação 2 (Envio à Fábrica MARROM -> Orçamento AMARELA -> Reprovado VERMELHA): aplica etiqueta VERMELHA e limpa/bloqueia Item 5', () => {
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
    expect(sync.dados.etiqueta_atual).toBe('BROWN');
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});

    // C -> C1 (Orçamento AMARELA) -> Reprovado C3 -> AT confirma reprovação (VERMELHA)
    os = confirmarNotificacaoSetor(os, ATOR_ADM);
    os = admMarcarEtiquetaAmarelaOrcamento(os, ATOR_ADM);
    sync = buildReg016DadosFromOsFluxo({ os, dadosExistentes: sync.dados });
    expect(sync.dados.etiqueta_atual).toBe('YELLOW');

    os = admResponderOrcamentoAprovado(os, false, ATOR_ADM);
    os = confirmarNotificacaoSetor(os, ATOR_AT);
    sync = buildReg016DadosFromOsFluxo({
      os,
      dadosExistentes: { ...sync.dados, item5_marca: 'Cardios' },
    });

    expect(sync.dados.item5_marca).toBeUndefined();
    expect(sync.dados.etiqueta_atual).toBe('RED');
    expect(validarDados(reg016Def, null, sync.dados)).toEqual({});
  });

  it('Ramificação 3 v4 (Peças Stand-by PRETA -> Retomada -> Item 5 antes da Etiqueta VERDE -> VERDE)', () => {
    let eventos: Evento[] = [];
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'ABRIR_REG016' }, 'ADM');
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'RECEBER_OS' }, 'AT');
    eventos = aplicarV4(
      eventos,
      { tipo: 'ACAO', acao: 'REG034_SALVO' },
      'AT',
      { reg034Salvo: true },
    );
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'MARCAR_HIGIENIZADO' }, 'AT');
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'ANALISE_COMPLETA' }, 'AT');
    eventos = aplicarV4(
      eventos,
      { tipo: 'ACAO', acao: 'RESPONDER_GARANTIA', valor: false },
      'AT',
    );
    eventos = aplicarV4(
      eventos,
      { tipo: 'ACAO', acao: 'RESPONDER_ENVIO', valor: false },
      'AT',
    );
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'AGUARDAR_APROVACAO' }, 'ADM');
    eventos = aplicarV4(
      eventos,
      { tipo: 'ACAO', acao: 'RESPONDER_ORCAMENTO', valor: true },
      'ADM',
    );
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'AGUARDANDO_PECAS' }, 'ALMOXARIFADO');

    const meta = {
      id: 'os-303',
      numeroOs: 'OS-2026-303',
      identificacao: {
        cliente: 'Instituto do Coração',
        equipamento: 'Eletrocardiógrafo',
        marca: 'TEB',
        modelo: 'ECGPC',
        numeroSerie: 'SN-TEB-303',
      },
      criadaPorId: 'u-adm',
      criadaPorNome: 'Fernanda (ADM)',
      criadaEm: '2026-11-18T14:00:00Z',
    };

    let os = buildOrdemServicoFluxoFromV4({ meta, eventos, reg034Salvo: true, item5Preenchido: false });
    let sync = buildReg016DadosFromOsFluxo({ os });
    expect(sync.dados.etiqueta_atual).toBe('BLACK');

    // Peças chegaram -> AT confirma recebimento -> preenche REG-035 TEB antes de marcar VERDE (D8)
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'PECAS_DISPONIVEIS' }, 'ALMOXARIFADO');
    eventos = aplicarV4(eventos, { tipo: 'ACAO', acao: 'PECAS_RECEBIDAS' }, 'AT');
    // Decisão D8: sem item5Preenchido, P05 SERVICO_FINALIZADO é recusado
    expect(() =>
      aplicarV4(
        eventos,
        { tipo: 'ACAO', acao: 'SERVICO_FINALIZADO' },
        'AT',
        { item5Preenchido: false },
      ),
    ).toThrow(/item 5/i);

    eventos = aplicarV4(
      eventos,
      { tipo: 'ACAO', acao: 'SERVICO_FINALIZADO' },
      'AT',
      { item5Preenchido: true },
    );

    os = buildOrdemServicoFluxoFromV4({ meta, eventos, reg034Salvo: true, item5Preenchido: true });
    const reg035TebSub = getFormDef('checklist-manutencao')!.subtipos!.find((s) => s.key === 'teb')!;
    const reg035TebDados: Record<string, unknown> = {
      problema_tecnico: 'Cabo paciente substituído e ECG validado.',
    };
    for (const sec of reg035TebSub.secoes) {
      for (const campo of sec.campos) {
        if (campo.type === 'cnc') reg035TebDados[campo.name] = 'C';
      }
    }
    sync = buildReg016DadosFromOsFluxo({
      os,
      dadosExistentes: sync.dados,
      reg035Dados: reg035TebDados,
      reg035Subtipo: 'teb',
    });

    expect(sync.dados.item5_marca).toBe('TEB');
    expect(sync.dados.item5_teb_laudo).toBe('Cabo paciente substituído e ECG validado.');
    expect(sync.dados.etiqueta_atual).toBe('GREEN');
    expect(validarDados(getFormDef('etapas-manutencao')!, null, sync.dados)).toEqual({});
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
    expect(prefill.conferencia_pecas).toBe('C');
    expect(ctx.tagColor).toBe('VIOLET');
    expect(prefill.item5_marca).toBeUndefined();

    // Cancelamento e Reabertura preservam etiqueta
    const cancelada = cancelarOs(os, 'Solicitação temporária', ATOR_ADM);
    expect(cancelada.estadoGeral).toBe('cancelada');
    const reaberta = reabrirOs(cancelada, 'Retomada', ATOR_ADM);
    expect(reaberta.etiquetaAtual).toBe('VIOLET');
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

    // Após REG-034 + higienização concluir, sincronização mantém etiqueta VIOLETA e sem campos extras obrigatórios no REG-016
    let osReg034 = confirmarNotificacaoSetor(structuredClone(osBranca), ATOR_AT);
    osReg034 = atRegistrarReg034(osReg034, ATOR_AT);
    osReg034 = atMarcarEtiquetaVioleta(osReg034, ATOR_AT);
    const reg016Apos034 = buildReg016DadosFromOsFluxo({ os: osReg034 });
    expect(reg016Apos034.dados.etiqueta_atual).toBe('VIOLET');
    expect(reg016Apos034.dados.item5_marca).toBeUndefined();
    expect(validarDados(getFormDef('etapas-manutencao')!, null, reg016Apos034.dados)).toEqual({});

    // Guarda de servidor permite que AT preencha REG-035 / Item 5 quando OS em execução
    let osPronta = atMarcarEtiquetaCinzaAnaliseCompleta(osReg034, ATOR_AT);
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
