import type { NextRequest } from 'next/server';

import { CreateUserUseCase } from '@/core/use-cases/users/create-user';
import { ListUsersUseCase } from '@/core/use-cases/users/list-users';
import { getRepositories } from '@/infra/db';
import { passwordService } from '@/infra/crypto';
import { requirePerfil } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { createUserSchema } from '@/lib/validation/auth-schemas';

export const runtime = 'nodejs';

export const GET = apiHandler(async (_req: NextRequest) => {
  await requirePerfil('diretor', 'gestor');
  const { userRepository } = getRepositories();
  const users = await new ListUsersUseCase(userRepository).execute();
  return { users };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requirePerfil('diretor'); // apenas Diretor cria usuários
  const body = await req.json();
  const data = createUserSchema.parse(body);

  const { userRepository, auditService } = getRepositories();
  const user = await new CreateUserUseCase(userRepository, passwordService).execute(data);

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'user.create',
    'User',
    user.id,
    null,
    user,
  );

  return { user };
});