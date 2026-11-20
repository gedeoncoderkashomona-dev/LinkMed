import { describe, expect, it } from 'vitest';

import {
  FLUXO,
  Recusado,
  decidir,
  entregarEm,
  estadoDe,
  lembreteDevido,
  normalizarNumero,
  notificacoesDe,
  type Comando,
  type Contexto,
  type Evento,
  type Usuario,
} from '@/core/domain/os-v4/nucleo';
import { FERIADOS_DATAS_PADRAO } from '@/core/domain/os-v4/feriados';

const ana: Usuario = { id: 'ana', perfil: 'AT', nome: 'Ana (AT)' };
const bruno: Usuario = { id: 'bruno', perfil: 'AT', nome: 'Bruno (AT)' };
const carla: Usuario = { id: 'carla', perfil: 'ADM', nome: 'Carla (ADM)' };
const davi: Usuario = { id: 'davi', perfil: 'ALMOXARIFADO', nome: 'Davi (Almox)' };
const QUARTA_10H = new Date('2026-11-18T10:00:00-03:00');

class OS {
  eventos: Evento[] = [];
  avisos: { para: string; msg: string; criadaEm: string; entregarEm: string }[] = [];
  numero: string;
  constructor(numero = '1001') {
    this.numero = numero;
  }
  get s() {
    return estadoDe(this.eventos);
  }
  agir(u: Usuario, cmd: Comando, extra: Partial<Contexto> = {}) {
    const ctx: Contexto = {
      agora: QUARTA_10H,
      versaoVista: this.eventos.length,
      enforceJanelaHorario: true,
      ...extra,
    };
    for (const e of decidir(this.eventos, cmd, u, ctx)) {
      const ev = { ...e, id: `e${this.eventos.length + 1}` } as Evento;
      this.avisos.push(...notificacoesDe(ev, this.numero, this.eventos, extra.feriados));
      this.eventos.push(ev);
    }
    return this;
  }
  acao(
    u: Usuario,
    acao: string,
    valor?: boolean,
    campos?: Record<string, string>,
    extra: Partial<Contexto> = {},
  ) {
    return this.agir(u, { tipo: 'ACAO', acao, valor, campos }, extra);
  }
  ultimoAviso() {
    return this.avisos.at(-1);
  }
}

function recusa(fn: () => unknown, codigo: string) {
  expect(() => fn()).toThrowError(Recusado);
  try {
    fn();
  } catch (e) {
    expect((e as Recusado).codigo).toBe(codigo);
  }
}

/** Parte comum: do REG 022 até a pergunta de garantia (CINZA). */
function parteComum() {
  const os = new OS();
  expect(os.s.no).toBe('AGUARDA_REG016');
  expect(os.s.setor).toBe('ADM');
  expect(os.s.etiqueta).toBeNull();

  os.acao(carla, 'ABRIR_REG016');
  expect(os.s.etiqueta).toBe('BRANCA');
  expect(os.s.setor).toBe('AT');
  expect(os.ultimoAviso()).toEqual({
    para: 'AT',
    msg: 'Nova OS 1001 no REG 016 com status aguardando análise',
    criadaEm: QUARTA_10H.toISOString(),
    entregarEm: QUARTA_10H.toISOString(),
  });

  os.acao(ana, 'RECEBER_OS');
  recusa(() => os.acao(ana, 'REG034_SALVO'), 'reg');
  os.acao(ana, 'REG034_SALVO', undefined, undefined, { reg034Salvo: true });
  os.acao(ana, 'MARCAR_HIGIENIZADO');
  expect(os.s.etiqueta).toBe('VIOLETA');

  os.acao(ana, 'ANALISE_COMPLETA');
  expect(os.s.no).toBe('PERG_GARANTIA');
  expect(os.s.etiqueta).toBe('CINZA');
  return os;
}

/** Bloco P até VERDE, a partir de P_TRIAGEM. */
function blocoP(os: OS, faltaPeca = false) {
  if (faltaPeca) {
    os.acao(davi, 'AGUARDANDO_PECAS');
    expect(os.s.etiqueta).toBe('PRETA');
    expect(os.s.estadoGeral).toBe('stand_by');
    recusa(() => os.acao(ana, 'PECAS_RECEBIDAS'), 'transicao'); // AT não avança a OS em stand-by
  }
  os.acao(davi, 'PECAS_DISPONIVEIS');
  expect(os.s.setor).toBe('AT');
  expect(os.ultimoAviso()!.msg).toBe(
    'Peças disponíveis para a OS 1001. Confirme o recebimento na OS',
  );
  os.acao(ana, 'PECAS_RECEBIDAS');
  recusa(() => os.acao(ana, 'SERVICO_FINALIZADO'), 'item5');
  os.acao(ana, 'SERVICO_FINALIZADO', undefined, undefined, { item5Preenchido: true });
  expect(os.s.etiqueta).toBe('VERDE');
  expect(os.s.estadoGeral).toBe('finalizada');
}

describe('Especificação v4 — Cenários Oficiais (C1 a C11)', () => {
  it('C1 garantia com peças disponíveis', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', true);
    expect(os.s.etiqueta).toBe('LARANJA');
    expect(os.s.setor).toBe('ALMOXARIFADO');
    expect(os.ultimoAviso()!.msg).toBe(
      'A OS de nº 1001 está em garantia, siga para a separação das peças!',
    );
    blocoP(os);
    expect(os.s.etiquetasEfetivas).toEqual(['BRANCA', 'VIOLETA', 'CINZA', 'LARANJA', 'VERDE']);
    expect(os.s.item5Bloqueado).toBe(false);
  });

  it('C2 garantia com peça em falta: PRETA e volta para LARANJA sem marcação manual', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', true);
    os.acao(davi, 'AGUARDANDO_PECAS');
    os.acao(davi, 'PECAS_DISPONIVEIS');
    expect(os.s.etiqueta).toBe('LARANJA');
    os.acao(ana, 'PECAS_RECEBIDAS');
    os.acao(ana, 'SERVICO_FINALIZADO', undefined, undefined, { item5Preenchido: true });
    expect(os.s.etiquetasEfetivas).toEqual([
      'BRANCA',
      'VIOLETA',
      'CINZA',
      'LARANJA',
      'PRETA',
      'LARANJA',
      'VERDE',
    ]);
  });

  it('C3 ramificação 3, orçamento aprovado (ADM notificado automaticamente)', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false);
    expect(os.s.no).toBe('PERG_ENVIO');
    os.acao(ana, 'RESPONDER_ENVIO', false);
    expect(os.s.setor).toBe('ADM');
    expect(os.s.etiqueta).toBe('CINZA');
    expect(os.ultimoAviso()!.msg).toBe(
      'OS 1001 teve a análise concluída, prossiga para o orçamento',
    );
    os.acao(carla, 'AGUARDAR_APROVACAO');
    expect(os.s.etiqueta).toBe('AMARELA');
    os.acao(carla, 'RESPONDER_ORCAMENTO', true);
    expect(os.s.etiqueta).toBe('AZUL');
    expect(os.ultimoAviso()!.msg).toBe(
      'A OS de nº 1001 teve o orçamento aprovado! Siga para a separação das peças',
    );
    blocoP(os, true);
    expect(os.s.etiquetasEfetivas).toEqual([
      'BRANCA',
      'VIOLETA',
      'CINZA',
      'AMARELA',
      'AZUL',
      'PRETA',
      'AZUL',
      'VERDE',
    ]);
  });

  it('C4 ramificação 3, orçamento reprovado: VERMELHA só com CIENTE_REPROVACAO da AT', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false)
      .acao(ana, 'RESPONDER_ENVIO', false)
      .acao(carla, 'AGUARDAR_APROVACAO')
      .acao(carla, 'RESPONDER_ORCAMENTO', false);
    expect(os.s.etiqueta).toBe('AMARELA');
    expect(os.s.setor).toBe('AT');
    expect(os.ultimoAviso()!.msg).toBe('A OS de nº 1001 teve o orçamento reprovado!');
    os.acao(ana, 'CIENTE_REPROVACAO');
    expect(os.s.etiqueta).toBe('VERMELHA');
    expect(os.s.estadoGeral).toBe('finalizada');
    expect(os.s.item5Bloqueado).toBe(true);
  });

  it('C5 envio à fábrica, enviado: MARROM, sem orçamento, VERDE sem item 5', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false);
    recusa(() => os.acao(ana, 'RESPONDER_ENVIO', true), 'campo');
    recusa(
      () => os.acao(ana, 'RESPONDER_ENVIO', true, { transporte: 'MOTOBOY' }),
      'campo',
    );
    os.acao(ana, 'RESPONDER_ENVIO', true, { transporte: 'CORREIOS' });
    expect(os.s.estadoGeral).toBe('stand_by');
    expect(os.s.etiqueta).toBe('CINZA');

    os.acao(ana, 'RESPONDER_ENVIADO', true);
    expect(os.s.etiqueta).toBe('MARROM');
    expect(os.s.estadoGeral).toBe('stand_by');
    expect(os.ultimoAviso()!.para).toBe('ADM');

    recusa(() => os.acao(carla, 'AGUARDAR_APROVACAO'), 'transicao');
    os.acao(ana, 'FINALIZAR_RETORNO_FABRICA'); // sem item 5 (D8)
    expect(os.s.etiqueta).toBe('VERDE');
    expect(os.s.item5Bloqueado).toBe(false);
  });

  it('C6 envio não realizado, AT escolhe VERMELHA (sem notificação e bloqueia item 5)', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false).acao(ana, 'RESPONDER_ENVIO', true, {
      transporte: 'TRANSPORTADORA_LINKMED',
    });
    const avisos = os.avisos.length;
    recusa(() => os.acao(ana, 'RESPONDER_ENVIADO', false, { final: 'VERMELHA' }), 'campo');
    os.acao(ana, 'RESPONDER_ENVIADO', false, {
      final: 'VERMELHA',
      justificativa: 'Cliente desistiu do envio',
    });
    expect(os.s.etiqueta).toBe('VERMELHA');
    expect(os.s.item5Bloqueado).toBe(true);
    expect(os.avisos.length).toBe(avisos);
  });

  it('C7 envio não realizado, AT escolhe VERDE: item 5 obrigatório', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false).acao(ana, 'RESPONDER_ENVIO', true, {
      transporte: 'TRANSPORTADORA_CLIENTE',
    });
    const c = { final: 'VERDE', justificativa: 'Reparo resolvido na bancada' };
    recusa(() => os.acao(ana, 'RESPONDER_ENVIADO', false, c), 'item5');
    os.acao(ana, 'RESPONDER_ENVIADO', false, c, { item5Preenchido: true });
    expect(os.s.etiqueta).toBe('VERDE');
  });

  it('C8 correção: só o dono do login, só antes de outra pessoa agir', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', true);
    recusa(() => os.agir(bruno, { tipo: 'CORRIGIR', motivo: 'engano' }), 'correcao');
    os.agir(ana, { tipo: 'CORRIGIR', motivo: 'Não era garantia' });
    expect(os.s.no).toBe('PERG_GARANTIA');
    expect(os.s.etiqueta).toBe('CINZA');
    expect(os.s.etiquetasEfetivas).not.toContain('LARANJA');

    os.acao(ana, 'RESPONDER_GARANTIA', true).acao(davi, 'AGUARDANDO_PECAS');
    recusa(() => os.agir(ana, { tipo: 'CORRIGIR', motivo: 'engano' }), 'correcao');
    expect(os.eventos.length).toBe(9);
  });

  it('C9 estorno pelo ADM: desfaz VERMELHA, mantém histórico intacto e libera item 5', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false)
      .acao(ana, 'RESPONDER_ENVIO', false)
      .acao(carla, 'AGUARDAR_APROVACAO')
      .acao(carla, 'RESPONDER_ORCAMENTO', false)
      .acao(ana, 'CIENTE_REPROVACAO');
    expect(os.s.item5Bloqueado).toBe(true);

    recusa(
      () => os.agir(ana, { tipo: 'ESTORNAR', paraNo: 'O_APROVACAO', motivo: 'x' }),
      'perfil',
    );
    recusa(
      () => os.agir(carla, { tipo: 'ESTORNAR', paraNo: 'O_APROVACAO', motivo: ' ' }),
      'motivo',
    );
    recusa(
      () => os.agir(carla, { tipo: 'ESTORNAR', paraNo: 'P_TRIAGEM', motivo: 'x' }),
      'estorno',
    );

    os.agir(carla, {
      tipo: 'ESTORNAR',
      paraNo: 'O_APROVACAO',
      motivo: 'Cliente aprovou por telefone; resposta registrada errado',
    });
    expect(os.s.no).toBe('O_APROVACAO');
    expect(os.s.etiqueta).toBe('AMARELA');
    expect(os.s.setor).toBe('ADM');
    expect(os.s.item5Bloqueado).toBe(false);
    expect(os.ultimoAviso()!.para).toBe('ADM');

    os.acao(carla, 'RESPONDER_ORCAMENTO', true);
    expect(os.s.etiqueta).toBe('AZUL');
  });

  it('C10 regras gerais: perfil, horário/feriado Recife, versão otimista, cancelar/reabrir, lembrete 7d e nº normalizado', () => {
    const os = parteComum();
    os.acao(ana, 'RESPONDER_GARANTIA', false).acao(ana, 'RESPONDER_ENVIO', false);
    recusa(() => os.acao(ana, 'AGUARDAR_APROVACAO'), 'perfil');

    // Horário: sábado e 20:00 bloqueados quando enforceJanelaHorario = true
    recusa(
      () =>
        os.acao(carla, 'AGUARDAR_APROVACAO', undefined, undefined, {
          agora: new Date('2026-11-21T10:00:00-03:00'),
        }),
      'horario',
    );
    recusa(
      () =>
        os.acao(carla, 'AGUARDAR_APROVACAO', undefined, undefined, {
          agora: new Date('2026-11-18T20:00:00-03:00'),
        }),
      'horario',
    );
    // Feriado padrão de Recife (ex.: São João 24/06/2026) bloqueado na janela
    recusa(
      () =>
        os.acao(carla, 'AGUARDAR_APROVACAO', undefined, undefined, {
          agora: new Date('2026-06-24T10:00:00-03:00'),
          feriados: FERIADOS_DATAS_PADRAO,
        }),
      'horario',
    );

    // Versão desatualizada (concorrência R10)
    recusa(
      () => os.agir(carla, { tipo: 'ACAO', acao: 'AGUARDAR_APROVACAO' }, { versaoVista: 3 }),
      'versao',
    );

    // Cancelar e reabrir volta para AMARELA com ADM pendente
    os.acao(carla, 'AGUARDAR_APROVACAO');
    recusa(() => os.agir(davi, { tipo: 'CANCELAR', motivo: 'x' }), 'perfil');
    os.agir(ana, { tipo: 'CANCELAR', motivo: 'Cliente retirou o equipamento' });
    expect(os.s.estadoGeral).toBe('cancelada');
    expect(os.s.setor).toBeNull();
    expect(
      lembreteDevido(new Date('2026-11-01T10:00:00-03:00'), false, os.s, QUARTA_10H),
    ).toBe(false);
    recusa(() => os.acao(carla, 'RESPONDER_ORCAMENTO', true), 'estado');

    os.agir(carla, { tipo: 'REABRIR', motivo: 'Cliente voltou' });
    expect(os.s.etiqueta).toBe('AMARELA');
    expect(os.s.setor).toBe('ADM');

    // Lembrete de 7 dias corridos
    expect(
      lembreteDevido(new Date('2026-11-11T10:00:00-03:00'), false, os.s, QUARTA_10H),
    ).toBe(true);
    expect(
      lembreteDevido(new Date('2026-11-12T10:00:00-03:00'), false, os.s, QUARTA_10H),
    ).toBe(false);
    expect(
      lembreteDevido(new Date('2026-11-11T10:00:00-03:00'), true, os.s, QUARTA_10H),
    ).toBe(false);

    // Notificação sexta 20h -> segunda 07:30; com feriado na segunda -> terça 07:30
    const sexta20h = new Date('2026-11-20T20:00:00-03:00');
    expect(entregarEm(sexta20h).toISOString()).toBe(
      new Date('2026-11-23T07:30:00-03:00').toISOString(),
    );
    expect(entregarEm(sexta20h, ['2026-11-23']).toISOString()).toBe(
      new Date('2026-11-24T07:30:00-03:00').toISOString(),
    );
    expect(entregarEm(new Date('2026-11-18T06:00:00-03:00')).toISOString()).toBe(
      new Date('2026-11-18T07:30:00-03:00').toISOString(),
    );

    expect(normalizarNumero('  OS-1001 ')).toBe(normalizarNumero('os-1001'));
  });

  it('C11 integridade do fluxo: todo nó não final tem saída e todo destino existe', () => {
    for (const [no, def] of Object.entries(FLUXO.nos)) {
      if (def.estado === 'finalizada') continue;
      expect(
        FLUXO.acoes.some((a) => a.de === no),
        `nó ${no} sem saída`,
      ).toBe(true);
    }
    for (const a of FLUXO.acoes) {
      for (const p of a.para_escolhido ?? [a.para!]) {
        expect(FLUXO.nos[p], `${a.id} aponta para nó inexistente ${p}`).toBeDefined();
      }
    }
  });
});
