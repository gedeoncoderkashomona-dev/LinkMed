import { normalizarNumeroOs, type OrdemServicoFluxoState } from '@/core/domain/forms/os-workflow';
import { supabaseAdmin } from './client';

let hasOsFluxoTableCache: boolean | null = null;

function isMissingTableErr(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    String(err.message ?? '').includes('schema cache')
  );
}

/**
 * Carrega o estado oficial da OS (`os_fluxo`) a partir da tabela dedicada
 * ou do fallback resiliente em `audit_logs` (`__db_os_fluxo__`).
 */
export async function carregarOsFluxoPorNumero(
  numeroOs: string,
): Promise<OrdemServicoFluxoState | null> {
  const norm = normalizarNumeroOs(numeroOs);
  if (!norm) return null;

  if (hasOsFluxoTableCache !== false) {
    const { data: directData, error: directError } = await supabaseAdmin
      .from('os_fluxo')
      .select('estado')
      .eq('numero_os_normalizado', norm)
      .maybeSingle();
    if (!directError) {
      hasOsFluxoTableCache = true;
      if (directData?.estado) {
        return directData.estado as OrdemServicoFluxoState;
      }
    } else if (isMissingTableErr(directError)) {
      hasOsFluxoTableCache = false;
    }
  }

  const { data: auditData } = await supabaseAdmin
    .from('audit_logs')
    .select('dados_depois')
    .eq('entidade', '__db_os_fluxo__')
    .eq('entidade_id', norm)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (auditData?.dados_depois as OrdemServicoFluxoState | undefined) ?? null;
}

/**
 * Persiste o estado oficial da OS na tabela `os_fluxo` (e fallback em `audit_logs`)
 * de forma atômica junto às operações do backend.
 */
export async function persistirOsFluxoNoServidor(params: {
  estado: OrdemServicoFluxoState;
  usuarioId: string;
  ip?: string;
  userAgent?: string | null;
  acao?: string;
  createdAt?: string;
}): Promise<{ directTableOk: boolean; numeroOs: string }> {
  const {
    estado,
    usuarioId,
    ip = '127.0.0.1',
    userAgent = null,
    acao = 'os_fluxo.save',
    createdAt = new Date().toISOString(),
  } = params;
  const norm = normalizarNumeroOs(estado.numeroOs);

  let directTableOk = false;
  if (hasOsFluxoTableCache !== false) {
    const { error: upsertErr } = await supabaseAdmin
      .from('os_fluxo')
      .upsert(
        {
          numero_os_normalizado: norm,
          numero_os: estado.numeroOs.trim(),
          estado,
          criado_por: usuarioId,
          updated_at: createdAt,
        },
        { onConflict: 'numero_os_normalizado' },
      );

    if (!upsertErr) {
      hasOsFluxoTableCache = true;
      directTableOk = true;
    } else if (isMissingTableErr(upsertErr)) {
      hasOsFluxoTableCache = false;
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    usuario_id: usuarioId,
    acao,
    entidade: '__db_os_fluxo__',
    entidade_id: norm,
    dados_antes: null,
    dados_depois: estado,
    ip,
    user_agent: userAgent,
    created_at: createdAt,
  });

  return { directTableOk, numeroOs: estado.numeroOs.trim() };
}
