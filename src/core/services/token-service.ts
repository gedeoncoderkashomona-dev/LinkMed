import type { Perfil } from '../domain/enums/user';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  perfil: Perfil;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // id único do refresh, para rotação
}

export interface TokenService {
  signAccess(payload: AccessTokenPayload): Promise<string>;
  signRefresh(payload: RefreshTokenPayload): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}