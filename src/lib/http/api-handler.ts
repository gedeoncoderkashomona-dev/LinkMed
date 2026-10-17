import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { AppError } from '@/core/domain/errors';

type Handler<T, P = any> = (req: NextRequest, context: { params: P }) => Promise<T>;

/**
 * Wrapper de rota API:
 *  - converte erros de domínio em respostas HTTP padronizadas
 *  - trata ZodError → 422 com detalhes
 *  - loga erros inesperados (sem vazar stack pro cliente)
 */
export function apiHandler<T, P = any>(handler: Handler<T, P>) {
  return async (req: NextRequest, context: { params: P }) => {
    try {
      const result = await handler(req, context);
      if (result instanceof NextResponse) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      const meta = {
        route: req.nextUrl?.pathname ?? req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
      };

      if (err instanceof AppError) {
        return NextResponse.json(
          {
            error: err.code,
            message: err.message,
            details: err.details ?? null,
            ...meta,
          },
          { status: err.statusCode },
        );
      }
      if (err instanceof ZodError) {
        const fieldErrors = err.flatten().fieldErrors;
        const firstField = Object.keys(fieldErrors)[0];
        const firstIssue = firstField ? fieldErrors[firstField]?.[0] : undefined;
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: firstIssue
              ? `Verifique o campo "${firstField}": ${firstIssue}`
              : 'Dados inválidos no preenchimento do formulário.',
            details: fieldErrors,
            ...meta,
          },
          { status: 422 },
        );
      }
      // eslint-disable-next-line no-console
      console.error(`[api][${meta.method} ${meta.route}] erro inesperado:`, err);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor ao processar a solicitação.',
          details: err instanceof Error ? { reason: err.message } : null,
          ...meta,
        },
        { status: 500 },
      );
    }
  };
}