/**
 * Hierarquia de erros de domínio.
 * A camada HTTP mapeia cada um para o status code correto.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciais inválidas.') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado para este perfil.') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Recurso já existe.') {
    super(message, 'CONFLICT', 409);
  }
}