import type { NextRequest } from 'next/server';

import { getRepositories } from '@/infra/db';
import { requirePerfil } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const GET = apiHandler(async (req: NextRequest) => {
  await requirePerfil('diretor', 'gestor');

  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '150');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 10), 500) : 150;

  const { auditRepository, userRepository } = getRepositories();
  const [logs, users] = await Promise.all([
    auditRepository.list(limit),
    userRepository.list(),
  ]);

  const userMap = new Map(
    users.map((u) => [
      u.id,
      { nomeCompleto: u.nomeCompleto, email: u.email, perfil: u.perfil },
    ]),
  );

  const enriched = logs.map((log) => {
    const autor = userMap.get(log.usuarioId);
    return {
      ...log,
      usuarioNome: autor?.nomeCompleto ?? 'Usuário do Sistema',
      usuarioEmail: autor?.email ?? null,
      usuarioPerfil: autor?.perfil ?? null,
    };
  });

  return { logs: enriched };
});
