import { randomUUID } from 'node:crypto';

import type {
  FormRecord,
  Nc,
  NcOrigem,
  NcResumo,
  NcSeveridade,
  NcStatus,
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
  criado_por: string;
  created_at: string;
  criador?: { nome_completo: string } | null;
}

const FORM_COLS = '*, criador:users(nome_completo)';

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
    criadoPor: row.criado_por,
    criadoPorNome: row.criador?.nome_completo ?? null,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseOperacionalRepository implements OperacionalRepository {
  // ----- Formulários -------------------------------------------------------

  async createFormRecord(input: CreateFormRecordInput): Promise<FormRecord> {
    const { data, error } = await supabaseAdmin
      .from('form_records')
      .insert({
        id: randomUUID(),
        tipo: input.tipo,
        subtipo: input.subtipo,
        dados: input.dados,
        status: input.status,
        data_ref: input.dataRef,
        criado_por: input.criadoPor,
      })
      .select(FORM_COLS)
      .single();

    if (error) throw new Error(`Falha ao registrar formulário: ${error.message}`);
    return toFormRecord(data as unknown as FormRecordRow);
  }

  async listFormRecords(filter: ListFormRecordsFilter = {}): Promise<FormRecord[]> {
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
    if (error || !data) return [];
    return (data as unknown as FormRecordRow[]).map(toFormRecord);
  }

  async countFormRecordsPorTipo(
    desde: string,
  ): Promise<Record<string, { total: number; naoConformes: number }>> {
    const { data, error } = await supabaseAdmin
      .from('form_records')
      .select('tipo, status')
      .is('deleted_at', null)
      .gte('data_ref', desde);

    const resumo: Record<string, { total: number; naoConformes: number }> = {};
    if (error || !data) return resumo;
    for (const row of data as { tipo: string; status: string }[]) {
      const atual = (resumo[row.tipo] ??= { total: 0, naoConformes: 0 });
      atual.total += 1;
      if (row.status === 'nao_conforme') atual.naoConformes += 1;
    }
    return resumo;
  }

  // ----- Não conformidades -------------------------------------------------

  async createNc(input: CreateNcInput): Promise<Nc> {
    const ano = new Date().getFullYear();

    // O código é sequencial por ano; em caso de corrida (unique violation) tenta de novo.
    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      const { count } = await supabaseAdmin
        .from('ncs')
        .select('id', { count: 'exact', head: true })
        .like('codigo', `NC-${ano}-%`);
      const codigo = `NC-${ano}-${String((count ?? 0) + 1 + tentativa).padStart(3, '0')}`;

      const { data, error } = await supabaseAdmin
        .from('ncs')
        .insert({
          id: randomUUID(),
          codigo,
          titulo: input.titulo,
          descricao: input.descricao,
          origem: input.origem,
          severidade: input.severidade,
          status: 'aberta',
          responsavel_id: input.responsavelId,
          criado_por: input.criadoPor,
        })
        .select()
        .single();

      if (!error) return toNc(data as NcRow);
      if (error.code !== '23505') throw new Error(`Falha ao abrir NC: ${error.message}`);
    }
    throw new Error('Falha ao gerar código único da NC.');
  }

  async listNcs(origem?: NcOrigem): Promise<Nc[]> {
    let query = supabaseAdmin
      .from('ncs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (origem) query = query.eq('origem', origem);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as NcRow[]).map(toNc);
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

    if (error) throw new Error(`Falha ao atualizar NC: ${error.message}`);
    return data ? toNc(data as NcRow) : null;
  }

  async resumoNcs(origem?: NcOrigem): Promise<NcResumo> {
    let query = supabaseAdmin.from('ncs').select('status').is('deleted_at', null);
    if (origem) query = query.eq('origem', origem);

    const { data } = await query;
    const resumo: NcResumo = { abertas: 0, emAndamento: 0, concluidas: 0, total: 0 };
    for (const row of (data ?? []) as { status: string }[]) {
      resumo.total += 1;
      if (row.status === 'aberta') resumo.abertas += 1;
      else if (row.status === 'em_andamento') resumo.emAndamento += 1;
      else if (row.status === 'concluida') resumo.concluidas += 1;
    }
    return resumo;
  }

  // ----- Treinamentos ------------------------------------------------------

  async createTreinamento(input: CreateTreinamentoInput): Promise<Treinamento> {
    const { data, error } = await supabaseAdmin
      .from('trainings')
      .insert({
        id: randomUUID(),
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
        criado_por: input.criadoPor,
      })
      .select('*, criador:users(nome_completo)')
      .single();

    if (error) throw new Error(`Falha ao registrar treinamento: ${error.message}`);
    return toTreinamento(data as unknown as TreinamentoRow);
  }

  async listTreinamentos(tipo?: TreinamentoTipo): Promise<Treinamento[]> {
    let query = supabaseAdmin
      .from('trainings')
      .select('*, criador:users(nome_completo)')
      .is('deleted_at', null)
      .order('data_realizacao', { ascending: false });
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as unknown as TreinamentoRow[]).map(toTreinamento);
  }
}
