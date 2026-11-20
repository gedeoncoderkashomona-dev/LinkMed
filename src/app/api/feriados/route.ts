import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError } from '@/core/domain/errors';
import {
  adicionarFeriadoV4,
  obterFeriadosV4,
  removerFeriadoV4,
} from '@/infra/db/supabase/os-v4-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { mapRecusadoParaAppError } from '@/lib/http/os-v4-error';

export const runtime = 'nodejs';

const PERFIS_GESTAO_FERIADO = ['adm', 'diretor', 'gestor'] as const;

const createFeriadoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.'),
  descricao: z.string().min(2, 'Informe a descrição do feriado.').max(120),
  escopo: z
    .enum(['nacional', 'estadual_pe', 'municipal_recife', 'personalizado'])
    .optional(),
});

export const GET = apiHandler(async () => {
  await requireAuth();
  const feriados = await obterFeriadosV4();
  return { feriados };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (!PERFIS_GESTAO_FERIADO.includes(auth.perfil as (typeof PERFIS_GESTAO_FERIADO)[number])) {
    throw new ForbiddenError('Apenas ADM, Diretor ou Qualidade podem gerenciar feriados.');
  }

  const body = createFeriadoSchema.parse(await req.json());
  try {
    const feriado = await adicionarFeriadoV4({
      data: body.data,
      descricao: body.descricao,
      escopo: body.escopo ?? 'personalizado',
      usuarioId: auth.sub,
    });
    const feriados = await obterFeriadosV4();
    return { feriado, feriados };
  } catch (err) {
    mapRecusadoParaAppError(err);
  }
});

export const DELETE = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (!PERFIS_GESTAO_FERIADO.includes(auth.perfil as (typeof PERFIS_GESTAO_FERIADO)[number])) {
    throw new ForbiddenError('Apenas ADM, Diretor ou Qualidade podem gerenciar feriados.');
  }

  const dataParam = req.nextUrl.searchParams.get('data') ?? '';
  try {
    await removerFeriadoV4({ data: dataParam, usuarioId: auth.sub });
    const feriados = await obterFeriadosV4();
    return { ok: true, feriados };
  } catch (err) {
    mapRecusadoParaAppError(err);
  }
});
