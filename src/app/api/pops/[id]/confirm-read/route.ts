import type { NextRequest } from 'next/server';

import { ConfirmReadUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();

  const { popRepository, auditService } = getRepositories();
  const confirmacao = await new ConfirmReadUseCase(popRepository, auditService).execute(
    params.id,
    auth.sub,
    {
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
  );

  return { confirmacao };
});
