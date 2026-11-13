import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, ValidationError } from '@/core/domain/errors';
import {
  avaliarConformidade,
  getFormDef,
  sanitizarDados,
  validarDados,
  verificarBloqueioItem5Reg016,
  type FormDef,
  type FormTipo,
} from '@/core/domain/forms/definitions';
import { agoraBR } from '@/core/domain/forms/alerts';
import {
  buildReg016DadosFromOsFluxo,
  copiarCamposItem5DeChecklist,
  normalizarMarcaParaItem5,
} from '@/core/domain/forms/os-reg016-sync';
import { normalizarNumeroOs, type OrdemServicoFluxoState } from '@/core/domain/forms/os-workflow';
import { getRepositories } from '@/infra/db';
import { carregarOsFluxoPorNumero } from '@/infra/db/supabase/os-flow-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const createSchema = z.object({
  tipo: z.string().min(1),
  subtipo: z.string().nullish(),
  dados: z.record(z.unknown()),
});

function buildReg016PatchFromRelatedForm(params: {
  tipo: FormTipo;
  dados: Record<string, unknown>;
  subtipo: string | null;
  osFluxoAtual: OrdemServicoFluxoState | null;
  reg016ExistenteDados: Record<string, unknown> | null;
  reg016ExistenteDataRef: string | null;
  reg016Def: FormDef;
}) {
  const {
    tipo,
    dados,
    subtipo,
    osFluxoAtual,
    reg016ExistenteDados,
    reg016ExistenteDataRef,
    reg016Def,
  } = params;

  if (tipo === 'checklist-manutencao') {
    const bloqueio = verificarBloqueioItem5Reg016({
      etiquetaAtual: osFluxoAtual?.etiquetaAtual,
      orcamentoReprovado: reg016ExistenteDados?.orcamento_reprovado,
    });
    if (bloqueio.bloqueado) return null;

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

  const records = await operacionalRepository.listFormRecords({ tipo: def.tipo, limit: 100 });
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

  const { operacionalRepository, auditService } = getRepositories();

  // Regra Seção 7.4 (T11): Bloquear números de OS duplicados ao cadastrar o REG 022
  if (def.tipo === 'inspecao-recebimento') {
    const numOsNorm = normalizarNumeroOs(String(body.dados.numero_os ?? ''));
    if (numOsNorm) {
      const existentes = await operacionalRepository.listFormRecords({
        tipo: 'inspecao-recebimento',
        limit: 300,
      });
      const duplicado = existentes.find(
        (r) => normalizarNumeroOs(String(r.dados?.numero_os ?? '')) === numOsNorm,
      );
      if (duplicado) {
        const osExibicao = String(duplicado.dados?.numero_os ?? numOsNorm);
        throw new ValidationError(
          `Já existe uma OS com este número (${osExibicao}). Acesse a OS existente em /equipamentos?os=${encodeURIComponent(osExibicao)}.`,
          {
            numero_os: `Já existe uma OS com este número (${osExibicao}). Não são permitidas OS duplicadas.`,
          },
        );
      }
    }
  }

  const dados = sanitizarDados(def, subtipo, body.dados, auth.perfil);
  const status = avaliarConformidade(def, subtipo, dados);
  const dataRef = String(dados[def.campoData] ?? agoraBR().data);
  const numOsNorm = normalizarNumeroOs(String(dados.numero_os ?? ''));
  const reg016Def = getFormDef('etapas-manutencao')!;

  let record;

  if (def.tipo === 'etapas-manutencao' && numOsNorm) {
    const [osFluxoAtual, reg016Existente] = await Promise.all([
      carregarOsFluxoPorNumero(numOsNorm),
      operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', numOsNorm),
    ]);

    if (dados.item5_marca) {
      const bloqueio = verificarBloqueioItem5Reg016({
        etiquetaAtual: osFluxoAtual?.etiquetaAtual ?? String(body.dados.etiqueta_atual ?? ''),
        orcamentoReprovado:
          dados.orcamento_reprovado ?? reg016Existente?.dados?.orcamento_reprovado,
      });
      if (bloqueio.bloqueado && bloqueio.motivo) {
        throw new ValidationError(bloqueio.motivo, { item5_marca: bloqueio.motivo });
      }
    }

    const dadosCombinados = osFluxoAtual
      ? {
          ...buildReg016DadosFromOsFluxo({
            os: osFluxoAtual,
            dadosExistentes: { ...(reg016Existente?.dados ?? {}), ...dados },
          }).dados,
          ...dados,
          etiqueta_atual: osFluxoAtual.etiquetaAtual ?? 'WHITE',
          __sync_origem: 'form_reg016',
          __sync_passo: osFluxoAtual.passoAtual,
          __sync_atualizado_em: new Date().toISOString(),
        }
      : { ...(reg016Existente?.dados ?? {}), ...dados };

    record = await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
      subtipo,
      dados: dadosCombinados,
      status: avaliarConformidade(def, subtipo, dadosCombinados),
      dataRef,
      criadoPor: auth.sub,
    });
  } else {
    record = await operacionalRepository.createFormRecord({
      tipo: def.tipo,
      subtipo,
      dados,
      status,
      dataRef,
      criadoPor: auth.sub,
    });

    if (numOsNorm && (def.tipo === 'checklist-manutencao' || def.tipo === 'verificacao-calibracao')) {
      const [osFluxoAtual, reg016Existente] = await Promise.all([
        carregarOsFluxoPorNumero(numOsNorm),
        operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', numOsNorm),
      ]);

      const reg016Atualizacao = buildReg016PatchFromRelatedForm({
        tipo: def.tipo,
        dados,
        subtipo,
        osFluxoAtual,
        reg016ExistenteDados: reg016Existente?.dados ?? null,
        reg016ExistenteDataRef: reg016Existente?.dataRef ?? null,
        reg016Def,
      });

      if (reg016Atualizacao) {
        await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
          subtipo: null,
          ...reg016Atualizacao,
          criadoPor: auth.sub,
        });
      }
    }
  }

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'form.create',
    'FormRecord',
    record.id,
    null,
    { tipo: def.tipo, subtipo, status },
  );

  return { record };
});
