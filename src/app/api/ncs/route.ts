import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { NC_ORIGENS, NC_SEVERIDADES, type NcOrigem } from '@/core/domain/entities/operacional';
import { canEditGovernance, RESPONSAVEIS_PADRAO_AT } from '@/core/domain/forms/definitions';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const createSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe um título.').max(255),
  descricao: z.string().trim().max(4000).nullish(),
  causa: z.string().trim().max(4000).nullish(),
  acaoImediata: z.string().trim().max(4000).nullish(),
  identificacaoEquipamento: z.string().trim().max(255).nullish(),
  equipamentoNaoSeAplica: z.boolean().optional().default(false),
  elaboradoPor: z.string().trim().max(255).nullish(),
  revisadoPor: z.string().trim().max(255).nullish(),
  aprovadoPor: z.string().trim().max(255).nullish(),
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

  const podeEditarGov = canEditGovernance(auth.perfil);
  const { operacionalRepository, auditService } = getRepositories();
  const nc = await operacionalRepository.createNc({
    titulo: body.titulo,
    descricao: body.descricao || null,
    causa: body.causa || null,
    acaoImediata: body.acaoImediata || null,
    identificacaoEquipamento: body.equipamentoNaoSeAplica
      ? 'Não se aplica (NC Documental / Processo)'
      : body.identificacaoEquipamento || 'Não se aplica',
    equipamentoNaoSeAplica: Boolean(body.equipamentoNaoSeAplica),
    elaboradoPor: podeEditarGov
      ? body.elaboradoPor || RESPONSAVEIS_PADRAO_AT.elaboradoPor
      : RESPONSAVEIS_PADRAO_AT.elaboradoPor,
    revisadoPor: podeEditarGov
      ? body.revisadoPor || RESPONSAVEIS_PADRAO_AT.revisadoPor
      : RESPONSAVEIS_PADRAO_AT.revisadoPor,
    aprovadoPor: podeEditarGov
      ? body.aprovadoPor || RESPONSAVEIS_PADRAO_AT.aprovadoPor
      : RESPONSAVEIS_PADRAO_AT.aprovadoPor,
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
    {
      codigo: nc.codigo,
      severidade: nc.severidade,
      origem: nc.origem,
      identificacaoEquipamento: nc.identificacaoEquipamento,
    },
  );

  return { nc };
});
