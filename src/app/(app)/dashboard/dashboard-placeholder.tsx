'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  Tag,
  Wrench,
} from 'lucide-react';

import { DirectorDashboard } from '@/components/dashboard/director-dashboard';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { POP_STATUS_LABEL, POP_STATUS_VARIANT, SETOR_LABEL } from '@/core/domain/enums/pop';
import { PERFIL_LABEL } from '@/core/domain/enums/user';
import { calcularAlertas } from '@/core/domain/forms/alerts';
import { aggregateServiceOrders, TAG_SPECS } from '@/core/domain/forms/os-workflow';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFormsOverview, useNcs } from '@/hooks/use-operacional';
import { usePops } from '@/hooks/use-pops';
import { cn } from '@/lib/utils';

export function DashboardPlaceholder() {
  const { data: user } = useCurrentUser();
  const { data: popsData, isLoading: loadingPops } = usePops();
  const { data: formsData, isLoading: loadingForms } = useFormsOverview();
  const { data: ncsData, isLoading: loadingNcs } = useNcs();

  const popsVigentes = React.useMemo(
    () => (popsData?.pops ?? []).filter((p) => p.status === 'publicado').length,
    [popsData?.pops],
  );

  const alertas = React.useMemo(
    () => calcularAlertas(formsData?.records ?? []),
    [formsData?.records],
  );

  const todasOrdensServico = React.useMemo(
    () => aggregateServiceOrders(formsData?.records ?? []),
    [formsData?.records],
  );

  const ordensServico = React.useMemo(
    () => todasOrdensServico.slice(0, 5),
    [todasOrdensServico],
  );

  const [visaoDiretor, setVisaoDiretor] = React.useState<'estrategica' | 'operacional'>('estrategica');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);

  const totalForms = React.useMemo(() => {
    const c = formsData?.contagens ?? {};
    return Object.values(c).reduce((acc, v) => acc + v.total, 0);
  }, [formsData?.contagens]);

  const resumoNc = ncsData?.resumo ?? {
    abertas: 0,
    emAndamento: 0,
    concluidas: 0,
    total: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user?.perfil === 'diretor'
              ? visaoDiretor === 'estrategica'
                ? 'Painel Executivo da Diretoria'
                : 'Painel Operacional de Bancada'
              : 'Painel Operacional'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user
              ? `${PERFIL_LABEL[user.perfil]} · Assistência Técnica, Qualidade e Almoxarifado (RDC 665/22).`
              : 'Carregando visão...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.perfil === 'diretor' && (
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setVisaoDiretor('estrategica')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all touch-manipulation',
                  visaoDiretor === 'estrategica'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Estatísticas & Evolução</span>
              </button>
              <button
                type="button"
                onClick={() => setVisaoDiretor('operacional')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all touch-manipulation',
                  visaoDiretor === 'operacional'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Visão de Bancada</span>
              </button>
            </div>
          )}

          <Link href="/equipamentos">
            <Button size="sm">
              <Wrench className="h-4 w-4" />
              Fila de OS / Equipamentos
            </Button>
          </Link>
        </div>
      </div>

      {/* Se o perfil for Diretor e estiver na visão estratégica, renderiza o painel executivo */}
      {user?.perfil === 'diretor' && visaoDiretor === 'estrategica' ? (
        <DirectorDashboard
          totalForms={totalForms}
          totalPopsVigentes={popsVigentes}
          totalPops={popsData?.pops.length ?? 0}
          ncsResumo={resumoNc}
          ordensServico={todasOrdensServico}
        />
      ) : (
        <>

      {/* KPIs Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Documentos vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPops ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {popsVigentes}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  de {popsData?.pops.length ?? 0} POP(s) cadastrados
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              NCs em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNcs ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {resumoNc.abertas + resumoNc.emAndamento}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {resumoNc.abertas} aberta(s) · {resumoNc.emAndamento} em andamento ·{' '}
                  {resumoNc.concluidas} concluída(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Registros Operacionais (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingForms ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{totalForms}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Checklists e controles preenchidos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Alertas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingForms ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    alertas.length > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {alertas.length}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {alertas.length > 0
                    ? 'Ações periódicas ou calibrações pendentes'
                    : 'Todas as rotinas em dia'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna Esquerda: Fila de OS e POPs Recentes */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Ordens de Serviço Recentes (REG-016 / POP-020)
              </CardTitle>
              <Link href="/equipamentos">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingForms ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : ordensServico.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhuma Ordem de Serviço registrada ainda.{' '}
                  <Link
                    href="/formularios/inspecao-recebimento"
                    className="font-semibold text-primary underline"
                  >
                    Iniciar Inspeção de Recebimento (REG-022)
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ordensServico.map((os) => {
                    const tag = TAG_SPECS[os.tagColor];
                    return (
                      <div
                        key={os.chave}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDossierOs(os.numeroOs)}
                              className="font-mono font-semibold text-primary underline hover:text-primary/80 cursor-pointer"
                              title="Clique para abrir o Dossiê completo desta OS"
                            >
                              OS {os.numeroOs}
                            </button>
                            <span className="font-medium text-foreground">
                              {os.equipamento || 'Equipamento'}
                            </span>
                            {os.numeroSerie && (
                              <span className="text-muted-foreground">
                                (S/N: {os.numeroSerie})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Cliente: {os.cliente || '—'} · Atualizado em{' '}
                            {os.ultimaAtualizacao.split('-').reverse().join('/')}
                          </p>
                        </div>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                            tag.badgeClass,
                          )}
                        >
                          <Tag className="h-3 w-3" />
                          {tag.nomeCor}: {tag.labelStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Documentos Recentes (POPs)</CardTitle>
              <Link href="/pops">
                <Button variant="ghost" size="sm">
                  Gerenciar POPs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingPops ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !popsData?.pops.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum POP cadastrado.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {popsData.pops.slice(0, 4).map((pop) => (
                    <div
                      key={pop.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {pop.codigo} — {pop.titulo}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {SETOR_LABEL[pop.setor]} · v{pop.versaoAtual || 1}
                          </p>
                        </div>
                      </div>
                      <Badge variant={POP_STATUS_VARIANT[pop.status]}>
                        {POP_STATUS_LABEL[pop.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Alertas e NCs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alertas de Rotina & Calibração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loadingForms ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : alertas.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Todos os registros periódicos (Bancada, Temperatura/Umidade e Calibrações) estão em dia!
                  </span>
                </div>
              ) : (
                alertas.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className={cn(
                      'block rounded-lg border p-3 text-xs transition-colors hover:bg-accent/50',
                      a.nivel === 'danger'
                        ? 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300'
                        : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">{a.titulo}</p>
                        <p className="mt-0.5 opacity-90">{a.descricao}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Resumo de NCs</CardTitle>
              <Link href="/ncs">
                <Button variant="ghost" size="sm">
                  Abrir NCs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Abertas
                </span>
                <strong className="text-sm">{resumoNc.abertas}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
                <span className="font-medium">Em andamento</span>
                <strong className="text-sm">{resumoNc.emAndamento}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">Concluídas</span>
                <strong className="text-sm">{resumoNc.concluidas}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}

      {/* Dossiê completo ao clicar na OS */}
      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />
    </div>
  );
}