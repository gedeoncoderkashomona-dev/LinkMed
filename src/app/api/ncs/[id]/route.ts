import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { NC_STATUS } from '@/core/domain/entities/operacional';
import { NotFoundError } from '@/core/domain/errors';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const patchSchema = z.object({ status: z.enum(NC_STATUS) });

export const PATCH = apiHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const auth = await requireAuth();
    assertCan(auth.perfil, 'ncs:advance');
    const { status } = patchSchema.parse(await req.json());

    const { operacionalRepository, auditService } = getRepositories();
    const nc = await operacionalRepository.updateNcStatus(params.id, status);
    if (!nc) throw new NotFoundError('Não conformidade não encontrada.');

    await auditService.registrar(
      {
        usuarioId: auth.sub,
        ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
      },
      'nc.update_status',
      'Nc',
      nc.id,
      null,
      { codigo: nc.codigo, status },
    );

    return { nc };
  },
);
