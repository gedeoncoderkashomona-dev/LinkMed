import { normalizarNumeroOs, type OrdemServicoFluxoState } from '@/core/domain/forms/os-workflow';
import { supabaseAdmin } from './client';

/**
 * Carrega o estado oficial da OS (`os_fluxo`) a partir da tabela dedicada
 * ou do fallback resiliente em `audit_logs` (`__db_os_fluxo__`).
 */
export async function carregarOsFluxoPorNumero(
  numeroOs: string,
): Promise<OrdemServicoFluxoState | null> {
  const norm = normalizarNumeroOs(numeroOs);
  if (!norm) return null;

  const { data: directData, error: directError } = await supabaseAdmin
    .from('os_fluxo')
    .select('estado')
    .eq('numero_os_normalizado', norm)
    .maybeSingle();
  if (!directError && directData?.estado) {
    return directData.estado as OrdemServicoFluxoState;
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
