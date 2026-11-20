import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FormRecord } from '@/core/domain/entities/operacional';
import type { FormTipo } from '@/core/domain/forms/definitions';
import { getCampos, getFormDef, validarDados } from '@/core/domain/forms/definitions';
import {
  buildOrdemServicoFluxoFromV4,
  converterEstadoLegadoParaEventosV4,
} from '@/core/domain/os-v4/adapter';
import { FERIADOS_DATAS_PADRAO } from '@/core/domain/os-v4/feriados';
import {
  decidir,
  estadoDe,
  lembreteDevido,
  type Evento,
} from '@/core/domain/os-v4/nucleo';
import { isRuleErrorMessage, showRuleNotice, subscribeRuleNotices, dismissCurrentRuleNotice } from '@/lib/rule-notice';

// Mocks de fronteira para testar rotas API v4 de ponta a ponta sem depender de rede externa
const mockState = vi.hoisted(() => ({
  auth: { sub: 'u-adm', perfil: 'adm' as const, email: 'adm@linkmed.com' },
  carregada: null as any,
  listaOrdens: [] as any[],
  feriados: [
    { data: '2026-11-20', descricao: 'Consciência Negra', escopo: 'nacional' as const },
  ],
  records: [] as FormRecord[],
  ultimaChamadaComando: null as any,
  auditCalls: [] as any[],
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn(async () => mockState.auth),
}));

vi.mock('@/infra/db', () => ({
  getRepositories: () => ({
    userRepository: {
      findById: vi.fn(async (id: string) => ({
        id,
        nomeCompleto: id === 'u-adm' ? 'Fernanda ADM' : 'Carlos AT',
      })),
    },
    auditService: {
      registrar: vi.fn(async (...args: unknown[]) => {
        mockState.auditCalls.push(args);
      }),
    },
    operacionalRepository: {
      listFormRecords: vi.fn(async (filter?: { tipo?: string }) =>
        filter?.tipo ? mockState.records.filter((r) => r.tipo === filter.tipo) : mockState.records,
      ),
      findLatestFormRecordByOs: vi.fn(async (tipo: string, numeroOs: string) => {
        const norm = numeroOs.trim().toLowerCase();
        return (
          mockState.records.find(
            (r) =>
              r.tipo === tipo &&
              String(r.dados?.numero_os ?? '').trim().toLowerCase() === norm,
          ) ?? null
        );
      }),
      findFormRecordById: vi.fn(async (id: string) =>
        mockState.records.find((r) => r.id === id) ?? null,
      ),
      createFormRecord: vi.fn(async (input: any) => {
        const rec: FormRecord = {
          id: `rec-${mockState.records.length + 1}`,
          tipo: input.tipo,
          subtipo: input.subtipo ?? null,
          dados: input.dados,
          status: input.status,
          dataRef: input.dataRef,
          criadoPor: input.criadoPor,
          criadoPorNome: input.criadoPor === 'u-adm' ? 'Fernanda ADM' : 'Carlos AT',
          createdAt: new Date(),
          versaoSchema: input.versaoSchema ?? 2,
          historicoEdicoes: [],
        };
        mockState.records.unshift(rec);
        return rec;
      }),
      upsertFormRecordByOs: vi.fn(async (tipo: string, numeroOs: string, input: any) => {
        const norm = numeroOs.trim().toLowerCase();
        const idx = mockState.records.findIndex(
          (r) =>
            r.tipo === tipo &&
            String(r.dados?.numero_os ?? '').trim().toLowerCase() === norm,
        );
        if (idx >= 0) {
          const prev = mockState.records[idx]!;
          const updated: FormRecord = {
            ...prev,
            subtipo: input.subtipo ?? prev.subtipo,
            dados: input.dados,
            status: input.status,
            dataRef: input.dataRef,
          };
          mockState.records[idx] = updated;
          return updated;
        }
        const created: FormRecord = {
          id: `rec-${mockState.records.length + 1}`,
          tipo: tipo as FormTipo,
          subtipo: input.subtipo ?? null,
          dados: input.dados,
          status: input.status,
          dataRef: input.dataRef,
          criadoPor: input.criadoPor,
          criadoPorNome: 'Operador',
          createdAt: new Date(),
          versaoSchema: input.versaoSchema ?? 2,
          historicoEdicoes: [],
        };
        mockState.records.unshift(created);
        return created;
      }),
      updateFormRecordById: vi.fn(async (id: string, input: any) => {
        const idx = mockState.records.findIndex((r) => r.id === id);
        if (idx < 0) return null;
        const prev = mockState.records[idx]!;
        const diff = Object.keys({ ...prev.dados, ...input.dados })
          .filter((k) => prev.dados[k] !== input.dados[k])
          .map((k) => ({ campo: k, antes: prev.dados[k] ?? null, depois: input.dados[k] ?? null }));
        const updated: FormRecord = {
          ...prev,
          dados: input.dados,
          status: input.status,
          dataRef: input.dataRef ?? prev.dataRef,
          historicoEdicoes: [
            ...(prev.historicoEdicoes ?? []),
            {
              alteradoEm: new Date().toISOString(),
              usuarioId: input.alteradoPorId,
              usuarioNome: input.alteradoPorNome ?? null,
              motivo: input.motivo ?? null,
              alteracoes: diff,
            },
          ],
        };
        mockState.records[idx] = updated;
        return updated;
      }),
    },
  }),
}));

vi.mock('@/infra/db/supabase/os-v4-store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/infra/db/supabase/os-v4-store')>();
  return {
    ...real,
    carregarOsV4PorNumero: vi.fn(async (num: string) => {
      if (
        mockState.carregada &&
        mockState.carregada.meta.numeroOs.trim().toLowerCase() === num.trim().toLowerCase()
      ) {
        return mockState.carregada;
      }
      return null;
    }),
    listarOrdensV4: vi.fn(async () => mockState.listaOrdens),
    existeNumeroOsV4: vi.fn(async (num: string) => {
      const norm = num.trim().toLowerCase();
      const dupMeta =
        mockState.carregada &&
        mockState.carregada.meta.numeroOs.trim().toLowerCase() === norm;
      const dupRec = mockState.records.find(
        (r) =>
          r.tipo === 'inspecao-recebimento' &&
          String(r.dados?.numero_os ?? '').trim().toLowerCase() === norm,
      );
      return {
        existe: Boolean(dupMeta || dupRec),
        numeroExistente:
          mockState.carregada?.meta.numeroOs ??
          (dupRec ? String(dupRec.dados?.numero_os) : undefined),
      };
    }),
    criarOsInicialV4: vi.fn(async (params: any) => {
      const estado = estadoDe([]);
      const meta = {
        id: 'os-1',
        numeroOs: params.numeroOs,
        identificacao: params.identificacao,
        criadaPorId: params.usuarioId,
        criadaPorNome: params.usuarioNome,
        criadaEm: new Date().toISOString(),
      };
      const fluxoState = buildOrdemServicoFluxoFromV4({
        meta,
        eventos: [],
        notificacoes: [],
      });
      mockState.carregada = {
        meta,
        eventos: [],
        estado,
        notificacoes: [],
        reg034Salvo: false,
        item5Preenchido: false,
        fluxoState,
      };
      return mockState.carregada;
    }),
    executarComandoOsV4: vi.fn(async (params: any) => {
      mockState.ultimaChamadaComando = params;
      if (!mockState.carregada) {
        throw new Error('OS não encontrada');
      }
      const { Recusado, decidir: decidirReal, perfilSistemaParaSetorV4, notificacoesDe } =
        await import('@/core/domain/os-v4/nucleo');

      const setor = perfilSistemaParaSetorV4(params.perfilSistema);
      if (!setor) throw new Recusado('perfil', 'Perfil sem ação operacional.');

      const flags = real.verificarFlagsFormulariosOs(
        mockState.carregada.meta.numeroOs,
        mockState.records,
      );
      mockState.carregada.reg034Salvo = flags.reg034Salvo;
      mockState.carregada.item5Preenchido = flags.item5Preenchido;

      const novosSemId = decidirReal(
        mockState.carregada.eventos,
        params.comando,
        { id: params.usuarioId, perfil: setor, nome: params.usuarioNome },
        {
          agora: new Date('2026-11-18T14:00:00Z'),
          feriados: [],
          reg034Salvo: flags.reg034Salvo,
          item5Preenchido: flags.item5Preenchido,
          versaoVista: params.versaoVista,
          enforceJanelaHorario: false,
        },
      );

      const baseLen = mockState.carregada.eventos.length;
      const novosEventos: Evento[] = novosSemId.map((ev, i) => ({
        id: `ev-${baseLen + i + 1}`,
        ...ev,
      }));
      const todos = [...mockState.carregada.eventos, ...novosEventos];
      const novasNotifs = novosEventos.flatMap((ev, i) =>
        notificacoesDe(ev, mockState.carregada.meta.numeroOs, todos.slice(0, baseLen + i), []).map(
          (n, j) => ({
            id: `n-${baseLen + i + 1}-${j}`,
            osId: mockState.carregada.meta.id,
            numeroOs: mockState.carregada.meta.numeroOs,
            numeroOsNormalizado: mockState.carregada.meta.numeroOs.toLowerCase(),
            para: n.para,
            mensagem: n.msg,
            criadaEm: n.criadaEm,
            entregarEm: n.entregarEm,
            confirmadaEm: null,
            confirmadaPorId: null,
            confirmadaPorNome: null,
            ultimoLembreteEm: null,
          }),
        ),
      );
      const nextEstado = estadoDe(todos);
      mockState.carregada = {
        ...mockState.carregada,
        eventos: todos,
        estado: nextEstado,
        notificacoes: [...novasNotifs, ...mockState.carregada.notificacoes],
        fluxoState: buildOrdemServicoFluxoFromV4({
          meta: mockState.carregada.meta,
          eventos: todos,
          reg034Salvo: mockState.carregada.reg034Salvo,
          item5Preenchido: mockState.carregada.item5Preenchido,
        }),
      };
      return mockState.carregada;
    }),
    confirmarNotificacaoOsV4: vi.fn(async (params: any) => {
      const { Recusado, perfilSistemaParaSetorV4 } = await import('@/core/domain/os-v4/nucleo');
      const notif = mockState.carregada?.notificacoes.find(
        (n: any) => n.id === params.notificacaoId,
      );
      if (!notif) throw new Recusado('estado', 'Notificação não encontrada.');
      const setor = perfilSistemaParaSetorV4(params.perfilSistema);
      if (!setor || setor !== notif.para) {
        throw new Recusado(
          'perfil',
          `Apenas o setor ${notif.para} pode confirmar ciência desta notificação.`,
        );
      }
      notif.confirmadaEm = new Date().toISOString();
      notif.confirmadaPorId = params.usuarioId;
      notif.confirmadaPorNome = params.usuarioNome;
      return notif;
    }),
    obterFeriadosV4: vi.fn(async () => mockState.feriados),
    adicionarFeriadoV4: vi.fn(async (p: any) => {
      const item = { data: p.data, descricao: p.descricao, escopo: p.escopo ?? 'personalizado' };
      mockState.feriados.push(item);
      return item;
    }),
    removerFeriadoV4: vi.fn(async (p: any) => {
      mockState.feriados = mockState.feriados.filter((f) => f.data !== p.data);
    }),
  };
});

import { POST as comandosPost } from '@/app/api/os-flow/comandos/route';
import { POST as confirmarNotifPost } from '@/app/api/os-flow/notificacoes/confirmar/route';
import { POST as formsPost, PATCH as formsPatch } from '@/app/api/forms/route';
import { GET as feriadosGet, POST as feriadosPost, DELETE as feriadosDelete } from '@/app/api/feriados/route';

function makeJsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('Integração v4 End-to-End — APIs, Concorrência, REG-016 Limpo, Feriados e Pop-up "Entendi"', () => {
  beforeEach(() => {
    mockState.auth = { sub: 'u-adm', perfil: 'adm' as any, email: 'adm@linkmed.com' };
    mockState.records = [];
    mockState.listaOrdens = [];
    mockState.auditCalls = [];
    mockState.feriados = [
      { data: '2026-11-20', descricao: 'Consciência Negra', escopo: 'nacional' },
    ];
    mockState.carregada = {
      meta: {
        id: 'os-203101',
        numeroOs: '203101',
        identificacao: {
          cliente: 'Hospital Teste',
          equipamento: 'Monitor',
          marca: 'Cardios',
          modelo: 'M1',
          numeroSerie: 'SN1',
        },
        criadaPorId: 'u-adm',
        criadaPorNome: 'Fernanda ADM',
        criadaEm: '2026-11-18T12:00:00Z',
      },
      eventos: [],
      estado: estadoDe([]),
      notificacoes: [],
      reg034Salvo: false,
      item5Preenchido: false,
      fluxoState: null as any,
    };
    mockState.carregada.fluxoState = buildOrdemServicoFluxoFromV4({
      meta: mockState.carregada.meta,
      eventos: [],
    });
  });

  it('POST /api/os-flow/comandos executa A01, rejeita concorrência (R10 -> 409) e setor errado (R02 -> 403)', async () => {
    // Setor AT tentando ação de ADM (ABRIR_REG016) deve ser recusado com 403 + codigo 'perfil'
    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    const resAtForbidden = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: '203101',
        versaoVista: 0,
        comando: { tipo: 'ACAO', acao: 'ABRIR_REG016' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resAtForbidden.status).toBe(403);
    const bodyForbidden = await resAtForbidden.json();
    expect(bodyForbidden.details?.codigo).toBe('perfil');
    expect(isRuleErrorMessage(bodyForbidden.message)).toBe(true);

    // ADM executa A01 -> AT_RECEBER (BRANCA, versão 1)
    mockState.auth = { sub: 'u-adm', perfil: 'adm' as any, email: 'adm@linkmed.com' };
    const resOk = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: '203101',
        versaoVista: 0,
        comando: { tipo: 'ACAO', acao: 'ABRIR_REG016' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resOk.status).toBe(200);
    const bodyOk = await resOk.json();
    expect(bodyOk.estado.no).toBe('AT_RECEBER');
    expect(bodyOk.estado.etiqueta).toBe('BRANCA');
    expect(bodyOk.estado.versao).toBe(1);

    // Segundo usuário tentando agir com versaoVista: 0 recebe HTTP 409 (R10) + codigo 'versao'
    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    const resStale = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: '203101',
        versaoVista: 0,
        comando: { tipo: 'ACAO', acao: 'RECEBER_OS' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resStale.status).toBe(409);
    const bodyStale = await resStale.json();
    expect(bodyStale.details?.codigo).toBe('versao');
    expect(bodyStale.details?.versaoAtual).toBe(1);
    expect(isRuleErrorMessage(bodyStale.message)).toBe(true);
  });

  it('POST /api/os-flow/notificacoes/confirmar registra ciência SEM avançar o nó (D5 / R08)', async () => {
    await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: '203101',
        versaoVista: 0,
        comando: { tipo: 'ACAO', acao: 'ABRIR_REG016' },
      }),
      { params: Promise.resolve({}) },
    );
    const notif = mockState.carregada.notificacoes[0];
    expect(notif).toBeDefined();
    expect(mockState.carregada.estado.no).toBe('AT_RECEBER');

    // AT confirma ciência -> mantém exatamente no nó AT_RECEBER e versão 1
    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    const resConfirm = await confirmarNotifPost(
      makeJsonReq('http://localhost/api/os-flow/notificacoes/confirmar', 'POST', {
        notificacaoId: notif.id,
        numeroOs: '203101',
      }),
      { params: Promise.resolve({}) },
    );
    expect(resConfirm.status).toBe(200);
    expect(notif.confirmadaEm).toBeTruthy();
    expect(mockState.carregada.estado.no).toBe('AT_RECEBER');
    expect(mockState.carregada.estado.versao).toBe(1);
  });

  it('REG-016 (etapas-manutencao) salva sem erro das 11 perguntas do vídeo, REG-022 bloqueia duplicada (R07), e PATCH registra historico_edicoes', async () => {
    mockState.records = [];
    mockState.carregada = null;

    // 1. Cria REG-022 pelo ADM com todos os campos obrigatórios de recebimento
    const dadosReg022Base = {
      numero_os: 'OS-203101',
      cliente: 'Hosp Link',
      equipamento: 'Monitor',
      marca: 'Cardios',
      modelo: 'M1',
      numero_serie: 'SN203',
      embalagem_adequada: 'C',
      sem_danos_externos: 'C',
      cabos_integros: 'C',
      tela_sem_trincas: 'C',
      pecas_soltas_ausentes: 'C',
      sinais_violacao: 'C',
      limpeza_sujidade: 'C',
      responsavel_liberacao: 'Fernanda ADM',
      data_liberacao: '2026-11-18',
      elaborado_por: 'Fernanda ADM',
      revisado_por: 'Vanessa Ribeiro',
      aprovado_por: 'Pedro Costa',
    };
    const res22 = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'inspecao-recebimento',
        dados: dadosReg022Base,
      }),
      { params: Promise.resolve({}) },
    );
    expect(res22.status).toBe(200);
    expect(mockState.carregada.estado.no).toBe('AGUARDA_REG016');

    // 2. Regra R07: OS duplicada com espaços/minúsculas deve ser rejeitada
    const resDup = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'inspecao-recebimento',
        dados: { ...dadosReg022Base, numero_os: ' os-203101 ' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resDup.status).toBe(422);

    // 3. AT/ADM abre REG-016 preenchido parcialmente (só identificação e observações): zero erros 422!
    expect(
      validarDados(getFormDef('etapas-manutencao')!, null, {
        cliente: 'Hosp Link',
        data_abertura: '2026-11-18',
        numero_os: 'OS-203101',
        equipamento: 'Monitor',
      }),
    ).toEqual({});

    const res16 = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'etapas-manutencao',
        dados: {
          cliente: 'Hosp Link',
          data_abertura: '2026-11-18',
          numero_os: 'OS-203101',
          equipamento: 'Monitor',
          observacoes_analise: 'Triagem inicial limpa',
        },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res16.status).toBe(200);
    const body16 = await res16.json();
    // ADM salvando REG-016 em AGUARDA_REG016 avança A01 -> AT_RECEBER
    expect(mockState.carregada.estado.no).toBe('AT_RECEBER');

    // 4. PATCH /api/forms registra diff no historicoEdicoes (Seção 7)
    const resPatch = await formsPatch(
      makeJsonReq('http://localhost/api/forms', 'PATCH', {
        id: body16.record.id,
        dados: {
          ...body16.record.dados,
          observacoes_analise: 'Triagem inicial revisada pelo ADM',
        },
        motivo: 'Ajuste de observação',
      }),
      { params: Promise.resolve({}) },
    );
    expect(resPatch.status).toBe(200);
    const patched = await resPatch.json();
    expect(patched.record.historicoEdicoes).toHaveLength(1);
    expect(patched.record.historicoEdicoes[0].alteracoes[0].campo).toBe('observacoes_analise');

    // 5. AT recebe a OS (A02 -> AT_REG034) e salva REG-034 via POST /api/forms -> aciona A03 REG034_SALVO -> AT_HIGIENIZAR
    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    const resReceber = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: 'OS-203101',
        versaoVista: mockState.carregada.estado.versao,
        comando: { tipo: 'ACAO', acao: 'RECEBER_OS' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resReceber.status).toBe(200);
    expect(mockState.carregada.estado.no).toBe('AT_REG034');

    const res34 = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'limpeza-equipamento',
        dados: {
          data: '2026-11-18',
          cliente: 'Hosp Link',
          numero_os: 'OS-203101',
          equipamento: 'Monitor',
          inspecao_visual: 'C',
          produto_alcool_70: 'C',
          limpeza_realizada: 'C',
          assinatura_tecnico: 'Carlos AT',
          elaborado_por: 'Carlos AT',
          revisado_por: 'Vanessa',
          aprovado_por: 'Pedro',
        },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res34.status).toBe(200);
    expect(mockState.carregada.estado.no).toBe('AT_HIGIENIZAR');

    // 6. Outro usuário tentando CORRIGIR ação alheia recebe recusa ('correcao'); dono do login consegue corrigir
    mockState.auth = { sub: 'u-adm', perfil: 'adm' as any, email: 'adm@linkmed.com' };
    const resCorrigirOutro = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: 'OS-203101',
        versaoVista: mockState.carregada.estado.versao,
        comando: { tipo: 'CORRIGIR', motivo: 'Tentativa outro usuário' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resCorrigirOutro.status).toBe(422);
    const bodyCorrigirOutro = await resCorrigirOutro.json();
    expect(bodyCorrigirOutro.details?.codigo).toBe('correcao');

    // ADM estorna para AT_RECEBER e anula eventos posteriores preservando append-only (R09)
    const resEstornar = await comandosPost(
      makeJsonReq('http://localhost/api/os-flow/comandos', 'POST', {
        numeroOs: 'OS-203101',
        versaoVista: mockState.carregada.estado.versao,
        comando: { tipo: 'ESTORNAR', paraNo: 'AT_RECEBER', motivo: 'Retorno administrativo' },
      }),
      { params: Promise.resolve({}) },
    );
    expect(resEstornar.status).toBe(200);
    const bodyEst = await resEstornar.json();
    expect(bodyEst.estado.no).toBe('AT_RECEBER');
    expect(bodyEst.estado.anuladosIds.length).toBeGreaterThanOrEqual(2);
  });

  it('D8 no servidor: checklist-manutencao (REG-035/REG-009) liberado antes da VERDE e bloqueado em VERMELHA', async () => {
    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    // Envia OS para EM_ANALISE (CINZA -> ainda não VERDE)
    mockState.carregada.estado = {
      ...mockState.carregada.estado,
      no: 'EM_ANALISE',
      etiqueta: 'VIOLETA',
      item5Bloqueado: false,
    };

    const reg035Def = getFormDef('checklist-manutencao')!;
    const dados35: Record<string, unknown> = {
      equipamento: 'Incubadora',
      modelo: 'RN-2000',
      numero_serie: 'SN1',
      numero_os: '203101',
      data_entrada: '2026-11-18',
      tecnico: 'Carlos',
      elaborado_por: 'Carlos',
      revisado_por: 'Vanessa',
      aprovado_por: 'Pedro',
    };
    for (const c of getCampos(reg035Def, 'olidef')) {
      if (c.type === 'cnc') dados35[c.name] = 'C';
      else if (c.required && !dados35[c.name]) {
        dados35[c.name] = c.type === 'date' ? '2026-11-18' : c.options?.[0]?.value ?? 'Conforme';
      }
    }

    const resLiberado = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'checklist-manutencao',
        subtipo: 'olidef',
        dados: dados35,
      }),
      { params: Promise.resolve({}) },
    );
    expect(resLiberado.status).toBe(200);

    // Se a OS tiver item5Bloqueado = true (VERMELHA), deve bloquear
    mockState.carregada.estado.item5Bloqueado = true;
    const resBloq = await formsPost(
      makeJsonReq('http://localhost/api/forms', 'POST', {
        tipo: 'checklist-manutencao',
        subtipo: 'olidef',
        dados: dados35,
      }),
      { params: Promise.resolve({}) },
    );
    expect(resBloq.status).toBe(422);
    const bodyBloq = await resBloq.json();
    expect(bodyBloq.message).toContain('VERMELHA');
  });

  it('API /api/feriados gerencia feriados nacionais e Recife/PE e rejeita perfil sem permissão (AT -> 403)', async () => {
    const getRes = await feriadosGet(
      new NextRequest('http://localhost/api/feriados'),
      { params: Promise.resolve({}) },
    );
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.feriados).toHaveLength(1);
    expect(FERIADOS_DATAS_PADRAO).toContain('2026-07-16');

    mockState.auth = { sub: 'u-at', perfil: 'tecnico' as any, email: 'at@linkmed.com' };
    const atPost = await feriadosPost(
      makeJsonReq('http://localhost/api/feriados', 'POST', {
        data: '2026-12-31',
        descricao: 'Recesso',
      }),
      { params: Promise.resolve({}) },
    );
    expect(atPost.status).toBe(403);

    mockState.auth = { sub: 'u-adm', perfil: 'adm' as any, email: 'adm@linkmed.com' };
    const admPost = await feriadosPost(
      makeJsonReq('http://localhost/api/feriados', 'POST', {
        data: '2026-12-31',
        descricao: 'Recesso Técnico',
        escopo: 'personalizado',
      }),
      { params: Promise.resolve({}) },
    );
    expect(admPost.status).toBe(200);
    const admDel = await feriadosDelete(
      new NextRequest('http://localhost/api/feriados?data=2026-12-31', { method: 'DELETE' }),
      { params: Promise.resolve({}) },
    );
    expect(admDel.status).toBe(200);
  });

  it('Lembrete 7 dias (R05), adaptação de OS legada e pop-up "Entendi" (RuleNotice) cobrem todas as recusas v4', () => {
    // 1. Lembrete 7 dias
    const estadoAtivo = estadoDe([]);
    const entrega = new Date('2026-11-01T12:00:00Z');
    expect(lembreteDevido(entrega, false, estadoAtivo, new Date('2026-11-09T12:00:00Z'))).toBe(true);
    expect(lembreteDevido(entrega, true, estadoAtivo, new Date('2026-11-09T12:00:00Z'))).toBe(false);

    // 2. Migração legada automática (OS em análise sem perda de histórico)
    const eventosMigrados = converterEstadoLegadoParaEventosV4({
      id: 'leg-1',
      numeroOs: '203101',
      numeroOsNormalizado: '203101',
      identificacao: {
        cliente: 'Hosp',
        equipamento: 'Monitor',
        marca: 'Cardios',
        modelo: 'M',
        numeroSerie: 'SN',
      },
      etiquetaAtual: 'VIOLET',
      etiquetaAnteriorStandByPecas: null,
      estadoGeral: 'em_andamento',
      setorPendente: 'AT',
      passoAtual: 'A5_VIOLETA_HIGIENIZADO',
      ramificacao: null,
      trataSeGarantia: null,
      trataSeEnvioFabrica: null,
      tipoTransporteFabrica: null,
      equipamentoEnviadoFabrica: null,
      justificativaNaoEnviado: null,
      orcamentoAprovado: null,
      statusPecasAlmoxarifado: null,
      reg022Preenchido: true,
      reg034Preenchido: true,
      reg016Iniciado: true,
      item5Liberado: true,
      item5Preenchido: false,
      item5FormularioTipo: 'REG-009',
      etiquetaIdentificacaoLiberada: false,
      mensagemTelaAtual: 'Higienizado',
      perguntaPendenteAtual: null,
      criadaPorId: 'u-adm',
      criadaPorNome: 'ADM',
      criadaEm: new Date('2026-11-18T12:00:00Z'),
      atualizadaEm: new Date('2026-11-18T12:10:00Z'),
      estadoAntesCancelamento: null,
      historico: [],
      notificacoes: [],
      versao: 4,
    });
    expect(estadoDe(eventosMigrados).no).toBe('EM_ANALISE');
    expect(estadoDe(eventosMigrados).etiqueta).toBe('VIOLETA');

    // 3. Cobertura 100% do pop-up centralizado "Entendi" para todas as recusas v4
    const mensagensRecusaV4 = [
      'A OS mudou desde que você abriu. Recarregue a tela. (versao)',
      'Acesso permitido de segunda a sexta, das 07:30 às 19:30. (horario)',
      'Esta ação é do perfil ADM. (perfil)',
      'Só o ADM estorna. (perfil)',
      'Ação MARCAR_HIGIENIZADO não é permitida no nó AT_RECEBER. (transicao)',
      'Preencha: transporte. (campo)',
      'Salve o REG 034 antes de avançar. (reg)',
      'Preencha o item 5 do REG 016 antes de finalizar. (item5)',
      'Só o dono do login corrige, e só antes de outra pessoa agir. Peça um estorno ao ADM. (correcao)',
      'A OS nunca passou por esse nó. (estorno)',
      'Informe o motivo. (motivo)',
      'OS cancelada. Reabra para continuar. (estado)',
    ];

    let capturedTitle = '';
    const unsub = subscribeRuleNotices((q) => {
      capturedTitle = q[0]?.title ?? '';
    });

    for (const msg of mensagensRecusaV4) {
      expect(isRuleErrorMessage(msg)).toBe(true);
      showRuleNotice(msg);
      expect(capturedTitle.length).toBeGreaterThan(3);
      dismissCurrentRuleNotice();
    }
    unsub();

    // 4. D7 retorno da fábrica (MARROM -> FIM_VERDE sem Item 5) e recusa de orçamento sem item 5
    const evBase = converterEstadoLegadoParaEventosV4({
      id: 'leg-b5',
      numeroOs: 'OS-B5',
      numeroOsNormalizado: 'os-b5',
      identificacao: {
        cliente: 'C',
        equipamento: 'E',
        marca: 'Cardios',
        modelo: 'M',
        numeroSerie: 'S',
      },
      etiquetaAtual: 'BROWN',
      etiquetaAnteriorStandByPecas: null,
      estadoGeral: 'stand_by',
      setorPendente: 'AT',
      passoAtual: 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA',
      ramificacao: 2,
      trataSeGarantia: false,
      trataSeEnvioFabrica: true,
      tipoTransporteFabrica: 'correios',
      equipamentoEnviadoFabrica: true,
      justificativaNaoEnviado: null,
      orcamentoAprovado: null,
      statusPecasAlmoxarifado: null,
      reg022Preenchido: true,
      reg034Preenchido: true,
      reg016Iniciado: true,
      item5Liberado: true,
      item5Preenchido: false,
      item5FormularioTipo: 'REG-009',
      etiquetaIdentificacaoLiberada: true,
      mensagemTelaAtual: '',
      perguntaPendenteAtual: null,
      criadaPorId: 'u-adm',
      criadaPorNome: 'ADM',
      criadaEm: new Date('2026-11-18T12:00:00Z'),
      atualizadaEm: new Date('2026-11-18T12:10:00Z'),
      estadoAntesCancelamento: null,
      historico: [],
      notificacoes: [],
      versao: 7,
    });
    const evFinalFabrica = decidir(
      evBase,
      { tipo: 'ACAO', acao: 'FINALIZAR_RETORNO_FABRICA' },
      { id: 'u-at', perfil: 'AT' },
      {
        agora: new Date('2026-11-18T14:00:00Z'),
        item5Preenchido: false,
        versaoVista: evBase.length,
        enforceJanelaHorario: true,
      },
    );
    expect(evFinalFabrica[0]?.para).toBe('FIM_VERDE');
  });
});
