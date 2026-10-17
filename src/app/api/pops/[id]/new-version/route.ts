import { NextResponse, type NextRequest } from 'next/server';

import { NewVersionUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { hashService } from '@/infra/crypto';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'pops:upload');

  const formData = await req.formData();
  const file = formData.get('arquivo') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Arquivo PDF é obrigatório.' },
      { status: 422 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const { popRepository, auditService } = getRepositories();

  const result = await new NewVersionUseCase(
    popRepository,
    storageService,
    hashService,
    auditService,
  ).execute({
    popId: params.id,
    criadoPor: auth.sub,
    arquivo: {
      nome: file.name,
      tamanho: file.size,
      mimeType: file.type || 'application/pdf',
      content: arrayBuffer,
    },
    context: {
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
  });

  return result;
});
