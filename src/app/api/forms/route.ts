import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, ValidationError } from '@/core/domain/errors';
import {
  avaliarConformidade,
  getFormDef,
  sanitizarDados,
  validarDados,
} from '@/core/domain/forms/definitions';
import { agoraBR } from '@/core/domain/forms/alerts';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const createSchema = z.object({
  tipo: z.string().min(1),
  subtipo: z.string().nullish(),
  dados: z.record(z.unknown()),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const tipo = req.nextUrl.searchParams.get('tipo');
  const { operacionalRepository } = getRepositories();

  if (!tipo) {
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const records = await operacionalRepository.listFormRecords({ limit: 300 });
    const contagens: Record<string, { total: number; naoConformes: number }> = {};
    for (const r of records) {
      if (r.dataRef < desde) continue;
      const atual = (contagens[r.tipo] ??= { total: 0, naoConformes: 0 });
      atual.total += 1;
      if (r.status === 'nao_conforme') atual.naoConformes += 1;
    }
    return { records, contagens };
  }

  const def = getFormDef(tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');

  const records = await operacionalRepository.listFormRecords({ tipo: def.tipo, limit: 100 });
  return { records };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = createSchema.parse(await req.json());

  const def = getFormDef(body.tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');
  if (!def.perfis.includes(auth.perfil)) throw new ForbiddenError();

  const subtipo = body.subtipo ?? null;
  const erros = validarDados(def, subtipo, body.dados);
  if (Object.keys(erros).length > 0) {
    throw new ValidationError('Preencha os campos obrigatórios.', erros);
  }

  const dados = sanitizarDados(def, subtipo, body.dados);
  const status = avaliarConformidade(def, subtipo, dados);
  const dataRef = String(dados[def.campoData] ?? agoraBR().data);

  const { operacionalRepository, auditService } = getRepositories();
  const record = await operacionalRepository.createFormRecord({
    tipo: def.tipo,
    subtipo,
    dados,
    status,
    dataRef,
    criadoPor: auth.sub,
  });

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'form.create',
    'FormRecord',
    record.id,
    null,
    { tipo: def.tipo, subtipo, status },
  );

  return { record };
});
