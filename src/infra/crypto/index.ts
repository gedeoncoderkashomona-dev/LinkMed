import { BcryptPasswordService } from './bcrypt-password-service';
import { JoseTokenService } from './jose-token-service';
import { WebCryptoHashService } from './webcrypto-hash-service';
import { SimpleSignatureService } from './simple-signature-service';

export const passwordService = new BcryptPasswordService();

const isProd = process.env.NODE_ENV === 'production';
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (isProd && (!accessSecret || !refreshSecret)) {
  throw new Error(
    'JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são obrigatórios em ambiente de produção.',
  );
}

export const tokenService = new JoseTokenService(
  accessSecret ?? 'dev-access-secret-troque-em-producao-000000000000',
  refreshSecret ?? 'dev-refresh-secret-troque-em-producao-000000000000',
  process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
);

export const hashService = new WebCryptoHashService();
export const signatureService = new SimpleSignatureService();