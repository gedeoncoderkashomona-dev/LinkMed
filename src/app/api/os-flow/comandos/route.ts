import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ValidationError } from '@/core/domain/errors';
import type { Comando } from '@/core/domain/os-v4/nucleo';
import { getRepositories } from '@/infra/db';
import {
  carregarOsV4PorNumero,
  executarComandoOsV4,
} from '@/infra/db/supabase/os-v4-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';
import { mapRecusadoParaAppError } from '@/lib/http/os-v4-error';

export const runtime = 'nodejs';

const comandoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('ACAO'),
    acao: z.string().min(1),
    valor: z.boolean().optional(),
    campos: z.record(z.string()).optional(),
  }),
  z.object({
    tipo: z.enum(['CANCELAR', 'REABRIR', 'CORRIGIR']),
    motivo: z.string(),
  }),
  z.object({
    tipo: z.literal('ESTORNAR'),
    paraNo: z.string().min(1),
    motivo: z.string(),
  }),
]);

const bodySchema = z.object({
  numeroOs: z.string().min(1, 'Informe o número da OS.'),
  versaoVista: z.number().int().min(0),
  comando: comandoSchema,
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const parsed = bodySchema.parse(await req.json());

  const { userRepository, auditService } = getRepositories();
  const usuario = await userRepository.findById(auth.sub).catch(() => null);
  const usuarioNome = usuario?.nomeCompleto ?? 'Colaborador';
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  try {
    const resultado = await executarComandoOsV4({
      numeroOs: parsed.numeroOs,
      comando: parsed.comando as Comando,
      perfilSistema: auth.perfil,
      usuarioId: auth.sub,
      usuarioNome,
      versaoVista: parsed.versaoVista,
      ip,
      userAgent,
    });

    const auditAction =
      `os_v4.${parsed.comando.tipo.toLowerCase()}` as
        | 'os_v4.acao'
        | 'os_v4.cancelar'
        | 'os_v4.reabrir'
        | 'os_v4.corrigir'
        | 'os_v4.estornar';

    await auditService
      .registrar(
        { usuarioId: auth.sub, ip, userAgent },
        auditAction,
        'OS',
        resultado.meta.numeroOs,
        { versaoAnterior: parsed.versaoVista },
        {
          no: resultado.estado.no,
          etiqueta: resultado.estado.etiqueta,
          versao: resultado.estado.versao,
          comando: parsed.comando,
        },
      )
      .catch(() => undefined);

    return {
      os: resultado.fluxoState,
      estado: resultado.estado,
      eventos: resultado.eventos,
      notificacoes: resultado.notificacoes,
    };
  } catch (err) {
    const atual = await carregarOsV4PorNumero(parsed.numeroOs).catch(() => null);
    if (err instanceof Error && err.name === 'Recusado') {
      mapRecusadoParaAppError(err, { versaoAtual: atual?.estado.versao });
    }
    throw err instanceof ValidationError ? err : err;
  }
});
