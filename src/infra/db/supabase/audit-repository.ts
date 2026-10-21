import { randomUUID } from 'node:crypto';
import type { AuditLog } from '@/core/domain/entities/audit-log';
import type {
  AuditRepository,
  CreateAuditLogInput,
} from '@/core/repositories/audit-repository';
import { supabaseAdmin } from './client';

interface AuditLogRow {
  id: string;
  usuario_id: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  dados_antes: unknown;
  dados_depois: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

function toEntity(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    acao: row.acao as any,
    entidade: row.entidade,
    entidadeId: row.entidade_id,
    dadosAntes: row.dados_antes,
    dadosDepois: row.dados_depois,
    ip: row.ip ?? null,
    userAgent: row.user_agent ?? null,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseAuditRepository implements AuditRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const id = randomUUID();
    const row = {
      id,
      usuario_id: input.usuarioId,
      acao: input.acao,
      entidade: input.entidade,
      entidade_id: input.entidadeId,
      dados_antes: input.dadosAntes ?? null,
      dados_depois: input.dadosDepois ?? null,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao registrar log de auditoria no Supabase: ${error.message}`);
    }

    return toEntity(data as AuditLogRow);
  }

  async list(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .not('entidade', 'like', '__db_%')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as AuditLogRow[]).map(toEntity);
  }

  async listByEntity(entidade: string, entidadeId: string): Promise<AuditLog[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', entidade)
      .eq('entidade_id', entidadeId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as AuditLogRow[]).map(toEntity);
  }
}
