import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError } from '@/core/domain/errors';
import { canEditGovernance } from '@/core/domain/forms/definitions';
import { GetPopUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const updateGovernanceSchema = z.object({
  elaboradoPor: z.string().trim().min(2).max(255),
  revisadoPor: z.string().trim().min(2).max(255),
  aprovadoPorNome: z.string().trim().min(2).max(255),
});

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();

  const { popRepository } = getRepositories();
  const detail = await new GetPopUseCase(popRepository).execute(params.id, auth.sub);
  return detail;
});

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!canEditGovernance(auth.perfil)) {
    throw new ForbiddenError(
      'Apenas a Qualidade e o Diretor podem alterar quem elaborou, revisou e aprovou os POPs.',
    );
  }

  const body = updateGovernanceSchema.parse(await req.json());
  const { popRepository, auditService } = getRepositories();
  const pop = await popRepository.update(params.id, {
    elaboradoPor: body.elaboradoPor,
    revisadoPor: body.revisadoPor,
    aprovadoPorNome: body.aprovadoPorNome,
  });

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'pop.update',
    'Pop',
    pop.id,
    null,
    {
      elaboradoPor: pop.elaboradoPor,
      revisadoPor: pop.revisadoPor,
      aprovadoPorNome: pop.aprovadoPorNome,
    },
  );

  return { pop };
});
