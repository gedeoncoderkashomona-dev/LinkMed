import type { NextRequest } from 'next/server';

import { GetPopUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAuth();

  const { popRepository } = getRepositories();
  const detail = await new GetPopUseCase(popRepository).execute(params.id);
  return detail;
});
