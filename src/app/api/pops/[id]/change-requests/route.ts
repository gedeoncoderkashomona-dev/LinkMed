import { NextResponse, type NextRequest } from 'next/server';

import { SETOR_LABEL } from '@/core/domain/enums/pop';
import { ChangeRequestUseCases } from '@/core/use-cases/pops';
import { getRepositories } from '@/infra/db';
import {
  getPopSuggestionRecipient,
  isMailTransportConfigured,
  sendPopSuggestionEmail,
  type MailDeliveryResult,
} from '@/infra/mail/mailer';
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

  const { popRepository, userRepository, auditService } = getRepositories();
  const descricaoLimpa = body.descricao.trim();

  const changeRequest = await new ChangeRequestUseCases(popRepository, auditService).create({
    popId: params.id,
    solicitanteId: auth.sub,
    descricao: descricaoLimpa,
    context: {
      ip: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    },
  });

  const [pop, solicitante] = await Promise.all([
    popRepository.findById(params.id),
    userRepository.findById(auth.sub),
  ]);

  let emailDelivery: MailDeliveryResult;
  try {
    emailDelivery = await sendPopSuggestionEmail({
      changeRequestId: changeRequest.id,
      popId: params.id,
      popCodigo: pop?.codigo ?? params.id,
      popTitulo: pop?.titulo ?? 'POP',
      popVersao: pop?.versaoAtual ?? 1,
      popSetor: pop ? (SETOR_LABEL[pop.setor] ?? pop.setor) : 'Geral',
      descricao: descricaoLimpa,
      solicitanteNome: solicitante?.nomeCompleto ?? 'Colaborador LinkMed',
      solicitanteEmail: solicitante?.email ?? null,
      solicitantePerfil: solicitante?.perfil ?? auth.perfil,
      enviadoEm: changeRequest.createdAt,
      appUrl: req.nextUrl.origin,
    });
  } catch (err) {
    emailDelivery = {
      configured: isMailTransportConfigured(),
      delivered: false,
      provider: 'none',
      recipient: getPopSuggestionRecipient(),
      error: err instanceof Error ? err.message : 'Falha inesperada ao disparar e-mail.',
    };
  }

  return {
    changeRequest: {
      ...changeRequest,
      solicitanteNome: solicitante?.nomeCompleto ?? 'Colaborador LinkMed',
      solicitanteEmail: solicitante?.email ?? null,
      respondidoPorNome: null,
    },
    emailDelivery,
  };
});
