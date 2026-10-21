'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Pop,
  PopWithDetails,
  PopVersion,
  PopChangeRequest,
  PopReadConfirmation,
} from '@/core/domain/entities/pop';
import type { Setor, PopStatus } from '@/core/domain/enums/pop';

interface ListFilters {
  setor?: Setor;
  status?: PopStatus;
  search?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string })?.message ?? 'Erro inesperado.');
  }
  return res.json() as Promise<T>;
}

export function usePops(filters?: ListFilters) {
  const params = new URLSearchParams();
  if (filters?.setor) params.set('setor', filters.setor);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();

  return useQuery({
    queryKey: ['pops', 'list', filters],
    queryFn: () => fetchJson<{ pops: PopWithDetails[] }>(`/api/pops${qs ? `?${qs}` : ''}`),
  });
}

export interface PopDetail {
  pop: Pop;
  versaoVigente: PopVersion | null;
  versoes: PopVersion[];
  changeRequests: PopChangeRequest[];
  leituraConfirmadaPorMim?: boolean;
}

export function usePop(id: string | null) {
  return useQuery({
    queryKey: ['pops', 'detail', id],
    queryFn: () => fetchJson<PopDetail>(`/api/pops/${id}`),
    enabled: !!id,
  });
}

export interface ReadReportEntry {
  userId: string;
  nomeCompleto: string;
  email: string;
  perfil: string;
  setor: string | null;
  confirmadoEm: Date | null;
}

export interface ReadReport {
  versaoVigente: PopVersion;
  totalEsperado: number;
  totalConfirmado: number;
  lidos: ReadReportEntry[];
  pendentes: ReadReportEntry[];
}

export function useReadReport(popId: string | null) {
  return useQuery({
    queryKey: ['pops', 'read-report', popId],
    queryFn: () => fetchJson<ReadReport>(`/api/pops/${popId}/read-report`),
    enabled: !!popId,
  });
}

export function useCreatePop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao?: string | null;
      setor: Setor;
      periodicidadeRevisaoMeses: number;
      elaboradoPor?: string | null;
      revisadoPor?: string | null;
      aprovadoPorNome?: string | null;
      arquivo: File;
    }) => {
      const form = new FormData();
      form.append('titulo', input.titulo);
      if (input.descricao) form.append('descricao', input.descricao);
      form.append('setor', input.setor);
      form.append('periodicidadeRevisaoMeses', String(input.periodicidadeRevisaoMeses));
      if (input.elaboradoPor) form.append('elaboradoPor', input.elaboradoPor);
      if (input.revisadoPor) form.append('revisadoPor', input.revisadoPor);
      if (input.aprovadoPorNome) form.append('aprovadoPorNome', input.aprovadoPorNome);
      form.append('arquivo', input.arquivo);
      return fetchJson<{ pop: Pop }>('/api/pops', { method: 'POST', body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function usePublishPop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ pop: Pop }>(`/api/pops/${id}/publish`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function useApprovePop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ pop: Pop; assinatura: string }>(`/api/pops/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function useRejectPop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; motivo: string }) =>
      fetchJson<{ pop: Pop }>(`/api/pops/${input.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: input.motivo }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function useNewVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; arquivo: File }) => {
      const form = new FormData();
      form.append('arquivo', input.arquivo);
      return fetchJson<{ pop: Pop; versao: PopVersion }>(
        `/api/pops/${input.id}/new-version`,
        { method: 'POST', body: form },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function useConfirmRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ confirmacao: PopReadConfirmation }>(`/api/pops/${id}/confirm-read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pops'] });
    },
  });
}

export function useCreateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; descricao: string }) =>
      fetchJson<{ changeRequest: PopChangeRequest }>(
        `/api/pops/${input.id}/change-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao: input.descricao }),
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}

export function useRespondChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      popId: string;
      crId: string;
      status: 'aprovada' | 'rejeitada';
      resposta: string;
    }) =>
      fetchJson<{ changeRequest: PopChangeRequest }>(
        `/api/pops/${input.popId}/change-requests/${input.crId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: input.status, resposta: input.resposta }),
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pops'] }),
  });
}
