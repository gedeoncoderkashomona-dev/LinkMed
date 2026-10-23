import type { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  TREINAMENTO_TIPOS,
  type AvaliacaoEficaciaParticipante,
  type NotaEficacia,
  type ParticipanteReg008,
} from '@/core/domain/entities/operacional';
import { canEditGovernance, RESPONSAVEIS_PADRAO_AT } from '@/core/domain/forms/definitions';
import { getRepositories } from '@/infra/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { assertCan } from '@/lib/auth/rbac';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const notaSchema = z.coerce.number().int().min(1).max(5);

const participanteDetalhadoSchema = z.object({
  nome: z.string().trim().min(1),
  funcao: z.string().trim().default(''),
  assinatura: z.string().trim().default('Confirmado'),
});

const avaliacaoEficaciaSchema = z.object({
  participante: z.string().trim().min(1),
  assimilacaoConteudo: notaSchema,
  aplicabilidadeAtividade: notaSchema,
  desempenhoQualidadeProdutividade: notaSchema,
  interesseNovosConceitos: notaSchema,
  execucaoConformeProcedimentos: notaSchema,
  observacoes: z.string().trim().default(''),
});

const createSchema = z
  .object({
    titulo: z.string().trim().min(3, 'Informe o assunto / título.').max(255),
    tipo: z.enum(TREINAMENTO_TIPOS),
    instrutor: z.string().trim().max(255).nullish(),
    entidade: z.string().trim().max(255).nullish(),
    cargaHoraria: z.coerce.number().positive().max(1000).nullish(),
    dataRealizacao: data,
    validadeAte: data.nullish().or(z.literal('')),
    participantes: z.array(z.string().trim().min(1)).max(100).default([]),
    participantesDetalhados: z.array(participanteDetalhadoSchema).max(100).optional(),
    observacoes: z.string().trim().max(4000).nullish(),
    conteudo: z.string().trim().max(4000).nullish(),
    localTreinamento: z.string().trim().max(255).nullish(),
    horarioInicial: z.string().trim().max(10).nullish(),
    horarioFinal: z.string().trim().max(10).nullish(),
    avaliadoPor: z.string().trim().max(255).nullish(),
    dataAvaliacao: data.nullish().or(z.literal('')),
    assinaturaAvaliador: z.string().trim().max(255).nullish(),
    avaliacoesEficacia: z.array(avaliacaoEficaciaSchema).max(100).optional(),
    elaboradoPor: z.string().trim().max(255).nullish(),
    revisadoPor: z.string().trim().max(255).nullish(),
    aprovadoPor: z.string().trim().max(255).nullish(),
  })
  .refine((v) => v.tipo !== 'externo' || (v.entidade && v.entidade.length > 0), {
    message: 'Informe a entidade que ministrou o treinamento externo.',
    path: ['entidade'],
  });

const updateEficaciaSchema = z.object({
  id: z.string().min(1),
  avaliadoPor: z.string().trim().min(2, 'Informe o responsável pela avaliação.'),
  dataAvaliacao: data,
  assinaturaAvaliador: z.string().trim().min(2, 'Informe a assinatura do avaliador.'),
  avaliacoesEficacia: z.array(avaliacaoEficaciaSchema).min(1, 'Avalie pelo menos um participante.'),
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

  const podeEditarGov = canEditGovernance(auth.perfil);
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
    participantesDetalhados: (body.participantesDetalhados ?? []) as ParticipanteReg008[],
    observacoes: body.observacoes || null,
    conteudo: body.conteudo || null,
    localTreinamento: body.localTreinamento || 'Sala de Treinamento LinkMed',
    horarioInicial: body.horarioInicial || '08:30',
    horarioFinal: body.horarioFinal || '12:30',
    avaliadoPor: body.avaliadoPor || null,
    dataAvaliacao: body.dataAvaliacao || null,
    assinaturaAvaliador: body.assinaturaAvaliador || null,
    avaliacoesEficacia: (body.avaliacoesEficacia ?? []).map((a) => ({
      ...a,
      assimilacaoConteudo: a.assimilacaoConteudo as NotaEficacia,
      aplicabilidadeAtividade: a.aplicabilidadeAtividade as NotaEficacia,
      desempenhoQualidadeProdutividade: a.desempenhoQualidadeProdutividade as NotaEficacia,
      interesseNovosConceitos: a.interesseNovosConceitos as NotaEficacia,
      execucaoConformeProcedimentos: a.execucaoConformeProcedimentos as NotaEficacia,
    })) as AvaliacaoEficaciaParticipante[],
    elaboradoPor: podeEditarGov
      ? body.elaboradoPor || RESPONSAVEIS_PADRAO_AT.elaboradoPor
      : RESPONSAVEIS_PADRAO_AT.elaboradoPor,
    revisadoPor: podeEditarGov
      ? body.revisadoPor || RESPONSAVEIS_PADRAO_AT.revisadoPor
      : RESPONSAVEIS_PADRAO_AT.revisadoPor,
    aprovadoPor: podeEditarGov
      ? body.aprovadoPor || RESPONSAVEIS_PADRAO_AT.aprovadoPor
      : RESPONSAVEIS_PADRAO_AT.aprovadoPor,
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
    {
      titulo: treinamento.titulo,
      tipo: treinamento.tipo,
      avaliacoesCount: treinamento.avaliacoesEficacia?.length ?? 0,
    },
  );

  return { treinamento };
});

export const PATCH = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  assertCan(auth.perfil, 'trainings:create');
  const body = updateEficaciaSchema.parse(await req.json());

  const { operacionalRepository, auditService } = getRepositories();
  if (!operacionalRepository.updateTreinamentoEficacia) {
    throw new Error('Atualização de eficácia não suportada pelo repositório.');
  }

  const treinamento = await operacionalRepository.updateTreinamentoEficacia({
    id: body.id,
    avaliadoPor: body.avaliadoPor,
    dataAvaliacao: body.dataAvaliacao,
    assinaturaAvaliador: body.assinaturaAvaliador,
    avaliacoesEficacia: body.avaliacoesEficacia.map((a) => ({
      ...a,
      assimilacaoConteudo: a.assimilacaoConteudo as NotaEficacia,
      aplicabilidadeAtividade: a.aplicabilidadeAtividade as NotaEficacia,
      desempenhoQualidadeProdutividade: a.desempenhoQualidadeProdutividade as NotaEficacia,
      interesseNovosConceitos: a.interesseNovosConceitos as NotaEficacia,
      execucaoConformeProcedimentos: a.execucaoConformeProcedimentos as NotaEficacia,
    })),
  });

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
    'training.create',
    'Training',
    body.id,
    null,
    {
      acao: 'avaliacao_eficacia_reg008',
      avaliadoPor: body.avaliadoPor,
      avaliacoesCount: body.avaliacoesEficacia.length,
    },
  );

  return { treinamento };
});
