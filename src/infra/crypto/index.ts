import { BcryptPasswordService } from './bcrypt-password-service';
import { JoseTokenService } from './jose-token-service';
import { resolverSegredo, validarSegredosDistintos } from './secrets';
import { WebCryptoHashService } from './webcrypto-hash-service';
import { SimpleSignatureService } from './simple-signature-service';

export const passwordService = new BcryptPasswordService();

// Segredos estritos em produção (obrigatórios, fortes, distintos e sem valores padrão).
validarSegredosDistintos();

export const tokenService = new JoseTokenService(
  resolverSegredo('JWT_ACCESS_SECRET'),
  resolverSegredo('JWT_REFRESH_SECRET'),
  process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
);

export const hashService = new WebCryptoHashService();
export const signatureService = new SimpleSignatureService(resolverSegredo('SIGNATURE_SECRET'));
