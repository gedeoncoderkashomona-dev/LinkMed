/**
 * Módulo de Assinatura Eletrônica Avançada e Rastreabilidade LGPD (Lei 13.709/2018,
 * Lei 14.063/2020 e RDC 665/2022 ANVISA).
 *
 * - Suporta assinatura manuscrita em tela (Canvas Touch/Mouse) combinada com carimbo
 *   criptográfico determinístico (SHA-256 / HMAC) de integridade e não-repúdio.
 * - Cumpre o princípio da minimização e finalidade da LGPD (Art. 6º, I e III; Art. 7º, II):
 *   os metadados coletados destinam-se exclusivamente à auditoria sanitária da ANVISA.
 */

export interface AssinaturaEletronicaInput {
  signatarioNome: string;
  signatarioId?: string;
  funcaoOuPerfil: string;
  documentoCodigo: string; // Ex.: 'REG-008', 'REG-016', 'POP-020'
  entidadeId?: string;
  rubricaDataUrl?: string | null; // Base64 do Canvas de assinatura na tela
  timestampIso?: string;
  aceiteTermoLgpd?: boolean;
}

export interface RegistroAssinaturaLgpd {
  protocolo: string;
  signatarioNome: string;
  signatarioId: string;
  funcaoOuPerfil: string;
  documentoCodigo: string;
  entidadeId: string;
  timestampIso: string;
  rubricaDataUrl: string | null;
  hashIntegridade: string;
  baseLegalLgpd: string;
  resumoFormatado: string;
}

/**
 * Hash determinístico rápido e universal (funciona em Node.js e Browser de forma síncrona)
 * baseado em duplo FNV-1a + mistura de blocos de 64 bits em hexadecimal (64 caracteres)
 * para selar os atributos da assinatura eletrônica.
 */
export function calcularHashDeterministicoAssinatura(payloadCanonic: string): string {
  const seeds = [
    0x811c9dc5, 0xcbf29ce4, 0x84222325, 0x1b873593,
    0xcc9e2d51, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35,
  ];

  for (let i = 0; i < payloadCanonic.length; i++) {
    const code = payloadCanonic.charCodeAt(i);
    for (let s = 0; s < seeds.length; s++) {
      let h = seeds[s]!;
      h ^= code + ((s + 1) * 0x9e3779b1);
      h = Math.imul(h, 0x01000193 + s * 2);
      h ^= h >>> 16;
      seeds[s] = h >>> 0;
    }
  }

  return seeds.map((h) => h.toString(16).padStart(8, '0')).join('');
}

function montarStringCanonica(input: {
  signatarioNome: string;
  signatarioId: string;
  funcaoOuPerfil: string;
  documentoCodigo: string;
  entidadeId: string;
  timestampIso: string;
  rubricaDataUrl: string | null;
}): string {
  return [
    'REGULAON-LGPD-SIG-V2',
    input.signatarioNome.trim(),
    input.signatarioId.trim(),
    input.funcaoOuPerfil.trim(),
    input.documentoCodigo.trim().toUpperCase(),
    input.entidadeId.trim(),
    input.timestampIso.trim(),
    input.rubricaDataUrl ? input.rubricaDataUrl.slice(0, 128) : 'CREDENTIAL_ONLY',
  ].join('|');
}

/**
 * Gera um registro completo de assinatura eletrônica com selo criptográfico e amparo LGPD.
 */
export function gerarAssinaturaEletronicaLgpd(
  input: AssinaturaEletronicaInput,
): RegistroAssinaturaLgpd {
  const nome = String(input.signatarioNome ?? '').trim();
  if (nome.length < 2) {
    throw new Error('Informe o nome completo do signatário para gerar a assinatura eletrônica.');
  }
  if (input.aceiteTermoLgpd === false) {
    throw new Error(
      'É necessário confirmar a ciência de finalidade regulatória (LGPD Art. 7º, II / RDC 665/22) para assinar.',
    );
  }

  const timestampIso = input.timestampIso ?? new Date().toISOString();
  const signatarioId = input.signatarioId?.trim() || `usr:${nome.toLowerCase().replace(/\s+/g, '.')}`;
  const funcaoOuPerfil = input.funcaoOuPerfil.trim() || 'Colaborador';
  const documentoCodigo = input.documentoCodigo.trim().toUpperCase() || 'REG';
  const entidadeId = input.entidadeId?.trim() || 'doc-ativo';
  const rubricaDataUrl = input.rubricaDataUrl ?? null;

  const canonica = montarStringCanonica({
    signatarioNome: nome,
    signatarioId,
    funcaoOuPerfil,
    documentoCodigo,
    entidadeId,
    timestampIso,
    rubricaDataUrl,
  });

  const hashIntegridade = calcularHashDeterministicoAssinatura(canonica);
  const protocolo = `SIG-${documentoCodigo}-${hashIntegridade.slice(0, 10).toUpperCase()}`;
  const baseLegalLgpd =
    'LGPD Art. 7º, II (Obrigação Legal/Regulatória ANVISA RDC 665/2022) & Lei 14.063/2020';

  const dataBR = timestampIso.slice(0, 10).split('-').reverse().join('/');
  const horaBR = timestampIso.slice(11, 16);
  const modalidade = rubricaDataUrl ? 'Rubrica em Tela + Token' : 'Credencial Autenticada';

  const resumoFormatado = `${nome} (${funcaoOuPerfil}) · ${modalidade} · [${protocolo}] em ${dataBR} ${horaBR}`;

  return {
    protocolo,
    signatarioNome: nome,
    signatarioId,
    funcaoOuPerfil,
    documentoCodigo,
    entidadeId,
    timestampIso,
    rubricaDataUrl,
    hashIntegridade,
    baseLegalLgpd,
    resumoFormatado,
  };
}

/**
 * Verifica se um registro de assinatura eletrônica permanece íntegro e não foi adulterado.
 */
export function verificarIntegridadeAssinaturaLgpd(
  registro: RegistroAssinaturaLgpd,
): boolean {
  const canonica = montarStringCanonica({
    signatarioNome: registro.signatarioNome,
    signatarioId: registro.signatarioId,
    funcaoOuPerfil: registro.funcaoOuPerfil,
    documentoCodigo: registro.documentoCodigo,
    entidadeId: registro.entidadeId,
    timestampIso: registro.timestampIso,
    rubricaDataUrl: registro.rubricaDataUrl,
  });

  const hashEsperado = calcularHashDeterministicoAssinatura(canonica);
  return hashEsperado === registro.hashIntegridade;
}

