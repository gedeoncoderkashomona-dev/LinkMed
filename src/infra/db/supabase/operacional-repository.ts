import { randomUUID } from 'node:crypto';

import type {
  AvaliacaoEficaciaParticipante,
  FormRecord,
  Nc,
  NcOrigem,
  NcResumo,
  NcSeveridade,
  NcStatus,
  ParticipanteReg008,
  Treinamento,
  TreinamentoTipo,
} from '@/core/domain/entities/operacional';
import type { FormTipo, StatusRegistro } from '@/core/domain/forms/definitions';
import type {
  CreateFormRecordInput,
  CreateNcInput,
  CreateTreinamentoInput,
  ListFormRecordsFilter,
  OperacionalRepository,
  UpdateTreinamentoEficaciaInput,
} from '@/core/repositories/operacional-repository';
import { supabaseAdmin } from './client';

interface FormRecordRow {
  id: string;
  tipo: string;
  subtipo: string | null;
  dados: Record<string, unknown>;
  status: string;
  data_ref: string;
  criado_por: string;
  created_at: string;
  criador?: { nome_completo: string } | null;
}

interface NcRow {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  causa?: string | null;
  acao_imediata?: string | null;
  identificacao_equipamento?: string | null;
  equipamento_nao_se_aplica?: boolean | null;
  elaborado_por?: string | null;
  revisado_por?: string | null;
  aprovado_por?: string | null;
  origem: string;
  severidade: string;
  status: string;
  responsavel_id: string | null;
  criado_por: string;
  created_at: string;
  updated_at: string;
  concluida_em: string | null;
}

interface TreinamentoRow {
  id: string;
  titulo: string;
  tipo: string;
  setor: string;
  instrutor: string | null;
  entidade: string | null;
  carga_horaria: number | string | null;
  data_realizacao: string;
  validade_ate: string | null;
  participantes: string[] | null;
  observacoes: string | null;
  conteudo?: string | null;
  local_treinamento?: string | null;
  horario_inicial?: string | null;
  horario_final?: string | null;
  avaliado_por?: string | null;
  data_avaliacao?: string | null;
  assinatura_avaliador?: string | null;
  avaliacoes_eficacia?: AvaliacaoEficaciaParticipante[] | null;
  elaborado_por?: string | null;
  revisado_por?: string | null;
  aprovado_por?: string | null;
  criado_por: string;
  created_at: string;
  criador?: { nome_completo: string } | null;
}

interface AuditStoreRow<T> {
  id: string;
  usuario_id: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  dados_depois: T;
  created_at: string;
}

const FORM_COLS = '*, criador:users(nome_completo)';

let hasFormRecordsTable: boolean | null = null;
let hasNcsTable: boolean | null = null;
let hasTrainingsTable: boolean | null = null;

const userNamesCache = new Map<string, { nome: string; expiresAt: number }>();

async function fetchUserNamesMap(userIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const now = Date.now();
  const missing: string[] = [];
  for (const id of unique) {
    const cached = userNamesCache.get(id);
    if (cached && cached.expiresAt > now) {
      map.set(id, cached.nome);
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return map;

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, nome_completo')
    .in('id', missing);

  for (const row of (data ?? []) as Array<{ id: string; nome_completo: string }>) {
    map.set(row.id, row.nome_completo);
    userNamesCache.set(row.id, { nome: row.nome_completo, expiresAt: now + 60_000 });
  }
  return map;
}

function toFormRecord(row: FormRecordRow): FormRecord {
  return {
    id: row.id,
    tipo: row.tipo as FormTipo,
    subtipo: row.subtipo,
    dados: row.dados ?? {},
    status: row.status as StatusRegistro,
    dataRef: row.data_ref,
    criadoPor: row.criado_por,
    criadoPorNome: row.criador?.nome_completo ?? null,
    createdAt: new Date(row.created_at),
  };
}

function toNc(row: NcRow): Nc {
  return {
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    descricao: row.descricao,
    causa: row.causa ?? null,
    acaoImediata: row.acao_imediata ?? null,
    identificacaoEquipamento: row.identificacao_equipamento ?? 'Não se aplica',
    equipamentoNaoSeAplica: Boolean(row.equipamento_nao_se_aplica),
    elaboradoPor: row.elaborado_por ?? 'Carlos Menezes (Assistência Técnica)',
    revisadoPor: row.revisado_por ?? 'Vanessa Ribeiro (Qualidade)',
    aprovadoPor: row.aprovado_por ?? 'Pedro Costa (Diretoria)',
    origem: row.origem as NcOrigem,
    severidade: row.severidade as NcSeveridade,
    status: row.status as NcStatus,
    responsavelId: row.responsavel_id,
    criadoPor: row.criado_por,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    concluidaEm: row.concluida_em ? new Date(row.concluida_em) : null,
  };
}

function toTreinamento(row: TreinamentoRow): Treinamento {
  return {
    id: row.id,
    titulo: row.titulo,
    tipo: row.tipo as TreinamentoTipo,
    setor: row.setor,
    instrutor: row.instrutor,
    entidade: row.entidade,
    cargaHoraria: row.carga_horaria === null ? null : Number(row.carga_horaria),
    dataRealizacao: row.data_realizacao,
    validadeAte: row.validade_ate,
    participantes: Array.isArray(row.participantes) ? row.participantes : [],
    observacoes: row.observacoes,
    conteudo: row.conteudo ?? null,
    localTreinamento: row.local_treinamento ?? 'Sala de Treinamento LinkMed',
    horarioInicial: row.horario_inicial ?? '08:30',
    horarioFinal: row.horario_final ?? '12:30',
    avaliadoPor: row.avaliado_por ?? null,
    dataAvaliacao: row.data_avaliacao ?? null,
    assinaturaAvaliador: row.assinatura_avaliador ?? null,
    avaliacoesEficacia: Array.isArray(row.avaliacoes_eficacia) ? row.avaliacoes_eficacia : [],
    elaboradoPor: row.elaborado_por ?? 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: row.revisado_por ?? 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: row.aprovado_por ?? 'Pedro Costa (Diretoria)',
    criadoPor: row.criado_por,
    criadoPorNome: row.criador?.nome_completo ?? null,
    createdAt: new Date(row.created_at),
  };
}

interface StoredFormPayload {
  id: string;
  tipo: FormTipo;
  subtipo: string | null;
  dados: Record<string, unknown>;
  status: StatusRegistro;
  dataRef: string;
  criadoPor: string;
  createdAt: string;
}

interface StoredNcPayload {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  causa: string | null;
  acaoImediata: string | null;
  identificacaoEquipamento: string | null;
  equipamentoNaoSeAplica: boolean;
  elaboradoPor: string | null;
  revisadoPor: string | null;
  aprovadoPor: string | null;
  origem: NcOrigem;
  severidade: NcSeveridade;
  status: NcStatus;
  responsavelId: string | null;
  criadoPor: string;
  createdAt: string;
  updatedAt: string;
  concluidaEm: string | null;
}

interface StoredTrainingPayload {
  id: string;
  titulo: string;
  tipo: TreinamentoTipo;
  setor: string;
  instrutor: string | null;
  entidade: string | null;
  cargaHoraria: number | null;
  dataRealizacao: string;
  validadeAte: string | null;
  participantes: string[];
  participantesDetalhados?: ParticipanteReg008[];
  observacoes: string | null;
  conteudo: string | null;
  localTreinamento: string | null;
  horarioInicial: string | null;
  horarioFinal: string | null;
  avaliadoPor: string | null;
  dataAvaliacao: string | null;
  assinaturaAvaliador: string | null;
  avaliacoesEficacia: AvaliacaoEficaciaParticipante[];
  elaboradoPor: string | null;
  revisadoPor: string | null;
  aprovadoPor: string | null;
  criadoPor: string;
  createdAt: string;
}

export class SupabaseOperacionalRepository implements OperacionalRepository {
  // ----- Formulários -------------------------------------------------------

  async createFormRecord(input: CreateFormRecordInput): Promise<FormRecord> {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('form_records')
      .insert({
        id,
        tipo: input.tipo,
        subtipo: input.subtipo,
        dados: input.dados,
        status: input.status,
        data_ref: input.dataRef,
        criado_por: input.criadoPor,
      })
      .select(FORM_COLS)
      .single();

    if (!error && data) {
      return toFormRecord(data as unknown as FormRecordRow);
    }

    // Fallback resiliente no Supabase PostgreSQL (audit_logs) caso a tabela form_records ainda não esteja no cache
    const payload: StoredFormPayload = {
      id,
      tipo: input.tipo,
      subtipo: input.subtipo,
      dados: input.dados,
      status: input.status,
      dataRef: input.dataRef,
      criadoPor: input.criadoPor,
      createdAt: agora,
    };

    const { error: storeError } = await supabaseAdmin.from('audit_logs').insert({
      id,
      usuario_id: input.criadoPor,
      acao: input.tipo,
      entidade: '__db_form_record__',
      entidade_id: id,
      dados_antes: null,
      dados_depois: payload,
      ip: '127.0.0.1',
      user_agent: 'regulaon-store',
      created_at: agora,
    });

    if (storeError) {
      throw new Error(`Falha ao registrar formulário: ${storeError.message}`);
    }

    const userNames = await fetchUserNamesMap([input.criadoPor]);
    return {
      ...payload,
      criadoPorNome: userNames.get(input.criadoPor) ?? null,
      createdAt: new Date(agora),
    };
  }

  async listFormRecords(filter: ListFormRecordsFilter = {}): Promise<FormRecord[]> {
    if (hasFormRecordsTable !== false) {
      let query = supabaseAdmin
        .from('form_records')
        .select(FORM_COLS)
        .is('deleted_at', null)
        .order('data_ref', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(filter.limit ?? 200);

      if (filter.tipo) query = query.eq('tipo', filter.tipo);
      if (filter.desde) query = query.gte('data_ref', filter.desde);

      const { data, error } = await query;
      if (!error && data) {
        hasFormRecordsTable = true;
        return (data as unknown as FormRecordRow[]).map(toFormRecord);
      }
      if (error?.code === 'PGRST205') {
        hasFormRecordsTable = false;
      }
    }

    // Fallback: consulta registros persistidos em audit_logs (__db_form_record__)
    let storeQuery = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', '__db_form_record__')
      .order('created_at', { ascending: false })
      .limit(filter.limit ?? 200);

    if (filter.tipo) storeQuery = storeQuery.eq('acao', filter.tipo);

    const { data: storeRows } = await storeQuery;
    const rows = (storeRows ?? []) as AuditStoreRow<StoredFormPayload>[];
    const userNames = await fetchUserNamesMap(rows.map((r) => r.usuario_id));

    return rows
      .map((r): FormRecord | null => {
        const p = r.dados_depois;
        if (!p || !p.tipo) return null;
        if (filter.desde && p.dataRef < filter.desde) return null;
        return {
          id: p.id || r.id,
          tipo: p.tipo,
          subtipo: p.subtipo ?? null,
          dados: p.dados ?? {},
          status: p.status ?? 'conforme',
          dataRef: p.dataRef,
          criadoPor: p.criadoPor || r.usuario_id,
          criadoPorNome: userNames.get(p.criadoPor || r.usuario_id) ?? null,
          createdAt: new Date(p.createdAt || r.created_at),
        };
      })
      .filter((x): x is FormRecord => x !== null)
      .sort((a, b) =>
        b.dataRef.localeCompare(a.dataRef) || b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }

  async countFormRecordsPorTipo(
    desde: string,
  ): Promise<Record<string, { total: number; naoConformes: number }>> {
    const records = await this.listFormRecords({ desde, limit: 500 });
    const resumo: Record<string, { total: number; naoConformes: number }> = {};
    for (const row of records) {
      const atual = (resumo[row.tipo] ??= { total: 0, naoConformes: 0 });
      atual.total += 1;
      if (row.status === 'nao_conforme') atual.naoConformes += 1;
    }
    return resumo;
  }

  // ----- Não conformidades -------------------------------------------------

  async createNc(input: CreateNcInput): Promise<Nc> {
    const ano = new Date().getFullYear();
    const id = randomUUID();
    const agora = new Date().toISOString();
    const naoSeAplica = Boolean(input.equipamentoNaoSeAplica);
    const identEquip = naoSeAplica
      ? 'Não se aplica (NC Documental / Processo)'
      : input.identificacaoEquipamento?.trim() || 'Não se aplica';

    const elaboradoPor = input.elaboradoPor?.trim() || 'Carlos Menezes (Assistência Técnica)';
    const revisadoPor = input.revisadoPor?.trim() || 'Vanessa Ribeiro (Gestão da Qualidade)';
    const aprovadoPor = input.aprovadoPor?.trim() || 'Pedro Costa (Diretoria)';

    const existingList = await this.listNcs();
    const codigo = `NC-${ano}-${String(existingList.length + 1).padStart(3, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('ncs')
      .insert({
        id,
        codigo,
        titulo: input.titulo,
        descricao: input.descricao,
        causa: input.causa ?? null,
        acao_imediata: input.acaoImediata ?? null,
        identificacao_equipamento: identEquip,
        equipamento_nao_se_aplica: naoSeAplica,
        elaborado_por: elaboradoPor,
        revisado_por: revisadoPor,
        aprovado_por: aprovadoPor,
        origem: input.origem,
        severidade: input.severidade,
        status: 'aberta',
        responsavel_id: input.responsavelId,
        criado_por: input.criadoPor,
      })
      .select()
      .single();

    if (!error && data) {
      return toNc(data as NcRow);
    }

    const payload: StoredNcPayload = {
      id,
      codigo,
      titulo: input.titulo,
      descricao: input.descricao,
      causa: input.causa ?? null,
      acaoImediata: input.acaoImediata ?? null,
      identificacaoEquipamento: identEquip,
      equipamentoNaoSeAplica: naoSeAplica,
      elaboradoPor,
      revisadoPor,
      aprovadoPor,
      origem: input.origem,
      severidade: input.severidade,
      status: 'aberta',
      responsavelId: input.responsavelId,
      criadoPor: input.criadoPor,
      createdAt: agora,
      updatedAt: agora,
      concluidaEm: null,
    };

    const { error: storeError } = await supabaseAdmin.from('audit_logs').insert({
      id,
      usuario_id: input.criadoPor,
      acao: 'aberta',
      entidade: '__db_nc__',
      entidade_id: id,
      dados_antes: null,
      dados_depois: payload,
      ip: '127.0.0.1',
      user_agent: 'regulaon-store',
      created_at: agora,
    });

    if (storeError) {
      throw new Error(`Falha ao abrir NC: ${storeError.message}`);
    }

    return {
      ...payload,
      createdAt: new Date(agora),
      updatedAt: new Date(agora),
      concluidaEm: null,
    };
  }

  async listNcs(origem?: NcOrigem): Promise<Nc[]> {
    if (hasNcsTable !== false) {
      let query = supabaseAdmin
        .from('ncs')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (origem) query = query.eq('origem', origem);

      const { data, error } = await query;
      if (!error && data) {
        hasNcsTable = true;
        return (data as NcRow[]).map(toNc);
      }
      if (error?.code === 'PGRST205') {
        hasNcsTable = false;
      }
    }

    const { data: storeRows } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', '__db_nc__')
      .order('created_at', { ascending: false });

    const rows = (storeRows ?? []) as AuditStoreRow<StoredNcPayload>[];
    return rows
      .map((r): Nc | null => {
        const p = r.dados_depois;
        if (!p || !p.codigo) return null;
        if (origem && p.origem !== origem) return null;
        return {
          id: p.id || r.id,
          codigo: p.codigo,
          titulo: p.titulo,
          descricao: p.descricao ?? null,
          causa: p.causa ?? null,
          acaoImediata: p.acaoImediata ?? null,
          identificacaoEquipamento: p.identificacaoEquipamento ?? 'Não se aplica',
          equipamentoNaoSeAplica: Boolean(p.equipamentoNaoSeAplica),
          elaboradoPor: p.elaboradoPor ?? 'Carlos Menezes (Assistência Técnica)',
          revisadoPor: p.revisadoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)',
          aprovadoPor: p.aprovadoPor ?? 'Pedro Costa (Diretoria)',
          origem: p.origem,
          severidade: p.severidade,
          status: p.status,
          responsavelId: p.responsavelId ?? null,
          criadoPor: p.criadoPor || r.usuario_id,
          createdAt: new Date(p.createdAt || r.created_at),
          updatedAt: new Date(p.updatedAt || r.created_at),
          concluidaEm: p.concluidaEm ? new Date(p.concluidaEm) : null,
        };
      })
      .filter((x): x is Nc => x !== null);
  }

  async updateNcStatus(id: string, status: NcStatus): Promise<Nc | null> {
    const agora = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('ncs')
      .update({
        status,
        updated_at: agora,
        concluida_em: status === 'concluida' ? agora : null,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (!error && data) {
      return toNc(data as NcRow);
    }

    const { data: storeRow } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', '__db_nc__')
      .eq('id', id)
      .maybeSingle();

    if (!storeRow) return null;
    const row = storeRow as AuditStoreRow<StoredNcPayload>;
    const updatedPayload: StoredNcPayload = {
      ...row.dados_depois,
      status,
      updatedAt: agora,
      concluidaEm: status === 'concluida' ? agora : null,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('audit_logs')
      .update({
        acao: status,
        dados_depois: updatedPayload,
      })
      .eq('id', id);

    if (updateErr) throw new Error(`Falha ao atualizar NC: ${updateErr.message}`);

    return {
      ...updatedPayload,
      createdAt: new Date(updatedPayload.createdAt),
      updatedAt: new Date(updatedPayload.updatedAt),
      concluidaEm: updatedPayload.concluidaEm ? new Date(updatedPayload.concluidaEm) : null,
    };
  }

  async resumoNcs(origem?: NcOrigem): Promise<NcResumo> {
    const lista = await this.listNcs(origem);
    const resumo: NcResumo = { abertas: 0, emAndamento: 0, concluidas: 0, total: 0 };
    for (const row of lista) {
      resumo.total += 1;
      if (row.status === 'aberta') resumo.abertas += 1;
      else if (row.status === 'em_andamento') resumo.emAndamento += 1;
      else if (row.status === 'concluida') resumo.concluidas += 1;
    }
    return resumo;
  }

  // ----- Treinamentos (REG-008) --------------------------------------------

  async createTreinamento(input: CreateTreinamentoInput): Promise<Treinamento> {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const elaboradoPor = input.elaboradoPor?.trim() || 'Vanessa Ribeiro (Gestão da Qualidade)';
    const revisadoPor = input.revisadoPor?.trim() || 'Marina Lopes (Responsável Técnica)';
    const aprovadoPor = input.aprovadoPor?.trim() || 'Pedro Costa (Diretoria)';

    const { data, error } = await supabaseAdmin
      .from('trainings')
      .insert({
        id,
        titulo: input.titulo,
        tipo: input.tipo,
        setor: input.setor,
        instrutor: input.instrutor,
        entidade: input.entidade,
        carga_horaria: input.cargaHoraria,
        data_realizacao: input.dataRealizacao,
        validade_ate: input.validadeAte,
        participantes: input.participantes,
        observacoes: input.observacoes,
        conteudo: input.conteudo ?? null,
        local_treinamento: input.localTreinamento ?? 'Sala de Treinamento LinkMed',
        horario_inicial: input.horarioInicial ?? '08:30',
        horario_final: input.horarioFinal ?? '12:30',
        avaliado_por: input.avaliadoPor ?? null,
        data_avaliacao: input.dataAvaliacao ?? null,
        assinatura_avaliador: input.assinaturaAvaliador ?? null,
        avaliacoes_eficacia: input.avaliacoesEficacia ?? [],
        elaborado_por: elaboradoPor,
        revisado_por: revisadoPor,
        aprovado_por: aprovadoPor,
        criado_por: input.criadoPor,
      })
      .select('*, criador:users(nome_completo)')
      .single();

    if (!error && data) {
      return toTreinamento(data as unknown as TreinamentoRow);
    }

    const payload: StoredTrainingPayload = {
      id,
      titulo: input.titulo,
      tipo: input.tipo,
      setor: input.setor,
      instrutor: input.instrutor,
      entidade: input.entidade,
      cargaHoraria: input.cargaHoraria,
      dataRealizacao: input.dataRealizacao,
      validadeAte: input.validadeAte,
      participantes: input.participantes,
      participantesDetalhados: input.participantesDetalhados ?? [],
      observacoes: input.observacoes,
      conteudo: input.conteudo ?? null,
      localTreinamento: input.localTreinamento ?? 'Sala de Treinamento LinkMed',
      horarioInicial: input.horarioInicial ?? '08:30',
      horarioFinal: input.horarioFinal ?? '12:30',
      avaliadoPor: input.avaliadoPor ?? null,
      dataAvaliacao: input.dataAvaliacao ?? null,
      assinaturaAvaliador: input.assinaturaAvaliador ?? null,
      avaliacoesEficacia: input.avaliacoesEficacia ?? [],
      elaboradoPor,
      revisadoPor,
      aprovadoPor,
      criadoPor: input.criadoPor,
      createdAt: agora,
    };

    const { error: storeError } = await supabaseAdmin.from('audit_logs').insert({
      id,
      usuario_id: input.criadoPor,
      acao: input.tipo,
      entidade: '__db_training__',
      entidade_id: id,
      dados_antes: null,
      dados_depois: payload,
      ip: '127.0.0.1',
      user_agent: 'regulaon-store',
      created_at: agora,
    });

    if (storeError) {
      throw new Error(`Falha ao registrar treinamento: ${storeError.message}`);
    }

    const userNames = await fetchUserNamesMap([input.criadoPor]);
    return {
      ...payload,
      criadoPorNome: userNames.get(input.criadoPor) ?? null,
      createdAt: new Date(agora),
    };
  }

  async listTreinamentos(tipo?: TreinamentoTipo): Promise<Treinamento[]> {
    if (hasTrainingsTable !== false) {
      let query = supabaseAdmin
        .from('trainings')
        .select('*, criador:users(nome_completo)')
        .is('deleted_at', null)
        .order('data_realizacao', { ascending: false });
      if (tipo) query = query.eq('tipo', tipo);

      const { data, error } = await query;
      if (!error && data) {
        hasTrainingsTable = true;
        return (data as unknown as TreinamentoRow[]).map(toTreinamento);
      }
      if (error?.code === 'PGRST205') {
        hasTrainingsTable = false;
      }
    }

    let storeQuery = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', '__db_training__')
      .order('created_at', { ascending: false });
    if (tipo) storeQuery = storeQuery.eq('acao', tipo);

    const { data: storeRows } = await storeQuery;
    const rows = (storeRows ?? []) as AuditStoreRow<StoredTrainingPayload>[];
    const userNames = await fetchUserNamesMap(rows.map((r) => r.usuario_id));

    return rows
      .map((r): Treinamento | null => {
        const p = r.dados_depois;
        if (!p || !p.titulo) return null;
        return {
          id: p.id || r.id,
          titulo: p.titulo,
          tipo: p.tipo,
          setor: p.setor || 'assistencia_tecnica',
          instrutor: p.instrutor ?? null,
          entidade: p.entidade ?? null,
          cargaHoraria: p.cargaHoraria ?? null,
          dataRealizacao: p.dataRealizacao,
          validadeAte: p.validadeAte ?? null,
          participantes: Array.isArray(p.participantes) ? p.participantes : [],
          participantesDetalhados: Array.isArray(p.participantesDetalhados)
            ? p.participantesDetalhados
            : [],
          observacoes: p.observacoes ?? null,
          conteudo: p.conteudo ?? null,
          localTreinamento: p.localTreinamento ?? 'Sala de Treinamento LinkMed',
          horarioInicial: p.horarioInicial ?? '08:30',
          horarioFinal: p.horarioFinal ?? '12:30',
          avaliadoPor: p.avaliadoPor ?? null,
          dataAvaliacao: p.dataAvaliacao ?? null,
          assinaturaAvaliador: p.assinaturaAvaliador ?? null,
          avaliacoesEficacia: Array.isArray(p.avaliacoesEficacia) ? p.avaliacoesEficacia : [],
          elaboradoPor: p.elaboradoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)',
          revisadoPor: p.revisadoPor ?? 'Marina Lopes (Responsável Técnica)',
          aprovadoPor: p.aprovadoPor ?? 'Pedro Costa (Diretoria)',
          criadoPor: p.criadoPor || r.usuario_id,
          criadoPorNome: userNames.get(p.criadoPor || r.usuario_id) ?? null,
          createdAt: new Date(p.createdAt || r.created_at),
        };
      })
      .filter((x): x is Treinamento => x !== null)
      .sort((a, b) => b.dataRealizacao.localeCompare(a.dataRealizacao));
  }

  async updateTreinamentoEficacia(
    input: UpdateTreinamentoEficaciaInput,
  ): Promise<Treinamento | null> {
    const { data, error } = await supabaseAdmin
      .from('trainings')
      .update({
        avaliado_por: input.avaliadoPor,
        data_avaliacao: input.dataAvaliacao,
        assinatura_avaliador: input.assinaturaAvaliador,
        avaliacoes_eficacia: input.avaliacoesEficacia,
      })
      .eq('id', input.id)
      .select('*, criador:users(nome_completo)')
      .maybeSingle();

    if (!error && data) {
      return toTreinamento(data as unknown as TreinamentoRow);
    }

    const { data: storeRow } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('entidade', '__db_training__')
      .eq('id', input.id)
      .maybeSingle();

    if (!storeRow) return null;
    const row = storeRow as AuditStoreRow<StoredTrainingPayload>;
    const updatedPayload: StoredTrainingPayload = {
      ...row.dados_depois,
      avaliadoPor: input.avaliadoPor,
      dataAvaliacao: input.dataAvaliacao,
      assinaturaAvaliador: input.assinaturaAvaliador,
      avaliacoesEficacia: input.avaliacoesEficacia,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('audit_logs')
      .update({ dados_depois: updatedPayload })
      .eq('id', input.id);

    if (updateErr) {
      throw new Error(`Falha ao salvar avaliação de eficácia: ${updateErr.message}`);
    }

    const userNames = await fetchUserNamesMap([row.usuario_id]);
    return {
      ...updatedPayload,
      criadoPorNome: userNames.get(row.usuario_id) ?? null,
      createdAt: new Date(updatedPayload.createdAt || row.created_at),
    };
  }
}
