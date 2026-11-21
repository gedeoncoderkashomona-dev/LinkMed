import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { AppError } from '@/core/domain/errors';

type Handler<T, P = any> = (req: NextRequest, context: { params: P }) => Promise<T>;

export function traduzirMensagemZod(rawMsg: string): string {
  const msg = rawMsg.trim();
  if (/^Required$/i.test(msg)) {
    return 'Campo obrigatório não preenchido.';
  }
  const minStr = msg.match(/^String must contain at least (\d+) character\(s\)$/i);
  if (minStr) {
    return `Deve conter no mínimo ${minStr[1]} caractere(s).`;
  }
  const maxStr = msg.match(/^String must contain at most (\d+) character\(s\)$/i);
  if (maxStr) {
    return `Deve conter no máximo ${maxStr[1]} caractere(s).`;
  }
  const minArr = msg.match(/^Array must contain at least (\d+) element\(s\)$/i);
  if (minArr) {
    return `Selecione pelo menos ${minArr[1]} item(ns).`;
  }
  const maxArr = msg.match(/^Array must contain at most (\d+) element\(s\)$/i);
  if (maxArr) {
    return `Limite máximo de ${maxArr[1]} item(ns).`;
  }
  const numMin = msg.match(/^Number must be greater than or equal to ([\d.-]+)$/i);
  if (numMin) {
    return `O valor deve ser maior ou igual a ${numMin[1]}.`;
  }
  const numGt = msg.match(/^Number must be greater than ([\d.-]+)$/i);
  if (numGt) {
    return `O valor deve ser maior que ${numGt[1]}.`;
  }
  const numMax = msg.match(/^Number must be less than or equal to ([\d.-]+)$/i);
  if (numMax) {
    return `O valor deve ser menor ou igual a ${numMax[1]}.`;
  }
  if (/^Invalid enum value\./i.test(msg) || /^Invalid literal value/i.test(msg)) {
    return 'Valor selecionado inválido para este campo.';
  }
  if (/^Invalid email$/i.test(msg)) {
    return 'Endereço de e-mail inválido.';
  }
  if (/^Invalid input$/i.test(msg)) {
    return 'Valor informado inválido.';
  }
  if (/^Expected string, received/i.test(msg)) {
    return 'Informe um texto válido.';
  }
  if (/^Expected number, received/i.test(msg)) {
    return 'Informe um número válido.';
  }
  if (/^Expected boolean, received/i.test(msg)) {
    return 'Informe Sim ou Não.';
  }
  if (/^Expected array, received/i.test(msg)) {
    return 'Formato de lista inválido.';
  }
  if (/^Expected object, received/i.test(msg)) {
    return 'Estrutura de dados inválida.';
  }
  return msg;
}

/**
 * Wrapper de rota API:
 *  - converte erros de domínio em respostas HTTP padronizadas
 *  - trata ZodError → 422 com detalhes em português
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
        const rawFieldErrors = err.flatten().fieldErrors;
        const fieldErrors: Record<string, string[]> = {};
        for (const [k, msgs] of Object.entries(rawFieldErrors)) {
          if (msgs && msgs.length > 0) {
            fieldErrors[k] = msgs.map(traduzirMensagemZod);
          }
        }
        const firstField = Object.keys(fieldErrors)[0];
        const firstIssue = firstField
          ? fieldErrors[firstField]?.[0]
          : err.issues[0]?.message
            ? traduzirMensagemZod(err.issues[0].message)
            : undefined;
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: firstIssue
              ? firstField
                ? `Verifique o campo "${firstField}": ${firstIssue}`
                : firstIssue
              : 'Dados inválidos no preenchimento do formulário.',
            details: fieldErrors,
            ...meta,
          },
          { status: 422 },
        );
      }
      // eslint-disable-next-line no-console
      console.error(`[api][${meta.method} ${meta.route}] erro inesperado:`, err);
      const isDev = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor ao processar a solicitação.',
          details: isDev && err instanceof Error ? { reason: err.message } : null,
          ...meta,
        },
        { status: 500 },
      );
    }
  };
}