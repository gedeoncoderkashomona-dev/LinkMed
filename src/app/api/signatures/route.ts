import type { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  gerarAssinaturaEletronicaLgpd,
  verificarIntegridadeAssinaturaLgpd,
  type RegistroAssinaturaLgpd,
} from '@/core/domain/signatures/electronic-signature';
import { supabaseAdmin } from '@/infra/db/supabase/client';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { ValidationError } from '@/core/domain/errors';

export const runtime = 'nodejs';

const signatureInputSchema = z.object({
  signatarioNome: z.string().min(2),
  signatarioId: z.string().optional(),
  funcaoOuPerfil: z.string().min(1),
  documentoCodigo: z.string().min(1),
  entidadeId: z.string().optional(),
  rubricaDataUrl: z.string().nullable().optional(),
  aceiteTermoLgpd: z.boolean().default(true),
  protocolo: z.string().optional(),
  hashIntegridade: z.string().optional(),
  timestampIso: z.string().optional(),
  baseLegalLgpd: z.string().optional(),
  resumoFormatado: z.string().optional(),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const doc = req.nextUrl.searchParams.get('documentoCodigo');
  const entidade = req.nextUrl.searchParams.get('entidadeId');

  // 1) Tentar tabela nativa
  let query = supabaseAdmin.from('assinaturas_eletronicas').select('*');
  if (doc) query = query.eq('documento_codigo', doc.toUpperCase());
  if (entidade) query = query.eq('entidade_id', entidade);

  const { data: directData, error: directError } = await query.order('created_at', {
    ascending: false,
  });

  if (!directError && Array.isArray(directData)) {
    return { assinaturas: directData };
  }

  // 2) Fallback resiliente no audit_logs (PostgreSQL)
  let auditQuery = supabaseAdmin
    .from('audit_logs')
    .select('dados_depois, created_at')
    .eq('entidade', '__db_assinatura_eletronica__');

  const { data: auditData } = await auditQuery.order('created_at', { ascending: false }).limit(200);

  const list: RegistroAssinaturaLgpd[] = [];
  for (const row of auditData ?? []) {
    const item = row.dados_depois as unknown as RegistroAssinaturaLgpd;
    if (item && item.protocolo) {
      if (doc && item.documentoCodigo?.toUpperCase() !== doc.toUpperCase()) continue;
      if (entidade && item.entidadeId !== entidade) continue;
      list.push(item);
    }
  }

  return { assinaturas: list };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = signatureInputSchema.parse(await req.json());

  // Gera o registro e o selo criptográfico determinístico
  let registro: RegistroAssinaturaLgpd;
  if (body.hashIntegridade && body.protocolo) {
    registro = {
      protocolo: body.protocolo,
      signatarioNome: body.signatarioNome,
      signatarioId: body.signatarioId || auth.sub,
      funcaoOuPerfil: body.funcaoOuPerfil,
      documentoCodigo: body.documentoCodigo,
      entidadeId: body.entidadeId || 'doc-geral',
      timestampIso: body.timestampIso || new Date().toISOString(),
      rubricaDataUrl: body.rubricaDataUrl ?? null,
      hashIntegridade: body.hashIntegridade,
      baseLegalLgpd:
        body.baseLegalLgpd ||
        'LGPD Art. 7º, II (Obrigação Legal/Regulatória ANVISA RDC 665/2022) & Lei 14.063/2020',
      resumoFormatado: body.resumoFormatado || '',
    };
  } else {
    registro = gerarAssinaturaEletronicaLgpd({
      signatarioNome: body.signatarioNome,
      signatarioId: body.signatarioId || auth.sub,
      funcaoOuPerfil: body.funcaoOuPerfil,
      documentoCodigo: body.documentoCodigo,
      entidadeId: body.entidadeId || 'doc-geral',
      rubricaDataUrl: body.rubricaDataUrl ?? null,
      aceiteTermoLgpd: body.aceiteTermoLgpd,
    });
  }

  // Validação estrita de integridade
  if (!verificarIntegridadeAssinaturaLgpd(registro)) {
    throw new ValidationError('Assinatura eletrônica corrompida ou hash de integridade inválido.');
  }

  const agoraIso = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent') ?? 'browser';

  // 1) Tenta salvar na tabela dedicada assinaturas_eletronicas
  const { error: directError } = await supabaseAdmin.from('assinaturas_eletronicas').insert({
    protocolo: registro.protocolo,
    documento_codigo: registro.documentoCodigo,
    entidade_id: registro.entidadeId,
    usuario_id: auth.sub,
    signatario_nome: registro.signatarioNome,
    funcao: registro.funcaoOuPerfil,
    conteudo_hash: registro.hashIntegridade,
    rubrica_hash: registro.hashIntegridade.slice(0, 32),
    rubrica_png: registro.rubricaDataUrl,
    hmac: registro.hashIntegridade,
    assinado_em: registro.timestampIso,
    ip,
    user_agent: userAgent,
    base_legal: registro.baseLegalLgpd,
    created_at: agoraIso,
  });

  // 2) Armazenamento resiliente e trilha imutável no audit_logs
  await supabaseAdmin.from('audit_logs').insert({
    usuario_id: auth.sub,
    acao: 'assinatura.criar',
    entidade: '__db_assinatura_eletronica__',
    entidade_id: registro.protocolo,
    dados_antes: null,
    dados_depois: registro,
    ip,
    user_agent: userAgent,
    created_at: agoraIso,
  });

  return { registro, gravado: true, directTableOk: !directError };
});
