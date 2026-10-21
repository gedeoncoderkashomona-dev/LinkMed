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

export class ApiValidationError extends Error {
  fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      details?: Record<string, string>;
    };
    const isFieldValidationError =
      res.status === 422 &&
      body?.details &&
      typeof body.details === 'object' &&
      !('reason' in body.details);
    if (isFieldValidationError) {
      throw new ApiValidationError(
        body?.message ?? 'Preencha os campos obrigatórios.',
        body.details,
      );
    }
    const reason =
      body?.details && typeof body.details === 'object' && 'reason' in body.details
        ? String(body.details.reason)
        : undefined;
    throw new Error(
      reason ? `${body?.message ?? 'Erro'} (${reason})` : (body?.message ?? 'Erro inesperado.'),
    );
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
      fetchJson<{ record: FormRecord }>('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['forms', 'records', variables.tipo] });
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
