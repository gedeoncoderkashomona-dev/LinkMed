'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import type { FormTipo } from '@/core/domain/forms/definitions';
import type { OrdemServicoFluxoState } from '@/core/domain/forms/os-workflow';
import type { FeriadoRecord } from '@/core/domain/os-v4/feriados';
import type { Comando, Estado, Evento } from '@/core/domain/os-v4/nucleo';

export interface OsNotificacaoV4Item {
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
}

export class ApiValidationError extends Error {
  fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

export class OsCommandError extends Error {
  codigo?: string;
  versaoAtual?: number;
  constructor(message: string, codigo?: string, versaoAtual?: number) {
    super(message);
    this.codigo = codigo;
    this.versaoAtual = versaoAtual;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      details?: Record<string, unknown>;
    };
    const isFieldValidationError =
      res.status === 422 &&
      body?.details &&
      typeof body.details === 'object' &&
      !('reason' in body.details) &&
      !('codigo' in body.details);
    if (isFieldValidationError) {
      throw new ApiValidationError(
        body?.message ?? 'Preencha os campos obrigatórios.',
        body.details as Record<string, string>,
      );
    }
    const reason =
      body?.details && typeof body.details === 'object' && 'reason' in body.details
        ? String(body.details.reason)
        : body?.details && typeof body.details === 'object' && 'codigo' in body.details
          ? String(body.details.codigo)
          : undefined;
    const versaoAtual =
      body?.details &&
      typeof body.details === 'object' &&
      typeof body.details.versaoAtual === 'number'
        ? body.details.versaoAtual
        : undefined;
    const msg = body?.message ?? 'Erro inesperado ao processar a solicitação.';
    if (reason) {
      throw new OsCommandError(msg, reason, versaoAtual);
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ----- Formulários Operacionais --------------------------------------------

export function useFormsOverview() {
  return useQuery({
    queryKey: ['forms', 'overview'],
    queryFn: () =>
      fetchJson<{
        records: FormRecord[];
        contagens: Record<string, { total: number; naoConformes: number }>;
      }>('/api/forms'),
  });
}

export function useFormRecords(tipo: FormTipo | string) {
  return useQuery({
    queryKey: ['forms', 'records', tipo],
    queryFn: () =>
      fetchJson<{ records: FormRecord[] }>(`/api/forms?tipo=${encodeURIComponent(tipo)}`),
    enabled: Boolean(tipo),
  });
}

export function useCreateFormRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      tipo: string;
      subtipo?: string | null;
      dados: Record<string, unknown>;
    }) =>
      fetchJson<{ record: FormRecord; osFluxo?: OrdemServicoFluxoState | null }>('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['forms', 'records', variables.tipo] });
      qc.invalidateQueries({ queryKey: ['os-flow'] });
    },
  });
}

export function useUpdateFormRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      tipo: string;
      subtipo?: string | null;
      dados: Record<string, unknown>;
      motivo?: string | null;
    }) =>
      fetchJson<{ record: FormRecord; osFluxo?: OrdemServicoFluxoState | null }>('/api/forms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: input.id,
          subtipo: input.subtipo,
          dados: input.dados,
          motivo: input.motivo,
        }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['forms', 'records', variables.tipo] });
      qc.invalidateQueries({ queryKey: ['os-flow'] });
    },
  });
}

// ----- Fluxo de Ordem de Serviço v4 (Comandos, Notificações & Feriados) ----

export interface OsFlowDetailResponse {
  os: OrdemServicoFluxoState | null;
  v4?: {
    estado: Estado;
    eventos: Evento[];
    notificacoes: OsNotificacaoV4Item[];
    reg034Salvo: boolean;
    item5Preenchido: boolean;
  } | null;
}

export function useOsFlowList() {
  return useQuery({
    queryKey: ['os-flow'],
    queryFn: () =>
      fetchJson<{ ordens: OrdemServicoFluxoState[] }>('/api/os-flow?all=true'),
    refetchInterval: 20_000,
  });
}

export function useOsFlowDetail(numeroOs: string | null | undefined) {
  const trimmed = numeroOs?.trim() ?? '';
  return useQuery({
    queryKey: ['os-flow', 'detail', trimmed.toLowerCase()],
    queryFn: () =>
      fetchJson<OsFlowDetailResponse>(`/api/os-flow?os=${encodeURIComponent(trimmed)}`),
    enabled: Boolean(trimmed),
    refetchInterval: 15_000,
  });
}

export function useOsCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      numeroOs: string;
      versaoVista: number;
      comando: Comando;
    }) =>
      fetchJson<{
        os: OrdemServicoFluxoState;
        estado: Estado;
        eventos: Evento[];
        notificacoes: OsNotificacaoV4Item[];
      }>('/api/os-flow/comandos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['os-flow'] });
      qc.invalidateQueries({
        queryKey: ['os-flow', 'detail', variables.numeroOs.trim().toLowerCase()],
      });
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err, variables) => {
      if (err instanceof OsCommandError && err.codigo === 'versao') {
        qc.invalidateQueries({ queryKey: ['os-flow'] });
        qc.invalidateQueries({
          queryKey: ['os-flow', 'detail', variables.numeroOs.trim().toLowerCase()],
        });
      }
    },
  });
}

export function useConfirmOsNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { notificacaoId: string; numeroOs: string }) =>
      fetchJson<{
        ok: boolean;
        notificacao: OsNotificacaoV4Item;
        os: OrdemServicoFluxoState | null;
      }>('/api/os-flow/notificacoes/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['os-flow'] });
      qc.invalidateQueries({
        queryKey: ['os-flow', 'detail', variables.numeroOs.trim().toLowerCase()],
      });
    },
  });
}

export function useFeriados() {
  return useQuery({
    queryKey: ['feriados'],
    queryFn: () => fetchJson<{ feriados: FeriadoRecord[] }>('/api/feriados'),
  });
}

export function useSaveFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      data: string;
      descricao: string;
      escopo?: FeriadoRecord['escopo'];
    }) =>
      fetchJson<{ feriado: FeriadoRecord; feriados: FeriadoRecord[] }>('/api/feriados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feriados'] }),
  });
}

export function useDeleteFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: string) =>
      fetchJson<{ ok: boolean; feriados: FeriadoRecord[] }>(
        `/api/feriados?data=${encodeURIComponent(data)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feriados'] }),
  });
}

export function useSaveOsFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (estado: OrdemServicoFluxoState) =>
      fetchJson<{
        ok: boolean;
        directTableOk: boolean;
        numeroOs: string;
        reg016Record?: FormRecord | null;
      }>('/api/os-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estado),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['os-flow'] });
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

// ----- Não Conformidades (NCs) ---------------------------------------------

export function useNcs(origem?: NcOrigem) {
  const qs = origem ? `?origem=${encodeURIComponent(origem)}` : '';
  return useQuery({
    queryKey: ['ncs', 'list', origem ?? 'all'],
    queryFn: () => fetchJson<{ ncs: Nc[]; resumo: NcResumo }>(`/api/ncs${qs}`),
  });
}

export function useCreateNc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      titulo: string;
      descricao?: string | null;
      causa?: string | null;
      acaoImediata?: string | null;
      identificacaoEquipamento?: string | null;
      equipamentoNaoSeAplica?: boolean;
      elaboradoPor?: string | null;
      revisadoPor?: string | null;
      aprovadoPor?: string | null;
      origem: NcOrigem;
      severidade: NcSeveridade;
    }) =>
      fetchJson<{ nc: Nc }>('/api/ncs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ncs'] }),
  });
}

export function useUpdateNcStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: NcStatus }) =>
      fetchJson<{ nc: Nc }>(`/api/ncs/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ncs'] }),
  });
}

// ----- Treinamentos (REG-008) ----------------------------------------------

export function useTreinamentos() {
  return useQuery({
    queryKey: ['treinamentos', 'list'],
    queryFn: () => fetchJson<{ treinamentos: Treinamento[] }>('/api/treinamentos'),
  });
}

export function useCreateTreinamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      titulo: string;
      tipo: TreinamentoTipo;
      instrutor?: string | null;
      entidade?: string | null;
      cargaHoraria?: number | null;
      dataRealizacao: string;
      validadeAte?: string | null;
      participantes: string[];
      participantesDetalhados?: ParticipanteReg008[];
      observacoes?: string | null;
      conteudo?: string | null;
      localTreinamento?: string | null;
      horarioInicial?: string | null;
      horarioFinal?: string | null;
      avaliadoPor?: string | null;
      dataAvaliacao?: string | null;
      assinaturaAvaliador?: string | null;
      avaliacoesEficacia?: AvaliacaoEficaciaParticipante[];
      elaboradoPor?: string | null;
      revisadoPor?: string | null;
      aprovadoPor?: string | null;
    }) =>
      fetchJson<{ treinamento: Treinamento }>('/api/treinamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treinamentos'] }),
  });
}

export function useUpdateTreinamentoEficacia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      avaliadoPor: string;
      dataAvaliacao: string;
      assinaturaAvaliador: string;
      avaliacoesEficacia: AvaliacaoEficaciaParticipante[];
    }) =>
      fetchJson<{ treinamento: Treinamento }>('/api/treinamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treinamentos'] }),
  });
}
