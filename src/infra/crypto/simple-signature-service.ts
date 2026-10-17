import { createHmac } from 'node:crypto';

import type {
  SignaturePayload,
  SignatureService,
} from '@/core/services/signature-service';

/**
 * Assinatura eletrônica com HMAC-SHA256 (RN-07 / RDC 665/22):
 * Concatena metadados do signatário e assina com chave secreta do servidor.
 * Garante autenticidade, integridade e impossibilidade de forjamento sem a chave.
 */
export class SimpleSignatureService implements SignatureService {
  constructor(
    private readonly secretKey: string = process.env.SIGNATURE_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      'dev-signature-secret-key-regula-on',
  ) {}

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