import type { NextRequest } from 'next/server';

import { GetCurrentUserUseCase } from '@/core/use-cases/auth/get-current-user';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const GET = apiHandler(async (_req: NextRequest) => {
  const auth = await requireAuth();
  const { userRepository } = getRepositories();
  const useCase = new GetCurrentUserUseCase(userRepository);
  const user = await useCase.execute(auth.sub);
  return { user };
});