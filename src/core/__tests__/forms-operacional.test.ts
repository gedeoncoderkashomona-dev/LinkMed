import { describe, expect, it } from 'vitest';

import {
  avaliarConformidade,
  campoVisivel,
  canEditGovernance,
  FORM_DEFS,
  getCampos,
  getFormDef,
  getSecoes,
  getSubtipo,
  sanitizarDados,
  validarDados,
} from '@/core/domain/forms/definitions';
import {
  agoraBR,
  alertaHigienizacaoBancada,
  alertaLeituraForaDaFaixa,
  alertasCalibracao,
  alertaTemperaturaUmidade,
  calcularAlertas,
  diffDias,
  statusCalibracoes,
} from '@/core/domain/forms/alerts';
import {
  aggregateServiceOrders,
  hydrateFormFieldsFromOs,
  TAG_SPECS,
  TAG_SPECS_LIST,
} from '@/core/domain/forms/os-workflow';
import type { FormRecord } from '@/core/domain/entities/operacional';

describe('Módulos Operacionais — Catálogo, Validação e Conformidade (Fase 4)', () => {
  it('contém exatamente os 9 módulos da Assistência Técnica e Almoxarifado', () => {
    expect(FORM_DEFS).toHaveLength(9);

    // Inspeção de recebimento deve constar tanto em Assistência Técnica quanto em Almoxarifado
    const reg022 = getFormDef('inspecao-recebimento')!;
    expect(reg022.setores).toContain('assistencia_tecnica');
    expect(reg022.setores).toContain('almoxarifado');

    // Checklist de manutenção deve ter submódulos OLIDEF e TEB
    const reg035 = getFormDef('checklist-manutencao')!;
    expect(getSubtipo(reg035, 'olidef')).toBeDefined();
    expect(getSubtipo(reg035, 'teb')).toBeDefined();
    expect(getSecoes(reg035, 'olidef').length).toBeGreaterThan(reg035.secoes.length);
  });

  it('exibe tipo de transporte apenas quando enviado à fábrica no REG-016', () => {
    const reg016 = getFormDef('etapas-manutencao')!;
    const campoTransporte = getCampos(reg016).find((c) => c.name === 'tipo_transporte')!;
    expect(campoTransporte).toBeDefined();

    expect(campoVisivel(campoTransporte, { enviado_fabrica: false })).toBe(false);
    expect(campoVisivel(campoTransporte, { enviado_fabrica: true })).toBe(true);
  });

  it('valida campos obrigatórios, sanitiza e avalia conformidade nos formulários', () => {
    const reg035 = getFormDef('checklist-manutencao')!;
    // Sem subtipo deve falhar
    const errSemSubtipo = validarDados(reg035, null, {});
    expect(errSemSubtipo.subtipo).toBeDefined();

    // Temperatura e umidade (REG-017)
    const reg017 = getFormDef('temperatura-umidade')!;
    const dadosValidos = {
      data: '2026-10-16',
      hora: '09:00',
      periodo: 'manha',
      temperatura_atual: '24.5',
      temperatura_min: '21',
      temperatura_max: '26',
      umidade_atual: '55',
      umidade_min: '45',
      umidade_max: '60',
      responsavel: 'Carlos',
    };
    expect(validarDados(reg017, null, dadosValidos)).toEqual({});
    const limpo = sanitizarDados(reg017, null, { ...dadosValidos, extra_invalido: 'ignorar' });
    expect(limpo.temperatura_atual).toBe(24.5);
    expect(limpo).not.toHaveProperty('extra_invalido');
    expect(avaliarConformidade(reg017, null, limpo)).toBe('conforme');

    // Temperatura acima de 30°C deve gerar nao_conforme
    expect(
      avaliarConformidade(reg017, null, { ...limpo, temperatura_atual: 33 }),
    ).toBe('nao_conforme');

    // Pulseira antiestática (REG-040)
    const reg040 = getFormDef('pulseira-antiestatica')!;
    expect(avaliarConformidade(reg040, null, { resultado: 'reprovado' })).toBe('nao_conforme');
    expect(avaliarConformidade(reg040, null, { resultado: 'aprovado' })).toBe('conforme');
  });
});

describe('Alertas Operacionais — Rotinas Diárias, Semanais e Calibração 60 dias (Fase 4/7)', () => {
  const quartaTarde = new Date('2026-10-14T18:30:00Z'); // 15:30 BRT (quarta-feira)

  it('calcula alertas de higienização semanal da bancada (REG-018) e temperatura 2x/dia (REG-017)', () => {
    const info = agoraBR(quartaTarde);
    expect(info.data).toBe('2026-10-14');
    expect(diffDias('2026-10-01', '2026-10-14')).toBe(13);

    // Sem registros na semana -> alerta de bancada atrasada
    const alertaBancada = alertaHigienizacaoBancada([], quartaTarde);
    expect(alertaBancada?.nivel).toBe('danger');

    // Com registro na segunda-feira da mesma semana -> sem alerta
    expect(
      alertaHigienizacaoBancada(
        [{ tipo: 'higienizacao-bancada', dataRef: '2026-10-12', dados: {} }],
        quartaTarde,
      ),
    ).toBeNull();

    // Temperatura sem medição da tarde às 15:30 -> warning
    const alertaTemp = alertaTemperaturaUmidade(
      [{ tipo: 'temperatura-umidade', dataRef: '2026-10-14', dados: { periodo: 'manha' } }],
      quartaTarde,
    );
    expect(alertaTemp?.descricao).toContain('tarde');

    // Leitura fora da faixa
    const alertaFora = alertaLeituraForaDaFaixa(
      [
        {
          tipo: 'temperatura-umidade',
          dataRef: '2026-10-14',
          dados: { temperatura_atual: 34, umidade_atual: 50 },
        },
      ],
      quartaTarde,
    );
    expect(alertaFora?.nivel).toBe('danger');
  });

  it('alerta calibrações vencendo em até 60 dias ou já vencidas', () => {
    const registros = [
      {
        tipo: 'validade-calibracao',
        dataRef: '2026-10-01',
        dados: {
          equipamento: 'Multímetro Fluke',
          numero_serie: 'FLK-01',
          validade: '2026-11-20', // 37 dias a partir de 2026-10-14 (<= 60 dias)
        },
      },
      {
        tipo: 'validade-calibracao',
        dataRef: '2026-10-01',
        dados: {
          equipamento: 'Analisador Segurança Elétrica',
          numero_serie: 'ASE-02',
          validade: '2026-09-10', // vencida
        },
      },
      {
        tipo: 'validade-calibracao',
        dataRef: '2026-10-01',
        dados: {
          equipamento: 'Simulador ECG',
          numero_serie: 'ECG-03',
          validade: '2027-06-01', // > 60 dias (vigente)
        },
      },
    ];

    const status = statusCalibracoes(registros, quartaTarde);
    expect(status).toHaveLength(3);
    const alertas = alertasCalibracao(registros, quartaTarde);
    expect(alertas).toHaveLength(2);
    expect(alertas[0]?.nivel).toBe('danger');
    expect(alertas[1]?.nivel).toBe('warning');

    const todos = calcularAlertas(registros, quartaTarde);
    expect(todos.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Máquina de Estados da OS e Etiquetas Coloridas REG-016 (Fase 5)', () => {
  it('possui as 10 etiquetas oficiais do REG-016 e agrega o ciclo de vida completo de uma OS', () => {
    expect(TAG_SPECS_LIST).toHaveLength(10);
    expect(TAG_SPECS.VIOLET.status).toBe('HIGIENIZADO');
    expect(TAG_SPECS.BROWN.status).toBe('ENVIADO_FABRICA');
    expect(TAG_SPECS.GREEN.status).toBe('SERVICO_FINALIZADO');

    const records: FormRecord[] = [
      {
        id: 'r1',
        tipo: 'inspecao-recebimento',
        subtipo: null,
        status: 'conforme',
        dataRef: '2026-10-10',
        criadoPor: 'u1',
        criadoPorNome: 'Carlos',
        createdAt: new Date('2026-10-10T10:00:00Z'),
        dados: {
          numero_os: 'OS-2026-500',
          cliente: 'Hospital Santa Casa',
          equipamento: 'Incubadora Neonatal',
          marca: 'OLIDEF',
          modelo: 'SCT-8',
          numero_serie: 'SN-500',
          relato_cliente: 'Falha no sensor de temperatura',
        },
      },
      {
        id: 'r2',
        tipo: 'limpeza-equipamento',
        subtipo: null,
        status: 'conforme',
        dataRef: '2026-10-11',
        criadoPor: 'u1',
        criadoPorNome: 'Carlos',
        createdAt: new Date('2026-10-11T10:00:00Z'),
        dados: {
          numero_os: 'OS-2026-500',
          numero_serie: 'SN-500',
        },
      },
      {
        id: 'r3',
        tipo: 'etapas-manutencao',
        subtipo: null,
        status: 'conforme',
        dataRef: '2026-10-12',
        criadoPor: 'u1',
        criadoPorNome: 'Carlos',
        createdAt: new Date('2026-10-12T10:00:00Z'),
        dados: {
          numero_os: 'OS-2026-500',
          numero_serie: 'SN-500',
          enviado_fabrica: true,
          tipo_transporte: 'correios',
        },
      },
    ];

    const osList = aggregateServiceOrders(records);
    expect(osList).toHaveLength(1);
    const os = osList[0]!;
    expect(os.cliente).toBe('Hospital Santa Casa');
    expect(os.etapasConcluidas.reg022Recebimento).toBe(true);
    expect(os.etapasConcluidas.reg034Limpeza).toBe(true);
    expect(os.etapasConcluidas.reg016Etapas).toBe(true);
    expect(os.tagColor).toBe('BROWN');
    expect(os.tipoTransporte).toBe('correios');

    const hydrated = hydrateFormFieldsFromOs('etapas-manutencao', os);
    expect(hydrated.numero_os).toBe('OS-2026-500');
    expect(hydrated.cliente).toBe('Hospital Santa Casa');
    expect(hydrated.etiqueta_violeta).toBe('C');
  });

  it('bloqueia edição de responsáveis em formulários operacionais para usuários comuns (RDC 665/22)', () => {
    // 1. Verificação de permissões do RBAC de governança
    expect(canEditGovernance('diretor')).toBe(true);
    expect(canEditGovernance('gestor')).toBe(true);
    expect(canEditGovernance('tecnico')).toBe(false);
    expect(canEditGovernance('estoquista')).toBe(false);
    expect(canEditGovernance('auditor' as any)).toBe(false);
    expect(canEditGovernance(undefined)).toBe(false);

    const reg022 = getFormDef('inspecao-recebimento')!;

    // 2. Técnico tenta adulterar elaborado_por, revisado_por e aprovado_por
    const dadosTentativaFraude = {
      numero_os: 'OS-2026-999',
      cliente: 'Hospital Central',
      equipamento: 'Desfibrilador',
      marca: 'Instramed',
      modelo: 'CardioMax',
      numero_serie: 'CMD-1010',
      elaborado_por: 'Tentativa Fraude Técnico',
      revisado_por: 'Tentativa Fraude Técnico',
      aprovado_por: 'Tentativa Fraude Técnico',
    };

    const dadosSanitizadosTecnico = sanitizarDados(
      reg022,
      null,
      dadosTentativaFraude,
      'tecnico',
    );

    // Deve forçar os valores padrão de governança
    expect(dadosSanitizadosTecnico.elaborado_por).toBe(reg022.responsaveis.elaboradoPor);
    expect(dadosSanitizadosTecnico.revisado_por).toBe(reg022.responsaveis.revisadoPor);
    expect(dadosSanitizadosTecnico.aprovado_por).toBe(reg022.responsaveis.aprovadoPor);

    // 3. Diretor ou Qualidade (gestor) pode atualizar a governança
    const dadosSanitizadosDiretor = sanitizarDados(
      reg022,
      null,
      {
        ...dadosTentativaFraude,
        elaborado_por: 'Qualidade Homologada',
        revisado_por: 'RT Homologado',
        aprovado_por: 'Diretoria Executiva',
      },
      'diretor',
    );

    expect(dadosSanitizadosDiretor.elaborado_por).toBe('Qualidade Homologada');
    expect(dadosSanitizadosDiretor.revisado_por).toBe('RT Homologado');
    expect(dadosSanitizadosDiretor.aprovado_por).toBe('Diretoria Executiva');
  });
});
