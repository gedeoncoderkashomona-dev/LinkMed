'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Filter,
  History,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PERFIL_COR,
  PERFIL_LABEL,
  PERFIL_SHORT_LABEL,
  type Perfil,
} from '@/core/domain/enums/user';
import { cn } from '@/lib/utils';

interface EnrichedAuditLog {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string | null;
  usuarioPerfil: Perfil | null;
  acao: string;
  entidade: string;
  entidadeId: string;
  dadosAntes: unknown;
  dadosDepois: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACAO_META: Record<
  string,
  { label: string; cor: string; categoria: 'pop' | 'assinatura' | 'operacional' | 'auth' }
> = {
  'auth.login': {
    label: 'Login no sistema',
    cor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    categoria: 'auth',
  },
  'auth.logout': {
    label: 'Logout',
    cor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25',
    categoria: 'auth',
  },
  'user.create': {
    label: 'Cadastro de usuário',
    cor: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
    categoria: 'auth',
  },
  'user.update': {
    label: 'Atualização de usuário',
    cor: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
    categoria: 'auth',
  },
  'pop.create': {
    label: 'Criação de POP',
    cor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
    categoria: 'pop',
  },
  'pop.publish': {
    label: 'Envio de POP p/ aprovação',
    cor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    categoria: 'pop',
  },
  'pop.approve': {
    label: 'Aprovação de POP',
    cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    categoria: 'assinatura',
  },
  'pop.reject': {
    label: 'Rejeição de POP',
    cor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    categoria: 'pop',
  },
  'pop.new_version': {
    label: 'Nova versão de POP',
    cor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    categoria: 'pop',
  },
  'pop.confirm_read': {
    label: 'Ciência / Leitura de POP',
    cor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25',
    categoria: 'assinatura',
  },
  'pop.change_request.create': {
    label: 'Sugestão em POP',
    cor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    categoria: 'pop',
  },
  'pop.change_request.respond': {
    label: 'Resposta a sugestão',
    cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    categoria: 'pop',
  },
  'pop.sign': {
    label: 'Assinatura eletrônica',
    cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    categoria: 'assinatura',
  },
  'form.create': {
    label: 'Registro de formulário (REG)',
    cor: 'bg-primary/10 text-primary border-primary/25',
    categoria: 'operacional',
  },
  'nc.create': {
    label: 'Abertura de NC (REG-020)',
    cor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    categoria: 'operacional',
  },
  'nc.update_status': {
    label: 'Avanço de etapa NC',
    cor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    categoria: 'operacional',
  },
  'training.create': {
    label: 'Registro de treinamento',
    cor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    categoria: 'assinatura',
  },
};

export default function AuditoriaPage() {
  const [limit, setLimit] = React.useState<number>(50);
  const [busca, setBusca] = React.useState('');
  const [categoriaAtiva, setCategoriaAtiva] = React.useState<string>('todas');
  const [entidadeFiltro, setEntidadeFiltro] = React.useState<string>('todas');
  const [expandidoId, setExpandidoId] = React.useState<string | null>(null);

  const {
    data: logs,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit', 'list', limit],
    queryFn: async (): Promise<EnrichedAuditLog[]> => {
      const res = await fetch(`/api/audit?limit=${limit}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Não foi possível carregar os registros de auditoria.');
      const data = (await res.json()) as { logs: EnrichedAuditLog[] };
      return data.logs;
    },
    staleTime: 30_000,
  });

  const entidades = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of logs ?? []) set.add(l.entidade);
    return Array.from(set).sort();
  }, [logs]);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (logs ?? []).filter((l) => {
      if (categoriaAtiva !== 'todas') {
        const cat = ACAO_META[l.acao]?.categoria;
        if (cat !== categoriaAtiva) return false;
      }
      if (entidadeFiltro !== 'todas' && l.entidade !== entidadeFiltro) return false;
      if (!q) return true;
      return (
        l.usuarioNome.toLowerCase().includes(q) ||
        l.acao.toLowerCase().includes(q) ||
        l.entidade.toLowerCase().includes(q) ||
        l.entidadeId.toLowerCase().includes(q)
      );
    });
  }, [logs, busca, categoriaAtiva, entidadeFiltro]);

  const kpis = React.useMemo(() => {
    const list = logs ?? [];
    const assinaturasEAprovacoes = list.filter(
      (l) => l.acao === 'pop.approve' || l.acao === 'pop.sign' || l.acao === 'pop.confirm_read',
    ).length;
    const registrosOperacionais = list.filter(
      (l) => l.acao === 'form.create' || l.acao === 'nc.create' || l.acao === 'training.create',
    ).length;
    const autoresUnicos = new Set(list.map((l) => l.usuarioId)).size;
    return {
      total: list.length,
      assinaturasEAprovacoes,
      registrosOperacionais,
      autoresUnicos,
    };
  }, [logs]);

  function exportarCsv() {
    if (!filtrados.length) return;
    const header = [
      'Data_Hora',
      'Usuario',
      'Perfil',
      'Acao',
      'Entidade',
      'Entidade_ID',
      'IP',
      'Dados_Antes',
      'Dados_Depois',
    ];
    const rows = filtrados.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.usuarioNome,
      l.usuarioPerfil ?? '',
      l.acao,
      l.entidade,
      l.entidadeId,
      l.ip ?? '',
      l.dadosAntes ? JSON.stringify(l.dadosAntes) : '',
      l.dadosDepois ? JSON.stringify(l.dadosDepois) : '',
    ]);
    const csvContent = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-regulaon-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pt-1">
      {/* Cabeçalho da Trilha de Auditoria */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Trilha de Auditoria
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              Imutável RDC 665/22
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro cronológico contínuo de assinaturas, modificações e operações no sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 shadow-2xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
            <span>{isFetching ? 'Sincronizando...' : 'Atualizar Trilha'}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={exportarCsv}
            disabled={!filtrados.length}
            className="gap-2 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV ({filtrados.length})</span>
          </Button>
        </div>
      </div>

      {/* Indicador de Status da Trilha */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Conexão Segura com Banco de Auditoria
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isFetching
                ? 'Buscando registros mais recentes do servidor...'
                : `Última sincronização bem-sucedida · ${logs?.length ?? 0} registros carregados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[11px]">
            Lote atual: {limit} eventos
          </span>
          {limit < 200 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((l) => Math.min(l + 50, 200))}
              className="h-7 text-xs"
            >
              + Carregar mais 50
            </Button>
          )}
        </div>
      </div>

      {/* KPIs da Auditoria */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Eventos no Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Registros imutáveis auditados
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aprovações & Leituras
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.assinaturasEAprovacoes}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Assinaturas e ciência de POPs
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Registros Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-primary">{kpis.registrosOperacionais}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Formulários REGs e NCs
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Autores Únicos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{kpis.autoresUnicos}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Colaboradores com ações registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de Categorias Rápidas */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2">
        {[
          { id: 'todas', label: 'Todos os Eventos' },
          { id: 'assinatura', label: 'Assinaturas & Aprovações' },
          { id: 'pop', label: 'Documentos & POPs' },
          { id: 'operacional', label: 'Registros Operacionais (REGs)' },
          { id: 'auth', label: 'Acesso & Segurança' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategoriaAtiva(tab.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              categoriaAtiva === tab.id
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de Busca e Entidade */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome do usuário, ação, ID da entidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 pr-14 bg-card shadow-xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>

        <SelectNative
          value={entidadeFiltro}
          onChange={(e) => setEntidadeFiltro(e.target.value)}
          className="w-full sm:w-60 bg-card shadow-xs"
        >
          <option value="todas">Todas as entidades ({entidades.length})</option>
          {entidades.map((ent) => (
            <option key={ent} value={ent}>
              Entidade: {ent}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Lista da Trilha (Timeline) */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            Acesso restrito a Diretor e Gestor da Qualidade.
          </p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <History className="mx-auto h-9 w-9 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-semibold">Nenhum evento corresponde aos filtros</p>
          <p className="text-xs text-muted-foreground">
            Ajuste os filtros de busca ou selecione outra categoria acima.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtrados.map((log) => {
            const meta = ACAO_META[log.acao] ?? {
              label: log.acao,
              cor: 'bg-muted text-foreground border-border',
              categoria: 'operacional',
            };
            const aberto = expandidoId === log.id;
            const temPayload = Boolean(log.dadosAntes || log.dadosDepois);

            return (
              <Card
                key={log.id}
                className={cn(
                  'overflow-hidden transition-all duration-150 border-border/80 shadow-2xs hover:border-primary/40',
                  aberto && 'border-primary/50 shadow-xs',
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandidoId(aberto ? null : log.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandidoId(aberto ? null : log.id);
                    }
                  }}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-3.5 text-left select-none hover:bg-accent/25"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                    {aberto ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}

                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold px-2.5 py-0.5 border shadow-2xs', meta.cor)}
                    >
                      {meta.label}
                    </Badge>

                    <div className="min-w-0 flex items-center flex-wrap gap-2 text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        {log.usuarioNome}
                      </span>

                      {log.usuarioPerfil && (
                        <Badge
                          variant="outline"
                          title={PERFIL_LABEL[log.usuarioPerfil]}
                          className={cn('text-[10px] font-medium border px-1.5 py-0', PERFIL_COR[log.usuarioPerfil])}
                        >
                          {PERFIL_SHORT_LABEL[log.usuarioPerfil] ?? PERFIL_LABEL[log.usuarioPerfil]}
                        </Badge>
                      )}

                      <span className="text-muted-foreground">
                        · {log.entidade}{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                          {log.entidadeId.slice(0, 10)}
                        </code>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {log.ip && (
                      <span className="hidden font-mono text-[11px] sm:inline opacity-80">
                        IP: {log.ip}
                      </span>
                    )}
                    <span className="font-medium text-foreground/90">
                      {new Date(log.createdAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>
                </div>

                {aberto && (
                  <div className="border-t border-border/80 bg-muted/20 p-4 text-xs animate-fade-in">
                    <div className="mb-3 flex flex-wrap gap-4 text-muted-foreground text-[11px]">
                      <span>
                        <strong className="text-foreground">Identificador Técnico:</strong>{' '}
                        <code className="font-mono text-primary">{log.acao}</code>
                      </span>
                      <span>
                        <strong className="text-foreground">ID do Registro:</strong>{' '}
                        <code className="font-mono">{log.entidadeId}</code>
                      </span>
                      {log.userAgent && (
                        <span className="truncate max-w-lg" title={log.userAgent}>
                          <strong className="text-foreground">Dispositivo:</strong> {log.userAgent}
                        </span>
                      )}
                    </div>

                    {temPayload ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-border/80 bg-background p-3 shadow-2xs">
                          <p className="mb-1.5 font-semibold text-muted-foreground text-[11px]">
                            Estado Anterior (dadosAntes)
                          </p>
                          <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                            {log.dadosAntes
                              ? JSON.stringify(log.dadosAntes, null, 2)
                              : '— (Criação / Sem estado anterior)'}
                          </pre>
                        </div>
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 shadow-2xs">
                          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 text-[11px]">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Estado Registrado Criptograficamente (dadosDepois)
                          </p>
                          <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-foreground">
                            {log.dadosDepois ? JSON.stringify(log.dadosDepois, null, 2) : '—'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-[11px]">
                        Evento auditado registrado com sucesso. Nenhum payload diferencial de campo.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
