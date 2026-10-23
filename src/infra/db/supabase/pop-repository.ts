import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@/core/domain/errors';
import type {
  Pop,
  PopVersion,
  PopReadConfirmation,
  PopChangeRequest,
  PopWithDetails,
} from '@/core/domain/entities/pop';
import { SETOR_SIGLA, type Setor } from '@/core/domain/enums/pop';
import type {
  CreatePopInput,
  CreatePopVersionInput,
  ListPopsFilter,
  PopRepository,
  UpdatePopInput,
} from '@/core/repositories/pop-repository';
import { supabaseAdmin } from './client';

interface PopRow {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  setor: string;
  versao_atual: number;
  periodicidade_revisao_meses: number;
  status: string;
  criado_por: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  elaborado_por?: string | null;
  revisado_por?: string | null;
  aprovado_por_nome?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface PopMetaPayload {
  elaboradoPor?: string | null;
  revisadoPor?: string | null;
  aprovadoPorNome?: string | null;
}

interface PopVersionRow {
  id: string;
  pop_id: string;
  numero_versao: number;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tamanho: number;
  hash_arquivo: string;
  status: string;
  publicado_em: string | null;
  criado_por: string;
  created_at: string;
  deleted_at: string | null;
}

interface PopReadConfirmationRow {
  id: string;
  pop_version_id: string;
  user_id: string;
  confirmado_em: string;
}

interface PopChangeRequestRow {
  id: string;
  pop_id: string;
  solicitante_id: string;
  descricao: string;
  status: string;
  respondido_por: string | null;
  resposta: string | null;
  respondido_em: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function defaultResponsaveisPorSetor(setor: string): {
  elaboradoPor: string;
  revisadoPor: string;
  aprovadoPorNome: string;
} {
  if (setor === 'tecnico' || setor === 'tecnica') {
    return {
      elaboradoPor: 'Carlos Menezes (Líder Técnico)',
      revisadoPor: 'Marina Lopes (Responsável Técnica)',
      aprovadoPorNome: 'Pedro Costa (Diretoria)',
    };
  }
  if (setor === 'estoque') {
    return {
      elaboradoPor: 'João Silva (Almoxarifado / Expedição)',
      revisadoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
      aprovadoPorNome: 'Pedro Costa (Diretoria)',
    };
  }
  return {
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPorNome: 'Pedro Costa (Diretoria)',
  };
}

function normalizarSetor(setor: string): Setor {
  if (setor === 'tecnico') return 'tecnica';
  return setor as Setor;
}

function toPopEntity(row: PopRow, meta?: PopMetaPayload): Pop {
  const defaults = defaultResponsaveisPorSetor(row.setor);
  return {
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    descricao: row.descricao,
    setor: normalizarSetor(row.setor),
    versaoAtual: row.versao_atual,
    periodicidadeRevisaoMeses: row.periodicidade_revisao_meses,
    status: row.status as any,
    criadoPor: row.criado_por,
    aprovadoPor: row.aprovado_por,
    aprovadoEm: row.aprovado_em ? new Date(row.aprovado_em) : null,
    elaboradoPor: meta?.elaboradoPor || row.elaborado_por || defaults.elaboradoPor,
    revisadoPor: meta?.revisadoPor || row.revisado_por || defaults.revisadoPor,
    aprovadoPorNome:
      meta?.aprovadoPorNome || row.aprovado_por_nome || defaults.aprovadoPorNome,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

function toVersionEntity(row: PopVersionRow): PopVersion {
  return {
    id: row.id,
    popId: row.pop_id,
    numeroVersao: row.numero_versao,
    arquivoUrl: row.arquivo_url,
    arquivoNome: row.arquivo_nome,
    arquivoTamanho: Number(row.arquivo_tamanho),
    hashArquivo: row.hash_arquivo,
    status: row.status as any,
    publicadoEm: row.publicado_em ? new Date(row.publicado_em) : null,
    criadoPor: row.criado_por,
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

function toReadConfirmationEntity(row: PopReadConfirmationRow): PopReadConfirmation {
  return {
    id: row.id,
    popVersionId: row.pop_version_id,
    userId: row.user_id,
    confirmadoEm: new Date(row.confirmado_em),
  };
}

function toChangeRequestEntity(row: PopChangeRequestRow): PopChangeRequest {
  return {
    id: row.id,
    popId: row.pop_id,
    solicitanteId: row.solicitante_id,
    descricao: row.descricao,
    status: row.status as any,
    respondidoPor: row.respondido_por,
    resposta: row.resposta,
    respondidoEm: row.respondido_em ? new Date(row.respondido_em) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

async function fetchPopMetas(popIds: string[]): Promise<Map<string, PopMetaPayload>> {
  const map = new Map<string, PopMetaPayload>();
  if (popIds.length === 0) return map;
  const { data } = await supabaseAdmin
    .from('audit_logs')
    .select('entidade_id, dados_depois, created_at')
    .eq('entidade', '__db_pop_meta__')
    .in('entidade_id', popIds)
    .order('created_at', { ascending: true });

  for (const row of (data ?? []) as Array<{
    entidade_id: string;
    dados_depois: PopMetaPayload | null;
  }>) {
    if (row.dados_depois) {
      map.set(row.entidade_id, row.dados_depois);
    }
  }
  return map;
}

async function savePopMeta(popId: string, usuarioId: string, meta: PopMetaPayload): Promise<void> {
  const metaLogId = String(popId).replace(/^.{8}/, '30000000');
  await supabaseAdmin.from('audit_logs').upsert(
    {
      id: metaLogId,
      usuario_id: usuarioId,
      acao: 'POP_META_UPSERT',
      entidade: '__db_pop_meta__',
      entidade_id: popId,
      dados_antes: null,
      dados_depois: meta,
      ip: '127.0.0.1',
      user_agent: 'system',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

export class SupabasePopRepository implements PopRepository {
  async findById(id: string): Promise<Pop | null> {
    const { data, error } = await supabaseAdmin
      .from('pops')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    const metas = await fetchPopMetas([id]);
    return toPopEntity(data as PopRow, metas.get(id));
  }

  async findByCodigo(codigo: string): Promise<Pop | null> {
    const { data, error } = await supabaseAdmin
      .from('pops')
      .select('*')
      .eq('codigo', codigo)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as PopRow;
    const metas = await fetchPopMetas([row.id]);
    return toPopEntity(row, metas.get(row.id));
  }

  async list(filter?: ListPopsFilter): Promise<Pop[]> {
    let query = supabaseAdmin
      .from('pops')
      .select('*')
      .is('deleted_at', null)
      .order('codigo', { ascending: true });

    if (filter?.setor) {
      if (filter.setor === 'tecnica') {
        query = query.in('setor', ['tecnica', 'tecnico']);
      } else {
        query = query.eq('setor', filter.setor);
      }
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.search) {
      const q = filter.search.trim();
      query = query.or(`titulo.ilike.%${q}%,codigo.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    const rows = data as PopRow[];
    const metas = await fetchPopMetas(rows.map((r) => r.id));
    return rows.map((r) => toPopEntity(r, metas.get(r.id)));
  }

  async listWithDetails(filter?: ListPopsFilter): Promise<PopWithDetails[]> {
    const pops = await this.list(filter);
    if (pops.length === 0) return [];

    const popIds = pops.map((p) => p.id);

    const [{ data: versionRows }, { count: targetUsersCount }] = await Promise.all([
      supabaseAdmin
        .from('pop_versions')
        .select('*')
        .in('pop_id', popIds)
        .is('deleted_at', null)
        .order('numero_versao', { ascending: false }),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ativo')
        .neq('perfil', 'diretor')
        .is('deleted_at', null),
    ]);

    const versionsByPop = new Map<string, PopVersion[]>();
    const vigenteByPop = new Map<string, PopVersion>();
    const vigenteIds: string[] = [];

    for (const row of (versionRows ?? []) as PopVersionRow[]) {
      const entity = toVersionEntity(row);
      const list = versionsByPop.get(entity.popId);
      if (list) list.push(entity);
      else versionsByPop.set(entity.popId, [entity]);

      if (entity.status === 'vigente' && !vigenteByPop.has(entity.popId)) {
        vigenteByPop.set(entity.popId, entity);
        vigenteIds.push(entity.id);
      }
    }

    const confirmCountByVersion = new Map<string, number>();
    if (vigenteIds.length > 0) {
      const { data: confirmRows } = await supabaseAdmin
        .from('pop_read_confirmations')
        .select('pop_version_id')
        .in('pop_version_id', vigenteIds);

      for (const row of (confirmRows ?? []) as { pop_version_id: string }[]) {
        confirmCountByVersion.set(
          row.pop_version_id,
          (confirmCountByVersion.get(row.pop_version_id) ?? 0) + 1,
        );
      }
    }

    const totalAlvo = targetUsersCount ?? 0;

    return pops.map((pop) => {
      const vigente = vigenteByPop.get(pop.id) ?? null;
      const versions = versionsByPop.get(pop.id) ?? [];
      const totalConfirmacoes = vigente ? (confirmCountByVersion.get(vigente.id) ?? 0) : 0;
      const totalPendentes =
        vigente && pop.status === 'publicado'
          ? Math.max(0, totalAlvo - totalConfirmacoes)
          : 0;

      return {
        ...pop,
        versaoVigente: vigente,
        totalVersoes: versions.length,
        totalConfirmacoes,
        totalPendentes,
      };
    });
  }

  async create(input: CreatePopInput): Promise<Pop> {
    if (await this.findByCodigo(input.codigo)) {
      throw new ConflictError(`Já existe um POP com o código ${input.codigo}.`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const defaults = defaultResponsaveisPorSetor(input.setor);
    const meta: PopMetaPayload = {
      elaboradoPor: input.elaboradoPor?.trim() || defaults.elaboradoPor,
      revisadoPor: input.revisadoPor?.trim() || defaults.revisadoPor,
      aprovadoPorNome: input.aprovadoPorNome?.trim() || defaults.aprovadoPorNome,
    };

    const row = {
      id,
      codigo: input.codigo,
      titulo: input.titulo.trim(),
      descricao: input.descricao?.trim() ?? null,
      setor: input.setor,
      versao_atual: 1,
      periodicidade_revisao_meses: input.periodicidadeRevisaoMeses ?? 24,
      status: 'rascunho',
      criado_por: input.criadoPor,
      aprovado_por: null,
      aprovado_em: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    const { data, error } = await supabaseAdmin
      .from('pops')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao criar POP no Supabase: ${error.message}`);
    }

    await savePopMeta(id, input.criadoPor, meta);

    return toPopEntity(data as PopRow, meta);
  }

  async update(id: string, input: UpdatePopInput): Promise<Pop> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.titulo !== undefined) updateData.titulo = input.titulo.trim();
    if (input.descricao !== undefined) updateData.descricao = input.descricao?.trim() ?? null;
    if (input.periodicidadeRevisaoMeses !== undefined)
      updateData.periodicidade_revisao_meses = input.periodicidadeRevisaoMeses;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.aprovadoPor !== undefined) updateData.aprovado_por = input.aprovadoPor;
    if (input.aprovadoEm !== undefined)
      updateData.aprovado_em = input.aprovadoEm ? input.aprovadoEm.toISOString() : null;
    if (input.versaoAtual !== undefined) updateData.versao_atual = input.versaoAtual;

    const { data, error } = await supabaseAdmin
      .from('pops')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar POP no Supabase: ${error.message}`);
    }

    const row = data as PopRow;
    const metas = await fetchPopMetas([id]);
    const currentMeta = metas.get(id) ?? {};
    if (
      input.elaboradoPor !== undefined ||
      input.revisadoPor !== undefined ||
      input.aprovadoPorNome !== undefined
    ) {
      const nextMeta: PopMetaPayload = {
        elaboradoPor: input.elaboradoPor ?? currentMeta.elaboradoPor,
        revisadoPor: input.revisadoPor ?? currentMeta.revisadoPor,
        aprovadoPorNome: input.aprovadoPorNome ?? currentMeta.aprovadoPorNome,
      };
      await savePopMeta(id, row.criado_por, nextMeta);
      return toPopEntity(row, nextMeta);
    }

    return toPopEntity(row, currentMeta);
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pops')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Falha ao excluir POP no Supabase: ${error.message}`);
    }
  }

  async nextSequentialCode(setor: Setor): Promise<string> {
    const sigla = SETOR_SIGLA[setor];
    const prefix = `POP-${sigla}-`;

    const { data } = await supabaseAdmin
      .from('pops')
      .select('codigo')
      .ilike('codigo', `${prefix}%`)
      .is('deleted_at', null);

    let max = 0;
    if (data) {
      for (const row of data as { codigo: string }[]) {
        const num = parseInt(row.codigo.slice(prefix.length), 10);
        if (!Number.isNaN(num) && num > max) max = num;
      }
    }

    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  async findVersionById(id: string): Promise<PopVersion | null> {
    const { data, error } = await supabaseAdmin
      .from('pop_versions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    return toVersionEntity(data as PopVersionRow);
  }

  async findVersaoVigente(popId: string): Promise<PopVersion | null> {
    const { data, error } = await supabaseAdmin
      .from('pop_versions')
      .select('*')
      .eq('pop_id', popId)
      .eq('status', 'vigente')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    return toVersionEntity(data as PopVersionRow);
  }

  async listVersions(popId: string): Promise<PopVersion[]> {
    const { data, error } = await supabaseAdmin
      .from('pop_versions')
      .select('*')
      .eq('pop_id', popId)
      .is('deleted_at', null)
      .order('numero_versao', { ascending: false });

    if (error || !data) return [];
    return (data as PopVersionRow[]).map(toVersionEntity);
  }

  async createVersion(input: CreatePopVersionInput): Promise<PopVersion> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      pop_id: input.popId,
      numero_versao: input.numeroVersao,
      arquivo_url: input.arquivoUrl,
      arquivo_nome: input.arquivoNome,
      arquivo_tamanho: input.arquivoTamanho,
      hash_arquivo: input.hashArquivo,
      status: 'vigente',
      publicado_em: null,
      criado_por: input.criadoPor,
      created_at: now,
      deleted_at: null,
    };

    const { data, error } = await supabaseAdmin
      .from('pop_versions')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao criar versão de POP no Supabase: ${error.message}`);
    }

    return toVersionEntity(data as PopVersionRow);
  }

  async markVersionObsolete(versionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pop_versions')
      .update({ status: 'obsoleta' })
      .eq('id', versionId);

    if (error) {
      throw new Error(`Falha ao tornar versão obsoleta: ${error.message}`);
    }
  }

  async publishVersion(versionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pop_versions')
      .update({ publicado_em: new Date().toISOString() })
      .eq('id', versionId);

    if (error) {
      throw new Error(`Falha ao publicar versão: ${error.message}`);
    }
  }

  async countConfirmations(versionId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('pop_read_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('pop_version_id', versionId);

    if (error) return 0;
    return count ?? 0;
  }

  async hasConfirmed(versionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('pop_read_confirmations')
      .select('id')
      .eq('pop_version_id', versionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return false;
    return true;
  }

  async confirmRead(versionId: string, userId: string): Promise<PopReadConfirmation> {
    if (await this.hasConfirmed(versionId, userId)) {
      throw new ConflictError('Leitura já confirmada para esta versão.');
    }

    const id = randomUUID();
    const row = {
      id,
      pop_version_id: versionId,
      user_id: userId,
      confirmado_em: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('pop_read_confirmations')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao confirmar leitura no Supabase: ${error.message}`);
    }

    return toReadConfirmationEntity(data as PopReadConfirmationRow);
  }

  async listConfirmations(versionId: string): Promise<PopReadConfirmation[]> {
    const { data, error } = await supabaseAdmin
      .from('pop_read_confirmations')
      .select('*')
      .eq('pop_version_id', versionId);

    if (error || !data) return [];
    return (data as PopReadConfirmationRow[]).map(toReadConfirmationEntity);
  }

  async createChangeRequest(input: {
    popId: string;
    solicitanteId: string;
    descricao: string;
  }): Promise<PopChangeRequest> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      pop_id: input.popId,
      solicitante_id: input.solicitanteId,
      descricao: input.descricao.trim(),
      status: 'pendente',
      respondido_por: null,
      resposta: null,
      respondido_em: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    const { data, error } = await supabaseAdmin
      .from('pop_change_requests')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao criar sugestão de alteração: ${error.message}`);
    }

    return toChangeRequestEntity(data as PopChangeRequestRow);
  }

  async listChangeRequests(popId: string): Promise<PopChangeRequest[]> {
    const { data, error } = await supabaseAdmin
      .from('pop_change_requests')
      .select('*')
      .eq('pop_id', popId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as PopChangeRequestRow[]).map(toChangeRequestEntity);
  }

  async findChangeRequestById(id: string): Promise<PopChangeRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('pop_change_requests')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    return toChangeRequestEntity(data as PopChangeRequestRow);
  }

  async updateChangeRequest(
    id: string,
    input: {
      status?: PopChangeRequest['status'];
      respondidoPor?: string;
      resposta?: string;
      respondidoEm?: Date;
    },
  ): Promise<PopChangeRequest> {
    const existing = await this.findChangeRequestById(id);
    if (!existing) throw new NotFoundError('Sugestão de alteração não encontrada.');

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.respondidoPor !== undefined) updateData.respondido_por = input.respondidoPor;
    if (input.resposta !== undefined) updateData.resposta = input.resposta;
    if (input.respondidoEm !== undefined)
      updateData.respondido_em = input.respondidoEm ? input.respondidoEm.toISOString() : null;

    const { data, error } = await supabaseAdmin
      .from('pop_change_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar sugestão: ${error.message}`);
    }

    return toChangeRequestEntity(data as PopChangeRequestRow);
  }
}
