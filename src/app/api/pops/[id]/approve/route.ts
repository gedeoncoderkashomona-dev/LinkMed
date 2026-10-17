import type { NextRequest } from 'next/server';

import { ApprovePopUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { signatureService } from '@/infra/crypto';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'pops:approve'); // Apenas Diretor

  const { popRepository, auditService } = getRepositories();
  const result = await new ApprovePopUseCase(
    popRepository,
    signatureService,
    auditService,
  ).execute(params.id, auth.sub, {
    ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
    userAgent: req.headers.get('user-agent'),
  });

  return result;
});
