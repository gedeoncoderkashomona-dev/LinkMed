import { createHmac } from 'node:crypto';

import type {
  SignaturePayload,
  SignatureService,
} from '@/core/services/signature-service';

/**
 * Assinatura eletrônica com HMAC-SHA256 (RN-07 / RDC 665/22):
 * Concatena metadados do signatário e assina com chave secreta do servidor.
 * Garante autenticidade, integridade e impossibilidade de forjamento sem a chave.
 *
 * A chave é injetada (resolvida de forma estrita em `secrets.ts`): não existe mais
 * fallback para texto fixo nem reaproveitamento do segredo do JWT.
 */
export class SimpleSignatureService implements SignatureService {
  constructor(private readonly secretKey: string) {
    if (!secretKey) {
      throw new Error('SIGNATURE_SECRET não configurado.');
    }
  }

  async assinar(payload: SignaturePayload): Promise<string> {
    const raw = [
      payload.usuarioId,
      payload.hashDocumento,
      payload.timestamp.toISOString(),
      payload.ip,
      payload.userAgent,
    ].join('|');
    return createHmac('sha256', this.secretKey).update(raw).digest('hex');
  }
}
