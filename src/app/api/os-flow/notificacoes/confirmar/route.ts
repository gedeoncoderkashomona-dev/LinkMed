import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getRepositories } from '@/infra/db';
import {
  carregarOsV4PorNumero,
  confirmarNotificacaoOsV4,
} from '@/infra/db/supabase/os-v4-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { mapRecusadoParaAppError } from '@/lib/http/os-v4-error';

export const runtime = 'nodejs';

const confirmSchema = z.object({
  notificacaoId: z.string().min(1),
  numeroOs: z.string().min(1),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = confirmSchema.parse(await req.json());

  const { userRepository, auditService } = getRepositories();
  const usuario = await userRepository.findById(auth.sub).catch(() => null);
  const usuarioNome = usuario?.nomeCompleto ?? 'Colaborador';
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  try {
    const notificacao = await confirmarNotificacaoOsV4({
      notificacaoId: body.notificacaoId,
      numeroOs: body.numeroOs,
      perfilSistema: auth.perfil,
      usuarioId: auth.sub,
      usuarioNome,
    });

    await auditService
      .registrar(
        { usuarioId: auth.sub, ip, userAgent },
        'os_v4.notificacao_confirmada',
        'OS',
        body.numeroOs,
        null,
        { notificacaoId: body.notificacaoId, confirmadaEm: notificacao.confirmadaEm },
      )
      .catch(() => undefined);

    const carregada = await carregarOsV4PorNumero(body.numeroOs);
    return {
      ok: true,
      notificacao,
      os: carregada?.fluxoState ?? null,
    };
  } catch (err) {
    mapRecusadoParaAppError(err);
  }
});
