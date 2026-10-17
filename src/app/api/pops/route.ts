import { NextResponse, type NextRequest } from 'next/server';

import { ListPopsUseCase, CreatePopUseCase } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import { hashService, signatureService } from '@/infra/crypto';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';
import type { Setor, PopStatus } from '@/core/domain/enums/pop';

export const runtime = 'nodejs';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();

  const { searchParams } = req.nextUrl;
  const setor = searchParams.get('setor') as Setor | null;
  const status = searchParams.get('status') as PopStatus | null;
  const search = searchParams.get('search') ?? undefined;

  const { popRepository } = getRepositories();
  const pops = await new ListPopsUseCase(popRepository).execute({
    setor: setor || undefined,
    status: status || undefined,
    search: search || undefined,
  });

  return { pops };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'pops:upload');

  const formData = await req.formData();
  const titulo = formData.get('titulo') as string;
  const descricao = (formData.get('descricao') as string) || null;
  const setor = formData.get('setor') as Setor;
  const periodicidade = Number(formData.get('periodicidadeRevisaoMeses') || '24');
  const file = formData.get('arquivo') as File | null;

  if (!titulo || !setor || !file) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Título, setor e arquivo PDF são obrigatórios.' },
      { status: 422 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const { popRepository, auditService } = getRepositories();

  const pop = await new CreatePopUseCase(
    popRepository,
    storageService,
    hashService,
    auditService,
  ).execute({
    titulo,
    descricao,
    setor,
    periodicidadeRevisaoMeses: periodicidade,
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

  return { pop };
});
