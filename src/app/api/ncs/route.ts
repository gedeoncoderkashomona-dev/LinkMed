import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { NC_ORIGENS, NC_SEVERIDADES, type NcOrigem } from '@/core/domain/entities/operacional';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const createSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe um título.').max(255),
  descricao: z.string().trim().max(4000).nullish(),
  origem: z.enum(NC_ORIGENS),
  severidade: z.enum(NC_SEVERIDADES),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const origem = req.nextUrl.searchParams.get('origem') as NcOrigem | null;
  const { operacionalRepository } = getRepositories();
  const ncs = await operacionalRepository.listNcs(origem ?? undefined);

  const resumo = { abertas: 0, emAndamento: 0, concluidas: 0, total: ncs.length };
  for (const nc of ncs) {
    if (nc.status === 'aberta') resumo.abertas += 1;
    else if (nc.status === 'em_andamento') resumo.emAndamento += 1;
    else if (nc.status === 'concluida') resumo.concluidas += 1;
  }

  return { ncs, resumo };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'ncs:create');
  const body = createSchema.parse(await req.json());

  const { operacionalRepository, auditService } = getRepositories();
  const nc = await operacionalRepository.createNc({
    titulo: body.titulo,
    descricao: body.descricao || null,
    origem: body.origem,
    severidade: body.severidade,
    responsavelId: null,
    criadoPor: auth.sub,
  });

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'nc.create',
    'Nc',
    nc.id,
    null,
    { codigo: nc.codigo, severidade: nc.severidade, origem: nc.origem },
  );

  return { nc };
});
