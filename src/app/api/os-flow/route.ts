import type { NextRequest } from 'next/server';

import { ValidationError } from '@/core/domain/errors';
import { normalizarNumeroOs } from '@/core/domain/forms/os-workflow';
import {
  carregarOsV4PorNumero,
  listarOrdensV4,
} from '@/infra/db/supabase/os-v4-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const osParam = req.nextUrl.searchParams.get('os');
  const allParam = req.nextUrl.searchParams.get('all');

  if (osParam && allParam !== 'true') {
    const carregada = await carregarOsV4PorNumero(normalizarNumeroOs(osParam));
    return {
      os: carregada?.fluxoState ?? null,
      v4: carregada
        ? {
            estado: carregada.estado,
            eventos: carregada.eventos,
            notificacoes: carregada.notificacoes,
            reg034Salvo: carregada.reg034Salvo,
            item5Preenchido: carregada.item5Preenchido,
          }
        : null,
    };
  }

  const ordens = await listarOrdensV4();
  return { ordens };
});

export const POST = apiHandler(async () => {
  await requireAuth();
  throw new ValidationError(
    'Endpoint atualizado para v4: execute comandos pelo endpoint POST /api/os-flow/comandos.',
  );
});
