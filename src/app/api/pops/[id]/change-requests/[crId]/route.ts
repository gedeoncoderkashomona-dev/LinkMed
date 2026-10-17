import { NextResponse, type NextRequest } from 'next/server';

import { ChangeRequestUseCases } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const PATCH = apiHandler(
  async (req: NextRequest, { params }: { params: { id: string; crId: string } }) => {
    const auth = await requireAuth();
    assertCan(auth.perfil, 'pops:upload'); // Diretor ou Gestor

    const body = (await req.json().catch(() => ({}))) as {
      status?: 'aprovada' | 'rejeitada';
      resposta?: string;
    };

    if (!body.status || !body.resposta) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Status e resposta são obrigatórios.' },
        { status: 422 },
      );
    }

    const { popRepository, auditService } = getRepositories();
    const changeRequest = await new ChangeRequestUseCases(popRepository, auditService).respond({
      popId: params.id,
      crId: params.crId,
      respondidoPor: auth.sub,
      status: body.status,
      resposta: body.resposta.trim(),
      context: {
        ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
      },
    });

    return { changeRequest };
  },
);
