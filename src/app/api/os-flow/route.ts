import type { NextRequest } from 'next/server';

import { ForbiddenError, ValidationError } from '@/core/domain/errors';
import { validarTransicaoOsNoServidor } from '@/core/domain/forms/os-flow-guard';
import {
  buildReg016DadosFromOsFluxo,
  osDeveSincronizarReg016,
} from '@/core/domain/forms/os-reg016-sync';
import {
  normalizarNumeroOs,
  type OrdemServicoFluxoState,
} from '@/core/domain/forms/os-workflow';
import { getRepositories } from '@/infra/db';
import { supabaseAdmin } from '@/infra/db/supabase/client';
import {
  carregarOsFluxoPorNumero,
  persistirOsFluxoNoServidor,
} from '@/infra/db/supabase/os-flow-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

async function carregarEstadoAtual(norm: string): Promise<OrdemServicoFluxoState | null> {
  return carregarOsFluxoPorNumero(norm);
}

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const osParam = req.nextUrl.searchParams.get('os');
  const allParam = req.nextUrl.searchParams.get('all');

  // Caso 1: Buscar uma OS específica
  if (osParam && allParam !== 'true') {
    const os = await carregarEstadoAtual(normalizarNumeroOs(osParam));
    return { os };
  }

  // Caso 2: Listar todas as OS salvas
  const { data: directRows, error: directError } = await supabaseAdmin
    .from('os_fluxo')
    .select('estado, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (!directError && Array.isArray(directRows) && directRows.length > 0) {
    return {
      ordens: directRows.map((r) => r.estado as OrdemServicoFluxoState),
    };
  }

  // Fallback audit_logs
  const { data: auditRows } = await supabaseAdmin
    .from('audit_logs')
    .select('entidade_id, dados_depois, created_at')
    .eq('entidade', '__db_os_fluxo__')
    .order('created_at', { ascending: false })
    .limit(200);

  const map = new Map<string, OrdemServicoFluxoState>();
  for (const row of auditRows ?? []) {
    const norm = row.entidade_id;
    if (!map.has(norm) && row.dados_depois) {
      map.set(norm, row.dados_depois as OrdemServicoFluxoState);
    }
  }

  return { ordens: Array.from(map.values()) };
});

const MAX_BODY_BYTES = 512 * 1024;

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    throw new ValidationError('Payload do fluxo da OS acima do limite permitido.');
  }
  let rawBody: Partial<OrdemServicoFluxoState>;
  try {
    rawBody = JSON.parse(rawText) as Partial<OrdemServicoFluxoState>;
  } catch {
    throw new ValidationError('JSON inválido.');
  }

  if (!rawBody || typeof rawBody.numeroOs !== 'string' || !rawBody.numeroOs.trim()) {
    throw new ValidationError('O campo numeroOs é obrigatório para salvar o fluxo da OS.');
  }

  const norm = normalizarNumeroOs(rawBody.numeroOs);

  // Autorização no servidor: perfil, setor responsável e integridade do histórico.
  // Nunca confia no estado enviado pelo navegador.
  const atual = await carregarEstadoAtual(norm);
  const guarda = validarTransicaoOsNoServidor({
    perfil: auth.perfil,
    usuarioId: auth.sub,
    anterior: atual,
    proximo: rawBody as OrdemServicoFluxoState,
  });
  if (!guarda.permitido) {
    throw new ForbiddenError(guarda.motivo ?? 'Transição da OS não autorizada para o seu perfil.');
  }

  const agoraIso = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent') ?? 'browser';
  const estadoPersistido = rawBody as OrdemServicoFluxoState;

  // 1-2. Upsert na tabela os_fluxo + trilha imutável no audit_logs
  const { directTableOk, numeroOs } = await persistirOsFluxoNoServidor({
    estado: estadoPersistido,
    usuarioId: auth.sub,
    ip,
    userAgent,
    acao: 'os_fluxo.atualizar',
    createdAt: agoraIso,
  });

  // 3. Sincronização automática e atômica do Fluxo da OS -> REG-016 (etapas-manutencao)
  let reg016Record = null;
  if (osDeveSincronizarReg016(estadoPersistido)) {
    const { operacionalRepository } = getRepositories();
    const [reg016Existente, reg035Existente, reg022Existente, reg030Existente] =
      await Promise.all([
        operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', norm),
        operacionalRepository.findLatestFormRecordByOs('checklist-manutencao', norm),
        operacionalRepository.findLatestFormRecordByOs('inspecao-recebimento', norm),
        operacionalRepository.findLatestFormRecordByOs('verificacao-calibracao', norm),
      ]);

    const reg016Sync = buildReg016DadosFromOsFluxo({
      os: estadoPersistido,
      dadosExistentes: reg016Existente?.dados ?? null,
      reg035Dados: reg035Existente?.dados ?? null,
      reg035Subtipo: reg035Existente?.subtipo ?? null,
      reg022Dados: reg022Existente?.dados ?? null,
      reg030Dados: reg030Existente?.dados ?? null,
    });

    reg016Record = await operacionalRepository.upsertFormRecordByOs(
      'etapas-manutencao',
      norm,
      {
        subtipo: null,
        dados: reg016Sync.dados,
        status: reg016Sync.status,
        dataRef: reg016Sync.dataRef,
        criadoPor: auth.sub,
      },
    );
  }

  return {
    ok: true,
    directTableOk,
    numeroOs,
    reg016Record,
  };
});
