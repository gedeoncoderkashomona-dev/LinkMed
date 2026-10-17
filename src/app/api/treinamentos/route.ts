import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { TREINAMENTO_TIPOS } from '@/core/domain/entities/operacional';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

const createSchema = z
  .object({
    titulo: z.string().trim().min(3, 'Informe o título.').max(255),
    tipo: z.enum(TREINAMENTO_TIPOS),
    instrutor: z.string().trim().max(255).nullish(),
    entidade: z.string().trim().max(255).nullish(),
    cargaHoraria: z.coerce.number().positive().max(1000).nullish(),
    dataRealizacao: data,
    validadeAte: data.nullish().or(z.literal('')),
    participantes: z.array(z.string().trim().min(1)).max(100).default([]),
    observacoes: z.string().trim().max(4000).nullish(),
  })
  .refine((v) => v.tipo !== 'externo' || (v.entidade && v.entidade.length > 0), {
    message: 'Informe a entidade que ministrou o treinamento externo.',
    path: ['entidade'],
  });

export const GET = apiHandler(async () => {
  await requireAuth();
  const { operacionalRepository } = getRepositories();
  return { treinamentos: await operacionalRepository.listTreinamentos() };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'trainings:create');
  const body = createSchema.parse(await req.json());

  const { operacionalRepository, auditService } = getRepositories();
  const treinamento = await operacionalRepository.createTreinamento({
    titulo: body.titulo,
    tipo: body.tipo,
    setor: 'assistencia_tecnica',
    instrutor: body.instrutor || null,
    entidade: body.tipo === 'externo' ? body.entidade || null : null,
    cargaHoraria: body.cargaHoraria ?? null,
    dataRealizacao: body.dataRealizacao,
    validadeAte: body.validadeAte || null,
    participantes: body.participantes,
    observacoes: body.observacoes || null,
    criadoPor: auth.sub,
  });

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'training.create',
    'Training',
    treinamento.id,
    null,
    { titulo: treinamento.titulo, tipo: treinamento.tipo },
  );

  return { treinamento };
});
