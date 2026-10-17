import type { NextRequest } from 'next/server';

import { GetReadReportUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'pops:read:report');

  const { popRepository, userRepository } = getRepositories();
  const report = await new GetReadReportUseCase(popRepository, userRepository).execute(params.id);
  return report;
});
