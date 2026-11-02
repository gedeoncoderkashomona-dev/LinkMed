import type { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  normalizarNumeroOs,
  type OrdemServicoFluxoState,
} from '@/core/domain/forms/os-workflow';
import { supabaseAdmin } from '@/infra/db/supabase/client';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { ValidationError } from '@/core/domain/errors';

export const runtime = 'nodejs';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const osParam = req.nextUrl.searchParams.get('os');
  const allParam = req.nextUrl.searchParams.get('all');

  // Caso 1: Buscar uma OS específica
  if (osParam && allParam !== 'true') {
    const norm = normalizarNumeroOs(osParam);

    // 1. Tentar tabela os_fluxo
    const { data: directData, error: directError } = await supabaseAdmin
      .from('os_fluxo')
      .select('estado')
      .eq('numero_os_normalizado', norm)
      .maybeSingle();

    if (!directError && directData?.estado) {
      return { os: directData.estado as OrdemServicoFluxoState };
    }

    // 2. Fallback audit_logs
    const { data: auditData } = await supabaseAdmin
      .from('audit_logs')
      .select('dados_depois')
      .eq('entidade', '__db_os_fluxo__')
      .eq('entidade_id', norm)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (auditData?.dados_depois) {
      return { os: auditData.dados_depois as OrdemServicoFluxoState };
    }

    return { os: null };
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

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const rawBody = (await req.json()) as Partial<OrdemServicoFluxoState>;

  if (!rawBody || !rawBody.numeroOs) {
    throw new ValidationError('O campo numeroOs é obrigatório para salvar o fluxo da OS.');
  }

  const norm = normalizarNumeroOs(rawBody.numeroOs);
  const agoraIso = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent') ?? 'browser';

  // 1. Tentar upsert na tabela os_fluxo
  const { error: directError } = await supabaseAdmin.from('os_fluxo').upsert(
    {
      numero_os: rawBody.numeroOs,
      numero_os_normalizado: norm,
      estado: rawBody,
      updated_at: agoraIso,
      criado_por: auth.sub,
    },
    { onConflict: 'numero_os_normalizado' },
  );

  // 2. Persistência resiliente e trilha imutável no audit_logs
  await supabaseAdmin.from('audit_logs').insert({
    usuario_id: auth.sub,
    acao: 'os_fluxo.atualizar',
    entidade: '__db_os_fluxo__',
    entidade_id: norm,
    dados_antes: null,
    dados_depois: rawBody,
    ip,
    user_agent: userAgent,
    created_at: agoraIso,
  });

  return { ok: true, directTableOk: !directError, numeroOs: rawBody.numeroOs };
});

