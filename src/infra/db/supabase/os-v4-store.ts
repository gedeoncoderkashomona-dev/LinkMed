import { createHash, randomUUID } from 'node:crypto';

import type { FormRecord } from '@/core/domain/entities/operacional';
import {
  buildReg016DadosFromOsFluxo,
  normalizarMarcaParaItem5,
} from '@/core/domain/forms/os-reg016-sync';
import {
  normalizarNumeroOs,
  type IdentificacaoEquipamentoOS,
  type NotificacaoSetorOS,
  type OrdemServicoFluxoState,
  type SetorOperacional,
} from '@/core/domain/forms/os-workflow';
import {
  buildOrdemServicoFluxoFromV4,
  converterEstadoLegadoParaEventosV4,
  etiquetaV4ParaTagColor,
  type OsV4PersistidaMeta,
} from '@/core/domain/os-v4/adapter';
import {
  FERIADOS_PADRAO_RECIFE_PE,
  type FeriadoRecord,
} from '@/core/domain/os-v4/feriados';
import {
  FLUXO,
  Recusado,
  decidir,
  entregarEm,
  estadoDe,
  lembreteDevido,
  normalizarNumero,
  notificacoesDe,
  perfilSistemaParaSetorV4,
  type Comando,
  type Estado,
  type Evento,
  type Perfil,
} from '@/core/domain/os-v4/nucleo';
import { getRepositories } from '@/infra/db';
import { supabaseAdmin } from './client';
import {
  carregarOsFluxoPorNumero,
  persistirOsFluxoNoServidor,
} from './os-flow-store';

export interface NotificacaoV4Persistida {
  id: string;
  osId: string;
  numeroOs: string;
  numeroOsNormalizado: string;
  para: string;
  mensagem: string;
  criadaEm: string;
  entregarEm: string;
  confirmadaEm: string | null;
  confirmadaPorId: string | null;
  confirmadaPorNome: string | null;
  ultimoLembreteEm: string | null;
  ehLembrete?: boolean;
  eventoId?: string | null;
}

export interface OsV4Carregada {
  meta: OsV4PersistidaMeta;
  eventos: Evento[];
  estado: Estado;
  notificacoes: NotificacaoV4Persistida[];
  reg034Salvo: boolean;
  item5Preenchido: boolean;
  fluxoState: OrdemServicoFluxoState;
}

interface StoredFeriadoPayload extends FeriadoRecord {
  removed?: boolean;
}

interface AuditRow<T> {
  id: string;
  usuario_id: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  dados_depois: T;
  created_at: string;
}

let hasNativeV4TablesCache: boolean | null = null;
let hasNativeFeriadoTableCache: boolean | null = null;
let hasLegacyOsFluxoTableCache: boolean | null = null;
let feriadosCache: { items: FeriadoRecord[]; expiresAt: number } | null = null;
const FERIADOS_TTL_MS = 5 * 60_000;

export function deterministicUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

export function isScheduleRestrictionRuntimeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SCHEDULE_RESTRICTION === 'true';
}

function isMissingSchemaError(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === 'PGRST202' ||
    err.code === '42P01' ||
    err.code === '42883' ||
    String(err.message ?? '').includes('schema cache')
  );
}

async function detectNativeV4Tables(): Promise<boolean> {
  if (hasNativeV4TablesCache !== null) return hasNativeV4TablesCache;
  const { error } = await supabaseAdmin.from('os').select('id').limit(1);
  if (error && isMissingSchemaError(error)) {
    hasNativeV4TablesCache = false;
    return false;
  }
  if (!error) {
    const { error: evErr } = await supabaseAdmin.from('os_evento').select('id').limit(1);
    if (!evErr) {
      hasNativeV4TablesCache = true;
      return true;
    }
    if (isMissingSchemaError(evErr)) {
      hasNativeV4TablesCache = false;
      return false;
    }
  }
  hasNativeV4TablesCache = false;
  return false;
}

// ============================================================================
// Feriados configuráveis (R06 / D9)
// ============================================================================

export async function obterFeriadosV4(): Promise<FeriadoRecord[]> {
  if (feriadosCache && feriadosCache.expiresAt > Date.now()) {
    return feriadosCache.items;
  }

  const mapa = new Map<string, FeriadoRecord>();
  for (const f of FERIADOS_PADRAO_RECIFE_PE) {
    mapa.set(f.data, { ...f });
  }

  if (hasNativeFeriadoTableCache !== false) {
    const { data, error } = await supabaseAdmin
      .from('feriado')
      .select('data, descricao, escopo')
      .order('data', { ascending: true });

    if (!error && data) {
      hasNativeFeriadoTableCache = true;
      for (const row of data as Array<{ data: string; descricao?: string | null; escopo?: string | null }>) {
        mapa.set(String(row.data).slice(0, 10), {
          data: String(row.data).slice(0, 10),
          descricao: row.descricao || 'Feriado cadastrado',
          escopo: (row.escopo as FeriadoRecord['escopo']) || 'personalizado',
        });
      }
    } else if (isMissingSchemaError(error)) {
      hasNativeFeriadoTableCache = false;
    }
  }

  const { data: auditFeriados } = await supabaseAdmin
    .from('audit_logs')
    .select('entidade_id, dados_depois, created_at')
    .eq('entidade', '__db_os_v4_feriado__')
    .order('created_at', { ascending: true });

  for (const row of (auditFeriados ?? []) as Array<AuditRow<StoredFeriadoPayload>>) {
    const payload = row.dados_depois;
    if (!payload?.data) continue;
    if (payload.removed) {
      mapa.delete(payload.data);
    } else {
      mapa.set(payload.data, {
        data: payload.data,
        descricao: payload.descricao || 'Feriado personalizado',
        escopo: payload.escopo || 'personalizado',
      });
    }
  }

  const items = Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));
  feriadosCache = { items, expiresAt: Date.now() + FERIADOS_TTL_MS };
  return items;
}

export async function obterFeriadosDatasV4(): Promise<string[]> {
  const lista = await obterFeriadosV4();
  return lista.map((f) => f.data);
}

export async function adicionarFeriadoV4(params: {
  data: string;
  descricao: string;
  escopo?: FeriadoRecord['escopo'];
  usuarioId: string;
}): Promise<FeriadoRecord> {
  const dataLimpa = params.data.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    throw new Recusado('campo', 'Data de feriado inválida (use AAAA-MM-DD).');
  }
  const registro: FeriadoRecord = {
    data: dataLimpa,
    descricao: params.descricao.trim() || 'Feriado Linkmed',
    escopo: params.escopo ?? 'personalizado',
  };

  if (hasNativeFeriadoTableCache !== false) {
    const { error } = await supabaseAdmin.from('feriado').upsert(
      {
        data: registro.data,
        descricao: registro.descricao,
        escopo: registro.escopo,
      },
      { onConflict: 'data' },
    );
    if (!error) hasNativeFeriadoTableCache = true;
    else if (isMissingSchemaError(error)) hasNativeFeriadoTableCache = false;
  }

  const pk = deterministicUuid(`os_v4_feriado:${registro.data}`);
  const payload: StoredFeriadoPayload = { ...registro, removed: false };
  await supabaseAdmin.from('audit_logs').upsert(
    {
      id: pk,
      usuario_id: params.usuarioId,
      acao: 'feriado.upsert',
      entidade: '__db_os_v4_feriado__',
      entidade_id: registro.data,
      dados_antes: null,
      dados_depois: payload,
      ip: '127.0.0.1',
      user_agent: 'regulaon-v4',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  feriadosCache = null;
  return registro;
}

export async function removerFeriadoV4(params: {
  data: string;
  usuarioId: string;
}): Promise<void> {
  const dataLimpa = params.data.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    throw new Recusado('campo', 'Data de feriado inválida.');
  }

  if (hasNativeFeriadoTableCache !== false) {
    const { error } = await supabaseAdmin.from('feriado').delete().eq('data', dataLimpa);
    if (!error) hasNativeFeriadoTableCache = true;
    else if (isMissingSchemaError(error)) hasNativeFeriadoTableCache = false;
  }

  const pk = deterministicUuid(`os_v4_feriado:${dataLimpa}`);
  const payload: StoredFeriadoPayload = {
    data: dataLimpa,
    descricao: 'Removido',
    escopo: 'personalizado',
    removed: true,
  };
  await supabaseAdmin.from('audit_logs').upsert(
    {
      id: pk,
      usuario_id: params.usuarioId,
      acao: 'feriado.delete',
      entidade: '__db_os_v4_feriado__',
      entidade_id: dataLimpa,
      dados_antes: null,
      dados_depois: payload,
      ip: '127.0.0.1',
      user_agent: 'regulaon-v4',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  feriadosCache = null;
}

// ============================================================================
// Pré-requisitos derivados dos formulários (REG-034 & Item 5 / REG-009 / REG-035)
// ============================================================================

export function verificarFlagsFormulariosOs(
  numeroOs: string,
  formRecords: FormRecord[],
): { reg034Salvo: boolean; item5Preenchido: boolean } {
  const norm = normalizarNumero(numeroOs);
  if (!norm) return { reg034Salvo: false, item5Preenchido: false };

  let reg034Salvo = false;
  let item5Preenchido = false;

  for (const r of formRecords) {
    const osRecord = normalizarNumero(String(r.dados?.numero_os ?? ''));
    if (osRecord !== norm) continue;

    if (r.tipo === 'limpeza-equipamento') {
      reg034Salvo = true;
    }

    if (r.tipo === 'checklist-manutencao') {
      item5Preenchido = true;
    }

    if (r.tipo === 'etapas-manutencao') {
      const d = r.dados ?? {};
      const temMarca = Boolean(String(d.item5_marca ?? '').trim());
      const temConteudoItem5 = Boolean(
        String(d.item5_serial ?? '').trim() ||
          String(d.item5_data_calibracao ?? '').trim() ||
          String(d.item5_proxima_calibracao ?? '').trim() ||
          String(d.item5_tipo_verificacao ?? '').trim() ||
          String(d.item5_responsavel ?? '').trim() ||
          String(d.item5_verificacao_pos_manutencao ?? '').trim() ||
          String(d.item5_resultado_final ?? '').trim() ||
          String(d.item5_observacoes ?? '').trim() ||
          String(d.item5_assinatura ?? '').trim(),
      );
      if (temMarca && temConteudoItem5) {
        item5Preenchido = true;
      }
    }
  }

  return { reg034Salvo, item5Preenchido };
}

// ============================================================================
// Serialização de Notificações Compatíveis
// ============================================================================

function toLegacyNotificacao(n: NotificacaoV4Persistida): NotificacaoSetorOS {
  const paraSetor: SetorOperacional =
    n.para === 'ADM' || n.para === 'AT' || n.para === 'ALMOXARIFADO' ? n.para : 'AT';
  const criada = new Date(n.criadaEm);
  const entrega = new Date(n.entregarEm);
  return {
    id: n.id,
    numeroOs: n.numeroOs,
    destinatario: paraSetor,
    mensagem: n.mensagem,
    criadaEm: criada,
    entregueEm: entrega,
    retidaForaHorario: entrega.getTime() > criada.getTime() + 1000,
    confirmadaEm: n.confirmadaEm ? new Date(n.confirmadaEm) : null,
    confirmadaPorId: n.confirmadaPorId ?? null,
    confirmadaPorNome: n.confirmadaPorNome ?? null,
    lembreteEnviadoEm: n.ultimoLembreteEm ? new Date(n.ultimoLembreteEm) : null,
    quantidadeLembretes: n.ehLembrete ? 1 : 0,
  };
}

// ============================================================================
// Persistência de Meta / Eventos / Notificações (Nativo + Fallback audit_logs)
// ============================================================================

async function salvarMetaENotificacoesFallback(params: {
  meta: OsV4PersistidaMeta;
  novosEventos: Array<{ seq: number; evento: Evento }>;
  novasNotificacoes: NotificacaoV4Persistida[];
  estadoFinal: Estado;
  criadoPorFallback: string;
}): Promise<void> {
  const norm = normalizarNumero(params.meta.numeroOs);
  const metaId = params.meta.id || deterministicUuid(`os_v4_meta:${norm}`);
  const metaRow = { ...params.meta, id: metaId };

  // 1. Insere eventos em lote primeiro para preservar lock otimista de versão (unique PK por seq)
  if (params.novosEventos.length > 0) {
    const eventRows = params.novosEventos.map(({ seq, evento }) => ({
      id: deterministicUuid(`os_v4_event:${norm}:${seq}`),
      usuario_id: evento.usuario.id || params.criadoPorFallback,
      acao: String(seq),
      entidade: '__db_os_v4_event__',
      entidade_id: norm,
      dados_antes: null,
      dados_depois: { seq, evento },
      ip: '127.0.0.1',
      user_agent: 'regulaon-v4',
      created_at: evento.em,
    }));

    const { error: evErr } = await supabaseAdmin.from('audit_logs').insert(eventRows);
    if (evErr) {
      if (evErr.code === '23505') {
        throw new Recusado(
          'versao',
          'A OS mudou desde que você abriu. Recarregue a tela.',
        );
      }
      throw new Error(`Falha ao gravar evento da OS: ${evErr.message}`);
    }
  }

  // 2. Persiste metadados e notificações em paralelo (em lote)
  const metaPromise = supabaseAdmin.from('audit_logs').upsert(
    {
      id: deterministicUuid(`os_v4_meta:${norm}`),
      usuario_id: params.meta.criadaPorId || params.criadoPorFallback,
      acao: 'os_v4.meta',
      entidade: '__db_os_v4_meta__',
      entidade_id: norm,
      dados_antes: null,
      dados_depois: { meta: metaRow, estado: params.estadoFinal },
      ip: '127.0.0.1',
      user_agent: 'regulaon-v4',
      created_at: new Date(params.meta.criadaEm).toISOString(),
    },
    { onConflict: 'id' },
  );

  const notifPromise =
    params.novasNotificacoes.length > 0
      ? supabaseAdmin.from('audit_logs').upsert(
          params.novasNotificacoes.map((notif) => ({
            id: deterministicUuid(`os_v4_notif:${notif.id}`),
            usuario_id: params.criadoPorFallback,
            acao: notif.para,
            entidade: '__db_os_v4_notif__',
            entidade_id: norm,
            dados_antes: null,
            dados_depois: notif,
            ip: '127.0.0.1',
            user_agent: 'regulaon-v4',
            created_at: notif.criadaEm,
          })),
          { onConflict: 'id' },
        )
      : Promise.resolve({ error: null });

  const [{ error: metaErr }] = await Promise.all([metaPromise, notifPromise]);
  if (metaErr) {
    throw new Error(`Falha ao salvar metadados da OS: ${metaErr.message}`);
  }
}

async function salvarBootstrappedLegado(
  meta: OsV4PersistidaMeta,
  eventos: Evento[],
  usuarioFallback: string,
): Promise<NotificacaoV4Persistida[]> {
  const norm = normalizarNumero(meta.numeroOs);
  const estado = estadoDe(eventos);
  const notifs: NotificacaoV4Persistida[] = [];

  // Gera uma notificação pendente coerente caso a OS migrada esteja aguardando um setor
  if (estado.setor && !estado.cancelada && estado.estadoGeral !== 'finalizada') {
    const lastEv = eventos.at(-1);
    const createdAt = lastEv?.em ?? new Date(meta.criadaEm).toISOString();
    const id = deterministicUuid(`os_v4_bootstrap_notif:${norm}:${estado.no}`);
    notifs.push({
      id,
      osId: meta.id,
      numeroOs: meta.numeroOs,
      numeroOsNormalizado: norm,
      para: estado.setor,
      mensagem: `OS ${meta.numeroOs} aguardando ação (${FLUXO.nos[estado.no]?.bloco ?? estado.no})`,
      criadaEm: createdAt,
      entregarEm: createdAt,
      confirmadaEm: null,
      confirmadaPorId: null,
      confirmadaPorNome: null,
      ultimoLembreteEm: null,
      eventoId: lastEv?.id ?? null,
    });
  }

  const native = await detectNativeV4Tables();
  if (native) {
    await supabaseAdmin.from('os').upsert(
      {
        id: meta.id,
        numero: meta.numeroOs,
        numero_normalizado: norm,
        identificacao: meta.identificacao,
        criada_por_id: meta.criadaPorId,
        criada_por_nome: meta.criadaPorNome,
        criada_em: new Date(meta.criadaEm).toISOString(),
      },
      { onConflict: 'numero_normalizado', ignoreDuplicates: true },
    );
  }

  // Salva idempotently no fallback audit_logs também
  await salvarMetaENotificacoesFallback({
    meta,
    novosEventos: eventos.map((e, idx) => ({ seq: idx + 1, evento: e })),
    novasNotificacoes: notifs,
    estadoFinal: estado,
    criadoPorFallback: usuarioFallback,
  }).catch(() => undefined);

  return notifs;
}

async function lerNotificacoesDeAudit(norm?: string): Promise<NotificacaoV4Persistida[]> {
  let q = supabaseAdmin
    .from('audit_logs')
    .select('id, dados_depois, created_at')
    .eq('entidade', '__db_os_v4_notif__')
    .order('created_at', { ascending: false })
    .limit(500);

  if (norm) q = q.eq('entidade_id', norm);
  const { data } = await q;
  return ((data ?? []) as Array<AuditRow<NotificacaoV4Persistida>>)
    .map((r) => r.dados_depois)
    .filter((n): n is NotificacaoV4Persistida => Boolean(n && n.id && n.numeroOs));
}

export async function carregarOsV4PorNumero(
  numeroOs: string,
  formRecordsPreloaded?: FormRecord[],
): Promise<OsV4Carregada | null> {
  const norm = normalizarNumero(numeroOs);
  if (!norm) return null;

  const { operacionalRepository } = getRepositories();
  const formRecords =
    formRecordsPreloaded ??
    (
      await Promise.all([
        operacionalRepository.findLatestFormRecordByOs('limpeza-equipamento', norm).catch(() => null),
        operacionalRepository.findLatestFormRecordByOs('checklist-manutencao', norm).catch(() => null),
        operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', norm).catch(() => null),
      ])
    ).filter((r): r is FormRecord => r !== null);

  const native = await detectNativeV4Tables();
  let meta: OsV4PersistidaMeta | null = null;
  let eventos: Evento[] = [];
  let notificacoes: NotificacaoV4Persistida[] = [];

  if (native) {
    const { data: osRow } = await supabaseAdmin
      .from('os')
      .select('*')
      .eq('numero_normalizado', norm)
      .maybeSingle();

    if (osRow) {
      meta = {
        id: osRow.id,
        numeroOs: osRow.numero,
        identificacao: (osRow.identificacao ?? {}) as IdentificacaoEquipamentoOS,
        criadaPorId: osRow.criada_por_id ?? '',
        criadaPorNome: osRow.criada_por_nome ?? 'ADM',
        criadaEm: osRow.criada_em,
      };
      const { data: evRows } = await supabaseAdmin
        .from('os_evento')
        .select('*')
        .eq('os_id', osRow.id)
        .order('seq', { ascending: true });
      eventos = ((evRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        tipo: r.tipo as Evento['tipo'],
        acao: r.acao ? String(r.acao) : undefined,
        valor: typeof r.valor === 'boolean' ? r.valor : undefined,
        campos: (r.campos as Record<string, string>) ?? undefined,
        regraId: r.regra_id ? String(r.regra_id) : undefined,
        de: r.de_no ? String(r.de_no) : undefined,
        para: r.para_no ? String(r.para_no) : undefined,
        anula: Array.isArray(r.anula) ? (r.anula as string[]) : undefined,
        motivo: r.motivo ? String(r.motivo) : undefined,
        usuario: (r.usuario as Evento['usuario']) ?? { id: 'sys', perfil: 'ADM' },
        em: String(r.em),
      }));

      const { data: notifRows } = await supabaseAdmin
        .from('os_notificacao')
        .select('*')
        .eq('os_id', osRow.id)
        .order('criada_em', { ascending: false });
      notificacoes = ((notifRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        osId: String(r.os_id),
        numeroOs: String(r.numero_os),
        numeroOsNormalizado: norm,
        para: String(r.para),
        mensagem: String(r.mensagem),
        criadaEm: String(r.criada_em),
        entregarEm: String(r.entregar_em),
        confirmadaEm: r.confirmada_em ? String(r.confirmada_em) : null,
        confirmadaPorId: r.confirmada_por_id ? String(r.confirmada_por_id) : null,
        confirmadaPorNome: r.confirmada_por_nome ? String(r.confirmada_por_nome) : null,
        ultimoLembreteEm: r.ultimo_lembrete_em ? String(r.ultimo_lembrete_em) : null,
        eventoId: r.evento_id ? String(r.evento_id) : null,
      }));
    }
  }

  if (!meta) {
    const [{ data: metaRow }, { data: evRows }, notifList] = await Promise.all([
      supabaseAdmin
        .from('audit_logs')
        .select('dados_depois')
        .eq('entidade', '__db_os_v4_meta__')
        .eq('entidade_id', norm)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('audit_logs')
        .select('dados_depois')
        .eq('entidade', '__db_os_v4_event__')
        .eq('entidade_id', norm)
        .order('created_at', { ascending: true }),
      lerNotificacoesDeAudit(norm),
    ]);

    if (metaRow?.dados_depois) {
      const parsed = metaRow.dados_depois as { meta?: OsV4PersistidaMeta };
      if (parsed.meta) {
        meta = parsed.meta;
        eventos = ((evRows ?? []) as Array<AuditRow<{ seq: number; evento: Evento }>>)
          .map((r) => r.dados_depois)
          .filter((d): d is { seq: number; evento: Evento } => Boolean(d?.evento))
          .sort((a, b) => a.seq - b.seq)
          .map((d) => d.evento);
        notificacoes = notifList;
      }
    }
  }

  // Migração preguiçosa se a OS só existir no formato antigo (`os_fluxo` / `__db_os_fluxo__`) ou em REG-022
  if (!meta) {
    const legado = await carregarOsFluxoPorNumero(normalizarNumeroOs(numeroOs));
    if (legado) {
      meta = {
        id: deterministicUuid(`os_v4_meta:${norm}`),
        numeroOs: legado.numeroOs,
        identificacao: legado.identificacao,
        criadaPorId: legado.criadaPorId,
        criadaPorNome: legado.criadaPorNome,
        criadaEm: legado.criadaEm,
      };
      eventos = converterEstadoLegadoParaEventosV4(legado);
      notificacoes = await salvarBootstrappedLegado(
        meta,
        eventos,
        legado.criadaPorId || '00000000-0000-0000-0000-000000000000',
      );
    } else {
      const reg022Match =
        formRecords.find(
          (r) =>
            r.tipo === 'inspecao-recebimento' &&
            normalizarNumero(String(r.dados?.numero_os ?? '')) === norm,
        ) ??
        (await operacionalRepository
          .findLatestFormRecordByOs('inspecao-recebimento', norm)
          .catch(() => null));

      if (reg022Match) {
        const d22 = reg022Match.dados ?? {};
        meta = {
          id: deterministicUuid(`os_v4_meta:${norm}`),
          numeroOs: String(d22.numero_os ?? numeroOs).trim(),
          identificacao: {
            cliente: String(d22.cliente ?? 'Cliente Hospitalar'),
            equipamento: String(d22.equipamento ?? 'Equipamento Médico'),
            marca: String(d22.marca ?? 'Cardios'),
            modelo: String(d22.modelo ?? 'Modelo Padrão'),
            numeroSerie: String(d22.numero_serie ?? 'S/N'),
            acessorios: String(d22.acessorios ?? ''),
            relatoCliente: String(d22.relato_cliente ?? ''),
          },
          criadaPorId: reg022Match.criadoPor,
          criadaPorNome: reg022Match.criadoPorNome ?? 'ADM',
          criadaEm: reg022Match.createdAt.toISOString(),
        };
        eventos = [];
        notificacoes = await salvarBootstrappedLegado(
          meta,
          eventos,
          reg022Match.criadoPor || '00000000-0000-0000-0000-000000000000',
        );
      }
    }
  }

  if (!meta) return null;

  const estado = estadoDe(eventos);
  const { reg034Salvo, item5Preenchido } = verificarFlagsFormulariosOs(
    meta.numeroOs,
    formRecords,
  );

  // Processa lembretes de 7 dias devidos (R05) em background seguro
  const lembretesGerados = await processarLembretesDevidosDaOs({
    meta,
    estado,
    notificacoes,
  }).catch(() => []);
  const todasNotifs = [...lembretesGerados, ...notificacoes].sort(
    (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
  );

  const fluxoState = buildOrdemServicoFluxoFromV4({
    meta,
    eventos,
    notificacoes: todasNotifs.map(toLegacyNotificacao),
    reg034Salvo,
    item5Preenchido,
  });

  return {
    meta,
    eventos,
    estado,
    notificacoes: todasNotifs,
    reg034Salvo,
    item5Preenchido,
    fluxoState,
  };
}

async function processarLembretesDevidosDaOs(params: {
  meta: OsV4PersistidaMeta;
  estado: Estado;
  notificacoes: NotificacaoV4Persistida[];
}): Promise<NotificacaoV4Persistida[]> {
  const { meta, estado, notificacoes } = params;
  if (estado.estadoGeral === 'finalizada' || estado.estadoGeral === 'cancelada') {
    return [];
  }

  const agora = new Date();
  const norm = normalizarNumero(meta.numeroOs);
  const gerados: NotificacaoV4Persistida[] = [];

  for (const n of notificacoes) {
    if (n.ehLembrete || n.confirmadaEm) continue;
    const entrega = new Date(n.entregarEm);
    if (entrega.getTime() > agora.getTime()) continue;
    const ult = n.ultimoLembreteEm ? new Date(n.ultimoLembreteEm) : undefined;
    if (!lembreteDevido(entrega, false, estado, agora, ult)) continue;

    const baseMs = (ult ?? entrega).getTime();
    const bucket = Math.floor((agora.getTime() - baseMs) / (7 * 864e5));
    const lembreteId = deterministicUuid(`os_v4_lembrete:${n.id}:${ult?.toISOString() ?? '0'}:${bucket}`);
    const entregaLembrete = entregarEm(agora, []).toISOString();

    const novoLembrete: NotificacaoV4Persistida = {
      id: lembreteId,
      osId: meta.id,
      numeroOs: meta.numeroOs,
      numeroOsNormalizado: norm,
      para: n.para,
      mensagem: `Lembrete (7 dias): ${n.mensagem}`,
      criadaEm: agora.toISOString(),
      entregarEm: entregaLembrete,
      confirmadaEm: null,
      confirmadaPorId: null,
      confirmadaPorNome: null,
      ultimoLembreteEm: null,
      ehLembrete: true,
      eventoId: n.eventoId ?? null,
    };

    const atualizadoPai: NotificacaoV4Persistida = {
      ...n,
      ultimoLembreteEm: agora.toISOString(),
    };

    const pkPai = deterministicUuid(`os_v4_notif:${n.id}`);
    const pkLem = deterministicUuid(`os_v4_notif:${novoLembrete.id}`);

    await supabaseAdmin
      .from('audit_logs')
      .upsert(
        [
          {
            id: pkPai,
            usuario_id: meta.criadaPorId || '00000000-0000-0000-0000-000000000000',
            acao: n.para,
            entidade: '__db_os_v4_notif__',
            entidade_id: norm,
            dados_antes: null,
            dados_depois: atualizadoPai,
            ip: '127.0.0.1',
            user_agent: 'regulaon-v4',
            created_at: n.criadaEm,
          },
          {
            id: pkLem,
            usuario_id: meta.criadaPorId || '00000000-0000-0000-0000-000000000000',
            acao: novoLembrete.para,
            entidade: '__db_os_v4_notif__',
            entidade_id: norm,
            dados_antes: null,
            dados_depois: novoLembrete,
            ip: '127.0.0.1',
            user_agent: 'regulaon-v4',
            created_at: novoLembrete.criadaEm,
          },
        ],
        { onConflict: 'id' },
      )
      .then(() => undefined);

    if (hasNativeV4TablesCache) {
      await supabaseAdmin
        .from('os_notificacao')
        .update({ ultimo_lembrete_em: atualizadoPai.ultimoLembreteEm })
        .eq('id', n.id);
      await supabaseAdmin.from('os_notificacao').upsert(
        {
          id: novoLembrete.id,
          os_id: meta.id,
          numero_os: meta.numeroOs,
          para: novoLembrete.para,
          mensagem: novoLembrete.mensagem,
          criada_em: novoLembrete.criadaEm,
          entregar_em: novoLembrete.entregarEm,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
    }

    n.ultimoLembreteEm = atualizadoPai.ultimoLembreteEm;
    gerados.push(novoLembrete);
  }

  return gerados;
}

export async function listarOrdensV4(): Promise<OrdemServicoFluxoState[]> {
  const { operacionalRepository } = getRepositories();
  const native = await detectNativeV4Tables();

  // Carrega todos os dados necessários em lote paralelo (elimina N+1 por OS)
  const [formRecords, metaRes, eventsRes, notifsRes, legacyAuditRes, nativeOsRes, legacyTableRes] =
    await Promise.all([
      operacionalRepository.listFormRecords({ limit: 500 }).catch(() => [] as FormRecord[]),
      supabaseAdmin
        .from('audit_logs')
        .select('entidade_id, dados_depois, created_at')
        .eq('entidade', '__db_os_v4_meta__')
        .order('created_at', { ascending: false })
        .limit(300),
      supabaseAdmin
        .from('audit_logs')
        .select('entidade_id, dados_depois')
        .eq('entidade', '__db_os_v4_event__')
        .order('created_at', { ascending: true })
        .limit(4000),
      supabaseAdmin
        .from('audit_logs')
        .select('entidade_id, dados_depois, created_at')
        .eq('entidade', '__db_os_v4_notif__')
        .order('created_at', { ascending: false })
        .limit(1500),
      supabaseAdmin
        .from('audit_logs')
        .select('entidade_id, dados_depois')
        .eq('entidade', '__db_os_fluxo__')
        .order('created_at', { ascending: false })
        .limit(300),
      native
        ? supabaseAdmin
            .from('os')
            .select('numero, numero_normalizado')
            .order('criada_em', { ascending: false })
            .limit(200)
        : Promise.resolve({ data: null, error: null }),
      hasLegacyOsFluxoTableCache !== false
        ? supabaseAdmin
            .from('os_fluxo')
            .select('numero_os, estado')
            .order('updated_at', { ascending: false })
            .limit(150)
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (legacyTableRes.error && isMissingSchemaError(legacyTableRes.error)) {
    hasLegacyOsFluxoTableCache = false;
  } else if (!legacyTableRes.error && hasLegacyOsFluxoTableCache === null) {
    hasLegacyOsFluxoTableCache = true;
  }

  // Agrupa metas v4 em memória (mais recente vence)
  const metaByNorm = new Map<string, OsV4PersistidaMeta>();
  for (const r of (metaRes.data ?? []) as Array<AuditRow<{ meta?: OsV4PersistidaMeta }>>) {
    const m = r.dados_depois?.meta;
    if (!m?.numeroOs) continue;
    const norm = normalizarNumero(m.numeroOs);
    if (!metaByNorm.has(norm)) metaByNorm.set(norm, m);
  }

  // Agrupa eventos v4 por OS em memória
  const eventsByNorm = new Map<string, Array<{ seq: number; evento: Evento }>>();
  for (const r of (eventsRes.data ?? []) as Array<AuditRow<{ seq: number; evento: Evento }>>) {
    const d = r.dados_depois;
    if (!d?.evento || !r.entidade_id) continue;
    const list = eventsByNorm.get(r.entidade_id) ?? [];
    list.push(d);
    eventsByNorm.set(r.entidade_id, list);
  }

  // Agrupa notificações v4 por OS em memória
  const notifsByNorm = new Map<string, NotificacaoV4Persistida[]>();
  for (const r of (notifsRes.data ?? []) as Array<AuditRow<NotificacaoV4Persistida>>) {
    const n = r.dados_depois;
    if (!n?.id || !n.numeroOs) continue;
    const norm = r.entidade_id || normalizarNumero(n.numeroOs);
    const list = notifsByNorm.get(norm) ?? [];
    list.push(n);
    notifsByNorm.set(norm, list);
  }

  // Monta todas as OS já em formato v4 em memória (0 roundtrips extras!)
  const ordensMontadas = new Map<string, OrdemServicoFluxoState>();
  const lembretesTasks: Array<Promise<void>> = [];

  for (const [norm, meta] of metaByNorm.entries()) {
    const eventos = (eventsByNorm.get(norm) ?? [])
      .sort((a, b) => a.seq - b.seq)
      .map((d) => d.evento);
    const notificacoes = (notifsByNorm.get(norm) ?? []).sort(
      (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
    );
    const estado = estadoDe(eventos);
    const { reg034Salvo, item5Preenchido } = verificarFlagsFormulariosOs(
      meta.numeroOs,
      formRecords,
    );

    const buildAndStore = (todasNotifs: NotificacaoV4Persistida[]) => {
      const fluxoState = buildOrdemServicoFluxoFromV4({
        meta,
        eventos,
        notificacoes: todasNotifs.map(toLegacyNotificacao),
        reg034Salvo,
        item5Preenchido,
      });
      ordensMontadas.set(norm, fluxoState);
    };

    // Verifica em CPU se há algum lembrete de 7 dias realmente vencido antes de tocar no banco
    const agora = new Date();
    const temLembretePendente =
      estado.estadoGeral !== 'finalizada' &&
      estado.estadoGeral !== 'cancelada' &&
      notificacoes.some((n) => {
        if (n.ehLembrete || n.confirmadaEm) return false;
        const entrega = new Date(n.entregarEm);
        if (entrega.getTime() > agora.getTime()) return false;
        const ult = n.ultimoLembreteEm ? new Date(n.ultimoLembreteEm) : undefined;
        return lembreteDevido(entrega, false, estado, agora, ult);
      });

    if (temLembretePendente) {
      lembretesTasks.push(
        processarLembretesDevidosDaOs({ meta, estado, notificacoes })
          .catch(() => [] as NotificacaoV4Persistida[])
          .then((gerados) => {
            const todas = [...gerados, ...notificacoes].sort(
              (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
            );
            buildAndStore(todas);
          }),
      );
    } else {
      buildAndStore(notificacoes);
    }
  }

  // Detecta OS que ainda só existem no formato nativo, legado ou REG-022 sem meta v4
  const faltantes = new Map<string, string>();
  const registrarSeFaltante = (num?: string | null) => {
    if (!num) return;
    const norm = normalizarNumero(num);
    if (!norm || ordensMontadas.has(norm) || metaByNorm.has(norm) || faltantes.has(norm)) return;
    faltantes.set(norm, num);
  };

  for (const r of (nativeOsRes.data ?? []) as Array<{ numero: string; numero_normalizado: string }>) {
    registrarSeFaltante(r.numero);
  }
  if (!legacyTableRes.error && legacyTableRes.data) {
    for (const r of legacyTableRes.data as Array<{ numero_os?: string; estado?: OrdemServicoFluxoState }>) {
      registrarSeFaltante(r.estado?.numeroOs ?? r.numero_os);
    }
  }
  for (const r of (legacyAuditRes.data ?? []) as Array<AuditRow<OrdemServicoFluxoState>>) {
    registrarSeFaltante(r.dados_depois?.numeroOs);
  }
  for (const r of formRecords) {
    if (r.tipo !== 'inspecao-recebimento') continue;
    registrarSeFaltante(String(r.dados?.numero_os ?? '').trim());
  }

  if (lembretesTasks.length > 0) {
    await Promise.all(lembretesTasks);
  }

  if (faltantes.size > 0) {
    const extras = await Promise.all(
      Array.from(faltantes.values()).map((num) =>
        carregarOsV4PorNumero(num, formRecords).catch(() => null),
      ),
    );
    for (const ex of extras) {
      if (ex) ordensMontadas.set(normalizarNumero(ex.meta.numeroOs), ex.fluxoState);
    }
  }

  return Array.from(ordensMontadas.values()).sort(
    (a, b) => new Date(b.atualizadaEm).getTime() - new Date(a.atualizadaEm).getTime(),
  );
}

export async function existeNumeroOsV4(
  numeroOs: string,
  opcoes?: { ignorarFormRecordId?: string; apenasTabelaOs?: boolean },
): Promise<{ existe: boolean; numeroExistente?: string }> {
  const norm = normalizarNumero(numeroOs);
  if (!norm) return { existe: false };

  const existente = await carregarOsV4PorNumero(numeroOs);
  if (existente) {
    return { existe: true, numeroExistente: existente.meta.numeroOs };
  }

  if (opcoes?.apenasTabelaOs) {
    return { existe: false };
  }

  const { operacionalRepository } = getRepositories();
  const registros22 = await operacionalRepository.listFormRecords({
    tipo: 'inspecao-recebimento',
    limit: 500,
  });
  const dup = registros22.find(
    (r) =>
      r.id !== opcoes?.ignorarFormRecordId &&
      normalizarNumero(String(r.dados?.numero_os ?? '')) === norm,
  );
  if (dup) {
    return { existe: true, numeroExistente: String(dup.dados?.numero_os ?? numeroOs) };
  }

  return { existe: false };
}

export async function criarOsInicialV4(params: {
  numeroOs: string;
  identificacao: IdentificacaoEquipamentoOS;
  usuarioId: string;
  usuarioNome: string;
  ip?: string;
  userAgent?: string | null;
  ignorarFormRecordId?: string;
}): Promise<OsV4Carregada> {
  const dup = await existeNumeroOsV4(params.numeroOs, {
    ignorarFormRecordId: params.ignorarFormRecordId,
  });
  if (dup.existe) {
    throw new Recusado(
      'estado',
      `Já existe uma OS com este número (${dup.numeroExistente ?? params.numeroOs}).`,
    );
  }

  const norm = normalizarNumero(params.numeroOs);
  const agora = new Date().toISOString();
  const meta: OsV4PersistidaMeta = {
    id: deterministicUuid(`os_v4_meta:${norm}`),
    numeroOs: params.numeroOs.trim(),
    identificacao: params.identificacao,
    criadaPorId: params.usuarioId,
    criadaPorNome: params.usuarioNome,
    criadaEm: agora,
  };
  const estadoInicial = estadoDe([]);

  const native = await detectNativeV4Tables();
  if (native) {
    const { error } = await supabaseAdmin.from('os').insert({
      id: meta.id,
      numero: meta.numeroOs,
      numero_normalizado: norm,
      identificacao: meta.identificacao,
      criada_por_id: meta.criadaPorId,
      criada_por_nome: meta.criadaPorNome,
      criada_em: agora,
    });
    if (error) {
      if (error.code === '23505') {
        throw new Recusado('estado', `Já existe uma OS com este número (${meta.numeroOs}).`);
      }
      if (!isMissingSchemaError(error)) {
        throw new Error(`Falha ao criar OS: ${error.message}`);
      }
    } else {
      await supabaseAdmin.from('os_estado').upsert({
        os_id: meta.id,
        no: estadoInicial.no,
        origem: estadoInicial.origem,
        cancelada: false,
        etiqueta: estadoInicial.etiqueta,
        setor: estadoInicial.setor,
        estado_geral: estadoInicial.estadoGeral,
        etiquetas_efetivas: [],
        item5_bloqueado: false,
        versao: 0,
      });
    }
  }

  await salvarMetaENotificacoesFallback({
    meta,
    novosEventos: [],
    novasNotificacoes: [],
    estadoFinal: estadoInicial,
    criadoPorFallback: params.usuarioId,
  });

  const fluxoState = buildOrdemServicoFluxoFromV4({
    meta,
    eventos: [],
    notificacoes: [],
    reg034Salvo: false,
    item5Preenchido: false,
  });

  await persistirOsFluxoNoServidor({
    estado: fluxoState,
    usuarioId: params.usuarioId,
    ip: params.ip,
    userAgent: params.userAgent,
    acao: 'os_v4.create',
    createdAt: agora,
  }).catch(() => undefined);

  return {
    meta,
    eventos: [],
    estado: estadoInicial,
    notificacoes: [],
    reg034Salvo: false,
    item5Preenchido: false,
    fluxoState,
  };
}

export async function executarComandoOsV4(params: {
  numeroOs: string;
  comando: Comando;
  perfilSistema: string;
  usuarioId: string;
  usuarioNome: string;
  versaoVista: number;
  agora?: Date;
  feriados?: string[];
  enforceJanelaHorario?: boolean;
  ip?: string;
  userAgent?: string | null;
  reg022DadosFallback?: Record<string, unknown> | null;
}): Promise<OsV4Carregada> {
  const atual = await carregarOsV4PorNumero(params.numeroOs);
  if (!atual) {
    throw new Recusado('estado', `OS "${params.numeroOs}" não encontrada.`);
  }

  const setorV4 = perfilSistemaParaSetorV4(params.perfilSistema);
  if (!setorV4) {
    throw new Recusado(
      'perfil',
      'Seu perfil é de visualização/governança. Apenas AT, ADM ou Almoxarifado executam etapas operacionais da OS.',
    );
  }

  const feriados = params.feriados ?? (await obterFeriadosDatasV4());
  const agora = params.agora ?? new Date();
  const enforceJanela =
    params.enforceJanelaHorario ?? isScheduleRestrictionRuntimeEnabled();

  const usuario: { id: string; perfil: Perfil; nome: string } = {
    id: params.usuarioId,
    perfil: setorV4,
    nome: params.usuarioNome,
  };

  const novosSemId = decidir(atual.eventos, params.comando, usuario, {
    agora,
    feriados,
    reg034Salvo: atual.reg034Salvo,
    item5Preenchido: atual.item5Preenchido,
    versaoVista: params.versaoVista,
    enforceJanelaHorario: enforceJanela,
  });

  const norm = normalizarNumero(atual.meta.numeroOs);
  const novosComId: Array<{ seq: number; evento: Evento }> = [];
  const novasNotifs: NotificacaoV4Persistida[] = [];
  let seq = atual.eventos.length;
  let runningEvents = [...atual.eventos];

  for (const evRaw of novosSemId) {
    seq += 1;
    const evId = deterministicUuid(`os_v4_event:${norm}:${seq}`);
    const ev: Evento = { id: evId, ...evRaw };
    const geradas = notificacoesDe(ev, atual.meta.numeroOs, runningEvents, feriados);
    for (let idx = 0; idx < geradas.length; idx++) {
      const n = geradas[idx]!;
      novasNotifs.push({
        id: deterministicUuid(`os_v4_notif:${norm}:${seq}:${idx}`),
        osId: atual.meta.id,
        numeroOs: atual.meta.numeroOs,
        numeroOsNormalizado: norm,
        para: n.para,
        mensagem: n.msg,
        criadaEm: n.criadaEm,
        entregarEm: n.entregarEm,
        confirmadaEm: null,
        confirmadaPorId: null,
        confirmadaPorNome: null,
        ultimoLembreteEm: null,
        eventoId: evId,
      });
    }
    runningEvents = [...runningEvents, ev];
    novosComId.push({ seq, evento: ev });
  }

  const estadoFinal = estadoDe(runningEvents);

  const native = await detectNativeV4Tables();
  if (native) {
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('aplicar_eventos_os_v4', {
      p_os_id: atual.meta.id,
      p_versao_vista: params.versaoVista,
      p_novos_eventos: novosComId.map(({ seq: s, evento: e }) => ({
        id: e.id,
        seq: s,
        tipo: e.tipo,
        acao: e.acao ?? null,
        valor: typeof e.valor === 'boolean' ? e.valor : null,
        campos: e.campos ?? null,
        regra_id: e.regraId ?? null,
        de_no: e.de ?? null,
        para_no: e.para ?? null,
        anula: e.anula ?? null,
        motivo: e.motivo ?? null,
        usuario: e.usuario,
        em: e.em,
      })),
      p_estado: {
        no: estadoFinal.no,
        origem: estadoFinal.origem,
        cancelada: estadoFinal.cancelada,
        etiqueta: estadoFinal.etiqueta,
        setor: estadoFinal.setor,
        estado_geral: estadoFinal.estadoGeral,
        etiquetas_efetivas: estadoFinal.etiquetasEfetivas,
        item5_bloqueado: estadoFinal.item5Bloqueado,
        versao: estadoFinal.versao,
      },
      p_notificacoes: novasNotifs.map((n) => ({
        id: n.id,
        os_id: n.osId,
        numero_os: n.numeroOs,
        para: n.para,
        mensagem: n.mensagem,
        criada_em: n.criadaEm,
        entregar_em: n.entregarEm,
      })),
    });

    if (rpcErr) {
      const msg = String(rpcErr.message ?? '');
      if (msg.includes('versao:') || rpcErr.code === '40001') {
        throw new Recusado(
          'versao',
          'A OS mudou desde que você abriu. Recarregue a tela.',
        );
      }
      if (!isMissingSchemaError(rpcErr)) {
        throw new Error(`Falha ao aplicar comando v4: ${rpcErr.message}`);
      }
    } else if (rpcData && (rpcData as { ok?: boolean }).ok === false) {
      throw new Recusado('versao', 'A OS mudou desde que você abriu. Recarregue a tela.');
    }
  }

  if (native) {
    await salvarMetaENotificacoesFallback({
      meta: atual.meta,
      novosEventos: novosComId,
      novasNotificacoes: novasNotifs,
      estadoFinal,
      criadoPorFallback: params.usuarioId,
    }).catch(() => undefined);
  } else {
    await salvarMetaENotificacoesFallback({
      meta: atual.meta,
      novosEventos: novosComId,
      novasNotificacoes: novasNotifs,
      estadoFinal,
      criadoPorFallback: params.usuarioId,
    });
  }

  const todasNotifs = [...novasNotifs, ...atual.notificacoes];
  const reg034Agora =
    atual.reg034Salvo ||
    estadoFinal.efetivos.some((e) => e.tipo === 'ACAO' && e.acao === 'REG034_SALVO');

  const fluxoState = buildOrdemServicoFluxoFromV4({
    meta: atual.meta,
    eventos: runningEvents,
    notificacoes: todasNotifs.map(toLegacyNotificacao),
    reg034Salvo: reg034Agora,
    item5Preenchido: atual.item5Preenchido,
  });

  // Persiste espelho legado e sincroniza REG-016 em paralelo para reduzir latência do comando
  await Promise.all([
    persistirOsFluxoNoServidor({
      estado: fluxoState,
      usuarioId: params.usuarioId,
      ip: params.ip,
      userAgent: params.userAgent,
      acao: `os_v4.${params.comando.tipo.toLowerCase()}`,
      createdAt: agora.toISOString(),
    }).catch(() => undefined),
    (async () => {
      try {
        const { operacionalRepository } = getRepositories();
        const reg016Existente = await operacionalRepository.findLatestFormRecordByOs(
          'etapas-manutencao',
          atual.meta.numeroOs,
        );
        const syncPayload = buildReg016DadosFromOsFluxo({
          os: fluxoState,
          dadosExistentes: reg016Existente?.dados ?? null,
          reg022Dados: params.reg022DadosFallback ?? null,
        });
        if (reg016Existente || estadoFinal.no !== 'AGUARDA_REG016') {
          await operacionalRepository.upsertFormRecordByOs(
            'etapas-manutencao',
            atual.meta.numeroOs,
            {
              subtipo: reg016Existente?.subtipo ?? null,
              ...syncPayload,
              criadoPor: params.usuarioId,
            },
          );
        }
      } catch {
        // Nunca impede a transição principal do fluxo v4
      }
    })(),
  ]);

  return {
    meta: atual.meta,
    eventos: runningEvents,
    estado: estadoFinal,
    notificacoes: todasNotifs,
    reg034Salvo: reg034Agora,
    item5Preenchido: atual.item5Preenchido,
    fluxoState,
  };
}

/**
 * Decisão D5 / R08: Confirmar ciência de uma notificação registra
 * apenas `confirmada_em`, `confirmada_por_id` e `confirmada_por_nome` —
 * NUNCA altera o nó da OS nem cria eventos de transição.
 */
export async function confirmarNotificacaoOsV4(params: {
  notificacaoId: string;
  numeroOs: string;
  perfilSistema: string;
  usuarioId: string;
  usuarioNome: string;
}): Promise<NotificacaoV4Persistida> {
  const atual = await carregarOsV4PorNumero(params.numeroOs);
  if (!atual) {
    throw new Recusado('estado', `OS "${params.numeroOs}" não encontrada.`);
  }

  const notif = atual.notificacoes.find((n) => n.id === params.notificacaoId);
  if (!notif) {
    throw new Recusado('estado', 'Notificação não encontrada para esta OS.');
  }

  const setorUsuario = perfilSistemaParaSetorV4(params.perfilSistema);
  if (!setorUsuario || setorUsuario !== notif.para) {
    throw new Recusado(
      'perfil',
      `Apenas o setor ${notif.para} pode confirmar ciência desta notificação.`,
    );
  }

  if (notif.confirmadaEm) return notif;

  const agora = new Date().toISOString();
  const atualizada: NotificacaoV4Persistida = {
    ...notif,
    confirmadaEm: agora,
    confirmadaPorId: params.usuarioId,
    confirmadaPorNome: params.usuarioNome,
  };

  if (hasNativeV4TablesCache) {
    await supabaseAdmin
      .from('os_notificacao')
      .update({
        confirmada_em: agora,
        confirmada_por_id: params.usuarioId,
        confirmada_por_nome: params.usuarioNome,
      })
      .eq('id', notif.id);
  }

  const norm = normalizarNumero(atual.meta.numeroOs);
  const pk = deterministicUuid(`os_v4_notif:${notif.id}`);
  await supabaseAdmin.from('audit_logs').upsert(
    {
      id: pk,
      usuario_id: params.usuarioId,
      acao: notif.para,
      entidade: '__db_os_v4_notif__',
      entidade_id: norm,
      dados_antes: notif,
      dados_depois: atualizada,
      ip: '127.0.0.1',
      user_agent: 'regulaon-v4',
      created_at: notif.criadaEm,
    },
    { onConflict: 'id' },
  );

  // Atualiza também o espelho legado caso a UI leia notificações daqui
  const nextNotifs = atual.notificacoes.map((n) => (n.id === notif.id ? atualizada : n));
  const fluxoMirror = buildOrdemServicoFluxoFromV4({
    meta: atual.meta,
    eventos: atual.eventos,
    notificacoes: nextNotifs.map(toLegacyNotificacao),
    reg034Salvo: atual.reg034Salvo,
    item5Preenchido: atual.item5Preenchido,
  });
  await persistirOsFluxoNoServidor({
    estado: fluxoMirror,
    usuarioId: params.usuarioId,
    acao: 'os_v4.confirmar_ciencia',
    createdAt: agora,
  }).catch(() => undefined);

  return atualizada;
}

export function etiquetaV4ResumoLegivel(etiqueta: string | null | undefined): string {
  const color = etiquetaV4ParaTagColor(etiqueta);
  if (!color) return 'Sem etiqueta atribuída';
  return `${etiqueta} (${color})`;
}

export function resolverItem5MarcaPadrao(marca?: string | null): 'Cardios' | 'TEB' | 'OLIDEF' | null {
  const norm = normalizarMarcaParaItem5(marca ?? '');
  return norm || null;
}

export function randomAuditId(): string {
  return randomUUID();
}
