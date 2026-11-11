/**
 * Resolução centralizada e estrita dos segredos criptográficos.
 *
 * Em PRODUÇÃO:
 *  - todos os segredos são obrigatórios;
 *  - precisam ter ao menos 32 caracteres;
 *  - não podem ser os valores padrão de desenvolvimento;
 *  - JWT de acesso, JWT de refresh e assinatura eletrônica devem ser segredos DISTINTOS.
 * Em desenvolvimento/testes, valores padrão são aceitos para facilitar o setup local.
 *
 * Compatível com Edge Runtime (usado também pelo middleware).
 */

const DEV_DEFAULTS = {
  JWT_ACCESS_SECRET: 'dev-access-secret-troque-em-producao-000000000000',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-troque-em-producao-000000000000',
  SIGNATURE_SECRET: 'dev-signature-secret-troque-em-producao-0000000000',
} as const;

export type NomeSegredo = keyof typeof DEV_DEFAULTS;

const MIN_LEN_PROD = 32;
const VALORES_FRACOS = new Set<string>([
  ...Object.values(DEV_DEFAULTS),
  'dev-signature-secret-key-regula-on',
  'your-secret',
  'changeme',
  'secret',
]);

export function resolverSegredo(nome: NomeSegredo): string {
  const isProd = process.env.NODE_ENV === 'production';
  const valor = process.env[nome]?.trim();

  if (!isProd) return valor || DEV_DEFAULTS[nome];

  // Durante `next build` (coleta de dados) as variáveis ainda podem não existir no ambiente de build.
  // A validação estrita ocorre em runtime, na primeira requisição.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return valor || DEV_DEFAULTS[nome];
  }

  if (!valor) {
    throw new Error(`${nome} é obrigatório em produção.`);
  }
  if (valor.length < MIN_LEN_PROD) {
    throw new Error(`${nome} deve ter ao menos ${MIN_LEN_PROD} caracteres em produção.`);
  }
  if (VALORES_FRACOS.has(valor)) {
    throw new Error(`${nome} está com um valor padrão/fraco. Gere um segredo forte (openssl rand -base64 48).`);
  }
  return valor;
}

/** Garante que os segredos de produção não sejam reaproveitados entre finalidades. */
export function validarSegredosDistintos(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const a = resolverSegredo('JWT_ACCESS_SECRET');
  const r = resolverSegredo('JWT_REFRESH_SECRET');
  const s = resolverSegredo('SIGNATURE_SECRET');
  if (a === r || a === s || r === s) {
    throw new Error(
      'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET e SIGNATURE_SECRET devem ser valores distintos em produção.',
    );
  }
}
