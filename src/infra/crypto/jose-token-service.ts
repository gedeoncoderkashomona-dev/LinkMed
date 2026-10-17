import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { UnauthorizedError } from '@/core/domain/errors';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenService,
} from '@/core/services/token-service';

const encoder = new TextEncoder();

/**
 * Implementação do TokenService com `jose` — funciona em Edge Runtime
 * (necessário para o middleware do Next).
 */
export class JoseTokenService implements TokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessExpiresIn: string = '15m',
    private readonly refreshExpiresIn: string = '7d',
  ) {
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets não configurados.');
    }
  }

  async signAccess(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessExpiresIn)
      .sign(encoder.encode(this.accessSecret));
  }

  async signRefresh(payload: RefreshTokenPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .sign(encoder.encode(this.refreshSecret));
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    const payload = await this.verify(token, this.accessSecret, 'access');
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      perfil: payload.perfil as AccessTokenPayload['perfil'],
    };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.verify(token, this.refreshSecret, 'refresh');
    return {
      sub: String(payload.sub),
      jti: String(payload.jti),
    };
  }

  private async verify(
    token: string,
    secret: string,
    expectedType: 'access' | 'refresh',
  ): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, encoder.encode(secret));
      if (payload.type !== expectedType) {
        throw new UnauthorizedError('Token com tipo inválido.');
      }
      return payload;
    } catch {
      throw new UnauthorizedError('Sessão expirada ou inválida.');
    }
  }
}