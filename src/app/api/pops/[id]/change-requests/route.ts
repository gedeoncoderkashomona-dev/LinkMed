import { NextResponse, type NextRequest } from 'next/server';

import { ChangeRequestUseCases } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();

  const body = (await req.json().catch(() => ({}))) as { descricao?: string };
  if (!body.descricao || body.descricao.trim().length < 5) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Descrição da sugestão deve ter ao menos 5 caracteres.' },
      { status: 422 },
    );
  }

  const { popRepository, auditService } = getRepositories();
  const changeRequest = await new ChangeRequestUseCases(popRepository, auditService).create({
    popId: params.id,
    solicitanteId: auth.sub,
    descricao: body.descricao.trim(),
    context: {
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
  });

  return { changeRequest };
});
