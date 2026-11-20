import { AppError } from '@/core/domain/errors';
import { Recusado } from '@/core/domain/os-v4/nucleo';

/**
 * Converte erros de domínio `Recusado` do núcleo v4 em `AppError` HTTP estruturado
 * preservando `details.codigo` e `details.reason` (para acionar o pop-up "Entendi"
 * e tratamento específico de conflito de versão / janela de horário).
 */
export function mapRecusadoParaAppError(
  err: unknown,
  extras?: { versaoAtual?: number },
): never {
  if (err instanceof Recusado) {
    if (err.codigo === 'versao') {
      throw new AppError(err.message, 'OS_VERSION_CONFLICT', 409, {
        reason: 'versao',
        codigo: 'versao',
        versaoAtual: extras?.versaoAtual,
      });
    }
    if (err.codigo === 'horario' || err.codigo === 'perfil') {
      throw new AppError(
        err.message,
        err.codigo === 'horario' ? 'OS_OUTSIDE_SCHEDULE' : 'OS_FORBIDDEN_SECTOR',
        403,
        { reason: err.codigo, codigo: err.codigo },
      );
    }
    throw new AppError(err.message, 'OS_RULE_REFUSED', 422, {
      reason: err.codigo,
      codigo: err.codigo,
    });
  }
  throw err;
}
