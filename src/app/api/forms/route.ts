import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, ValidationError } from '@/core/domain/errors';
import { agoraBR } from '@/core/domain/forms/alerts';
import {
  avaliarConformidade,
  getFormDef,
  sanitizarDados,
  validarDados,
  type FormDef,
  type FormTipo,
} from '@/core/domain/forms/definitions';
import {
  buildReg016DadosFromOsFluxo,
  copiarCamposItem5DeChecklist,
  normalizarMarcaParaItem5,
} from '@/core/domain/forms/os-reg016-sync';
import {
  normalizarNumeroOs,
  type OrdemServicoFluxoState,
} from '@/core/domain/forms/os-workflow';
import { perfilSistemaParaSetorV4 } from '@/core/domain/os-v4/nucleo';
import { getRepositories } from '@/infra/db';
import {
  carregarOsV4PorNumero,
  criarOsInicialV4,
  executarComandoOsV4,
  existeNumeroOsV4,
} from '@/infra/db/supabase/os-v4-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { mapRecusadoParaAppError } from '@/lib/http/os-v4-error';

export const runtime = 'nodejs';

const createSchema = z.object({
  tipo: z.string().min(1),
  subtipo: z.string().nullish(),
  dados: z.record(z.unknown()),
});

const patchSchema = z.object({
  id: z.string().min(1),
  subtipo: z.string().nullish(),
  dados: z.record(z.unknown()),
  motivo: z.string().nullish(),
});

function buildReg016PatchFromRelatedForm(params: {
  tipo: FormTipo;
  dados: Record<string, unknown>;
  subtipo: string | null;
  osFluxoAtual: OrdemServicoFluxoState | null;
  item5Bloqueado: boolean;
  reg016ExistenteDados: Record<string, unknown> | null;
  reg016ExistenteDataRef: string | null;
  reg016Def: FormDef;
}) {
  const {
    tipo,
    dados,
    subtipo,
    osFluxoAtual,
    item5Bloqueado,
    reg016ExistenteDados,
    reg016ExistenteDataRef,
    reg016Def,
  } = params;

  if (item5Bloqueado) return null;

  if (tipo === 'checklist-manutencao') {
    if (osFluxoAtual) {
      return buildReg016DadosFromOsFluxo({
        os: osFluxoAtual,
        dadosExistentes: reg016ExistenteDados,
        reg035Dados: dados,
        reg035Subtipo: subtipo,
      });
    }

    if (!reg016ExistenteDados || !reg016ExistenteDataRef) return null;
    const marcaFallback = normalizarMarcaParaItem5(String(reg016ExistenteDados.marca ?? ''));
    const copiados = copiarCamposItem5DeChecklist(dados, subtipo, marcaFallback);
    if (Object.keys(copiados).length === 0) return null;
    const dadosAtualizados = { ...reg016ExistenteDados, ...copiados };
    return {
      dados: dadosAtualizados,
      status: avaliarConformidade(reg016Def, null, dadosAtualizados),
      dataRef: reg016ExistenteDataRef,
    };
  }

  if (tipo === 'verificacao-calibracao' && reg016ExistenteDados && reg016ExistenteDataRef) {
    const dadosAtualizados = {
      ...reg016ExistenteDados,
      etiqueta_calibracao: 'C',
      item5_marca: reg016ExistenteDados.item5_marca || 'Cardios',
      __sync_atualizado_em: new Date().toISOString(),
    };
    return {
      dados: dadosAtualizados,
      status: avaliarConformidade(reg016Def, null, dadosAtualizados),
      dataRef: reg016ExistenteDataRef,
    };
  }

  return null;
}

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const tipo = req.nextUrl.searchParams.get('tipo');
  const { operacionalRepository } = getRepositories();

  if (!tipo) {
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const records = await operacionalRepository.listFormRecords({ limit: 300 });
    const contagens: Record<string, { total: number; naoConformes: number }> = {};
    for (const r of records) {
      if (r.dataRef < desde) continue;
      const atual = (contagens[r.tipo] ??= { total: 0, naoConformes: 0 });
      atual.total += 1;
      if (r.status === 'nao_conforme') atual.naoConformes += 1;
    }
    return { records, contagens };
  }

  const def = getFormDef(tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');

  const records = await operacionalRepository.listFormRecords({ tipo: def.tipo, limit: 150 });
  return { records };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = createSchema.parse(await req.json());

  const def = getFormDef(body.tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');
  if (!def.perfis.includes(auth.perfil)) throw new ForbiddenError();

  const subtipo = body.subtipo ?? null;
  const erros = validarDados(def, subtipo, body.dados);
  if (Object.keys(erros).length > 0) {
    throw new ValidationError('Preencha os campos obrigatórios.', erros);
  }

  const { operacionalRepository, auditService, userRepository } = getRepositories();
  let dados = sanitizarDados(def, subtipo, body.dados, auth.perfil);
  const dataRef = String(dados[def.campoData] ?? agoraBR().data);
  const numOsNorm = normalizarNumeroOs(String(dados.numero_os ?? ''));
  const reg016Def = getFormDef('etapas-manutencao')!;

  // Regra R07: Bloquear números de OS duplicados ao cadastrar REG-022
  if (def.tipo === 'inspecao-recebimento' && numOsNorm) {
    const dup = await existeNumeroOsV4(String(dados.numero_os ?? numOsNorm));
    if (dup.existe) {
      const osExibicao = dup.numeroExistente ?? String(dados.numero_os ?? numOsNorm);
      throw new ValidationError(
        `Já existe uma OS com este número (${osExibicao}). Acesse a OS existente em /equipamentos?os=${encodeURIComponent(osExibicao)}.`,
        {
          numero_os: `Já existe uma OS com este número (${osExibicao}). Não são permitidas OS duplicadas.`,
        },
      );
    }
  }

  const [osV4Inicial, reg022Existente, reg016Existente] = numOsNorm
    ? await Promise.all([
        carregarOsV4PorNumero(numOsNorm),
        def.tipo === 'inspecao-recebimento'
          ? Promise.resolve(null)
          : operacionalRepository.findLatestFormRecordByOs('inspecao-recebimento', numOsNorm),
        def.tipo === 'inspecao-recebimento'
          ? Promise.resolve(null)
          : operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', numOsNorm),
      ])
    : [null, null, null];

  // Regra POP-020 / v4: Pré-requisitos entre REG-022, REG-034, REG-016 e REG-009/REG-035
  if (numOsNorm) {
    const osExiste = Boolean(osV4Inicial || reg022Existente);
    if (def.tipo === 'limpeza-equipamento' && !osExiste) {
      throw new ValidationError(
        'Pré-requisito obrigatório (POP-020): toda OS deve começar no REG-022 (Inspeção de Recebimento), preenchido pelo ADM. Conclua o REG-022 antes de registrar a higienização.',
        { numero_os: 'Esta OS ainda não foi aberta no REG-022.' },
      );
    }
    if (def.tipo === 'etapas-manutencao' && !osExiste) {
      throw new ValidationError(
        'Pré-requisito obrigatório (POP-020): cadastre primeiro o REG-022 (Inspeção de Recebimento) pelo ADM antes de abrir o REG-016.',
        { numero_os: 'Esta OS ainda não foi aberta no REG-022.' },
      );
    }
    if (def.tipo === 'checklist-manutencao' && osV4Inicial?.estado.item5Bloqueado) {
      const msg =
        'Item 5 bloqueado definitivamente: esta OS passou por Etiqueta VERMELHA (orçamento não aprovado).';
      throw new ValidationError(msg, { numero_os: msg });
    }
  }

  // Preserva a marca definida no REG-022 quando técnico envia REG-016 ou REG-035
  if (
    auth.perfil === 'tecnico' &&
    (def.tipo === 'etapas-manutencao' || def.tipo === 'checklist-manutencao')
  ) {
    const marcaAdm =
      osV4Inicial?.meta.identificacao.marca?.trim() ||
      String(reg022Existente?.dados?.marca ?? '').trim();
    if (marcaAdm) {
      dados = { ...dados, marca: marcaAdm };
      if (def.tipo === 'etapas-manutencao' && dados.item5_marca) {
        const marcaNorm = normalizarMarcaParaItem5(marcaAdm);
        if (marcaNorm) dados.item5_marca = marcaNorm;
      }
    }
  }

  const usuarioAtual = await userRepository.findById(auth.sub).catch(() => null);
  const usuarioNome = usuarioAtual?.nomeCompleto ?? 'Colaborador Autorizado';
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent');
  const setorV4 = perfilSistemaParaSetorV4(auth.perfil);

  let record;
  let osFluxoAtualizado: OrdemServicoFluxoState | null = osV4Inicial?.fluxoState ?? null;

  if (def.tipo === 'etapas-manutencao' && numOsNorm) {
    if (dados.item5_marca && osV4Inicial?.estado.item5Bloqueado) {
      const msg =
        'Item 5 bloqueado: esta OS possui Etiqueta VERMELHA no histórico efetivo (orçamento não aprovado).';
      throw new ValidationError(msg, { item5_marca: msg });
    }

    const dadosCombinados = osFluxoAtualizado
      ? {
          ...buildReg016DadosFromOsFluxo({
            os: osFluxoAtualizado,
            dadosExistentes: { ...(reg016Existente?.dados ?? {}), ...dados },
            reg022Dados: reg022Existente?.dados ?? null,
          }).dados,
          ...dados,
          __sync_origem: 'form_reg016',
          __sync_atualizado_em: new Date().toISOString(),
        }
      : { ...(reg016Existente?.dados ?? {}), ...dados };

    record = await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
      subtipo,
      dados: dadosCombinados,
      status: avaliarConformidade(def, subtipo, dadosCombinados),
      dataRef,
      criadoPor: auth.sub,
      versaoSchema: 2,
    });

    // Se a OS está no nó inicial AGUARDA_REG016 e o ADM salvou o REG-016, executa A01 ABRIR_REG016 automaticamente
    if (osV4Inicial?.estado.no === 'AGUARDA_REG016' && setorV4 === 'ADM') {
      try {
        const avancada = await executarComandoOsV4({
          numeroOs: osV4Inicial.meta.numeroOs,
          comando: { tipo: 'ACAO', acao: 'ABRIR_REG016' },
          perfilSistema: auth.perfil,
          usuarioId: auth.sub,
          usuarioNome,
          versaoVista: osV4Inicial.estado.versao,
          ip,
          userAgent,
          reg022DadosFallback: reg022Existente?.dados ?? null,
        });
        osFluxoAtualizado = avancada.fluxoState;
      } catch (err) {
        if (err instanceof Error && err.name === 'Recusado') {
          mapRecusadoParaAppError(err, { versaoAtual: osV4Inicial.estado.versao });
        }
      }
    }
  } else {
    const status = avaliarConformidade(def, subtipo, dados);

    // No REG-022, cria a OS oficial v4 ANTES de gravar o form_record para garantir
    // atomicidade lógica (sem falso duplicado e sem registro órfão caso a criação seja recusada).
    if (numOsNorm && def.tipo === 'inspecao-recebimento') {
      try {
        const criada = await criarOsInicialV4({
          numeroOs: String(dados.numero_os ?? numOsNorm),
          identificacao: {
            cliente: String(dados.cliente ?? 'Cliente Hospitalar'),
            equipamento: String(dados.equipamento ?? 'Equipamento Médico'),
            marca: String(dados.marca ?? 'Cardios'),
            modelo: String(dados.modelo ?? 'Modelo Padrão'),
            numeroSerie: String(dados.numero_serie ?? 'S/N'),
            acessorios: String(dados.acessorios ?? ''),
            relatoCliente: String(dados.relato_cliente ?? ''),
          },
          usuarioId: auth.sub,
          usuarioNome,
          ip,
          userAgent,
        });
        osFluxoAtualizado = criada.fluxoState;
      } catch (err) {
        mapRecusadoParaAppError(err);
      }
    }

    record = await operacionalRepository.createFormRecord({
      tipo: def.tipo,
      subtipo,
      dados,
      status,
      dataRef,
      criadoPor: auth.sub,
      versaoSchema: 2,
    });

    if (numOsNorm && def.tipo === 'limpeza-equipamento' && osV4Inicial) {
      // Se a OS está exatamente em AT_REG034 e o técnico salvou o REG-034, executa A03 REG034_SALVO -> AT_HIGIENIZAR
      if (osV4Inicial.estado.no === 'AT_REG034' && setorV4 === 'AT') {
        try {
          const avancada = await executarComandoOsV4({
            numeroOs: osV4Inicial.meta.numeroOs,
            comando: { tipo: 'ACAO', acao: 'REG034_SALVO' },
            perfilSistema: auth.perfil,
            usuarioId: auth.sub,
            usuarioNome,
            versaoVista: osV4Inicial.estado.versao,
            ip,
            userAgent,
            reg022DadosFallback: reg022Existente?.dados ?? null,
          });
          osFluxoAtualizado = avancada.fluxoState;
        } catch (err) {
          if (err instanceof Error && err.name === 'Recusado') {
            mapRecusadoParaAppError(err, { versaoAtual: osV4Inicial.estado.versao });
          }
        }
      }
    } else if (
      numOsNorm &&
      (def.tipo === 'checklist-manutencao' || def.tipo === 'verificacao-calibracao')
    ) {
      const reg016Patch = buildReg016PatchFromRelatedForm({
        tipo: def.tipo,
        dados,
        subtipo,
        osFluxoAtual: osFluxoAtualizado,
        item5Bloqueado: Boolean(osV4Inicial?.estado.item5Bloqueado),
        reg016ExistenteDados: reg016Existente?.dados ?? null,
        reg016ExistenteDataRef: reg016Existente?.dataRef ?? null,
        reg016Def,
      });

      if (reg016Patch) {
        await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
          subtipo: null,
          ...reg016Patch,
          criadoPor: auth.sub,
          versaoSchema: 2,
        });
      }
      if (osV4Inicial) {
        const recarregada = await carregarOsV4PorNumero(numOsNorm);
        osFluxoAtualizado = recarregada?.fluxoState ?? osFluxoAtualizado;
      }
    }
  }

  await auditService
    .registrar(
      { usuarioId: auth.sub, ip, userAgent },
      'form.create',
      'FormRecord',
      record.id,
      null,
      { tipo: def.tipo, subtipo, status: record.status },
    )
    .catch(() => undefined);

  return { record, osFluxo: osFluxoAtualizado };
});

export const PATCH = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = patchSchema.parse(await req.json());

  const { operacionalRepository, auditService, userRepository } = getRepositories();
  const existente = await operacionalRepository.findFormRecordById?.(body.id);
  if (!existente) throw new NotFoundError('Registro de formulário não encontrado.');

  const def = getFormDef(existente.tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');
  if (!def.perfis.includes(auth.perfil)) throw new ForbiddenError();

  const subtipo = body.subtipo !== undefined ? body.subtipo : existente.subtipo;
  const erros = validarDados(def, subtipo, body.dados);
  if (Object.keys(erros).length > 0) {
    throw new ValidationError('Preencha os campos obrigatórios.', erros);
  }

  let dados = sanitizarDados(def, subtipo, body.dados, auth.perfil);
  const numOsNorm = normalizarNumeroOs(
    String(dados.numero_os ?? existente.dados?.numero_os ?? ''),
  );
  const osV4 = numOsNorm ? await carregarOsV4PorNumero(numOsNorm) : null;

  if (def.tipo === 'etapas-manutencao' && dados.item5_marca && osV4?.estado.item5Bloqueado) {
    const msg =
      'Item 5 bloqueado: esta OS possui Etiqueta VERMELHA no histórico efetivo (orçamento não aprovado).';
    throw new ValidationError(msg, { item5_marca: msg });
  }

  if (
    auth.perfil === 'tecnico' &&
    (def.tipo === 'etapas-manutencao' || def.tipo === 'checklist-manutencao') &&
    osV4?.meta.identificacao.marca
  ) {
    dados = { ...dados, marca: osV4.meta.identificacao.marca };
  }

  const usuarioAtual = await userRepository.findById(auth.sub).catch(() => null);
  const usuarioNome = usuarioAtual?.nomeCompleto ?? 'Colaborador';
  const dataRef = String(dados[def.campoData] ?? existente.dataRef);
  const status = avaliarConformidade(def, subtipo, dados);

  const atualizado = await operacionalRepository.updateFormRecordById?.(existente.id, {
    subtipo,
    dados,
    status,
    dataRef,
    alteradoPorId: auth.sub,
    alteradoPorNome: usuarioNome,
    motivo: body.motivo ?? 'Edição de registro',
    versaoSchema: 2,
  });

  if (!atualizado) {
    throw new NotFoundError('Falha ao atualizar o registro.');
  }

  await auditService
    .registrar(
      {
        usuarioId: auth.sub,
        ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
      },
      'form.update',
      'FormRecord',
      atualizado.id,
      { statusAnterior: existente.status },
      { tipo: def.tipo, status: atualizado.status, motivo: body.motivo ?? null },
    )
    .catch(() => undefined);

  const osRecarregada = numOsNorm ? await carregarOsV4PorNumero(numOsNorm) : null;
  return {
    record: atualizado,
    osFluxo: osRecarregada?.fluxoState ?? osV4?.fluxoState ?? null,
  };
});
