'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Calendar,
  Clock,
  Layers,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FormRecord } from '@/core/domain/entities/operacional';
import {
  TAG_SPECS,
  type OrdemServicoFluxoState,
  type TagColor,
} from '@/core/domain/forms/os-workflow';
import { cn } from '@/lib/utils';

interface Props {
  totalForms: number;
  totalPopsVigentes: number;
  totalPops: number;
  ncsResumo: { abertas: number; emAndamento: number; concluidas: number; total: number };
  ordensServico: Array<{
    chave: string;
    numeroOs: string;
    cliente: string;
    equipamento: string;
    numeroSerie?: string;
    tagColor: TagColor;
    ultimaAtualizacao: string;
  }>;
  ordensFluxo?: OrdemServicoFluxoState[];
  formRecords?: FormRecord[];
  formContagens?: Record<string, { total: number }>;
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function toYearMonthKey(raw: string | Date | null | undefined): string | null {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const str = String(raw).trim();
  const match = str.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function daysThreshold(periodo: '30d' | '90d' | '12m'): number {
  return periodo === '30d' ? 30 : periodo === '90d' ? 90 : 365;
}

export function DirectorDashboard({
  totalForms,
  totalPopsVigentes,
  totalPops,
  ncsResumo,
  ordensServico,
  ordensFluxo = [],
  formRecords = [],
  formContagens = {},
}: Props) {
  const [periodo, setPeriodo] = React.useState<'30d' | '90d' | '12m'>('30d');

  const ordensNoPeriodo = React.useMemo(() => {
    const limiteMs = Date.now() - daysThreshold(periodo) * 86_400_000;
    return ordensServico.filter((os) => {
      const ts = Date.parse(os.ultimaAtualizacao);
      return Number.isNaN(ts) || ts >= limiteMs;
    });
  }, [ordensServico, periodo]);

  const fluxoNoPeriodo = React.useMemo(() => {
    const limiteMs = Date.now() - daysThreshold(periodo) * 86_400_000;
    return ordensFluxo.filter((o) => {
      const ts = new Date(o.atualizadaEm ?? o.criadaEm).getTime();
      return Number.isNaN(ts) || ts >= limiteMs;
    });
  }, [ordensFluxo, periodo]);

  const osFinalizadasPeriodo = React.useMemo(
    () => ordensNoPeriodo.filter((os) => os.tagColor === 'GREEN').length,
    [ordensNoPeriodo],
  );

  const osEmFluxoPeriodo = React.useMemo(
    () => ordensNoPeriodo.filter((os) => os.tagColor !== 'GREEN' && os.tagColor !== 'RED').length,
    [ordensNoPeriodo],
  );

  const taxaConclusaoOs =
    ordensNoPeriodo.length > 0
      ? Math.round((osFinalizadasPeriodo / ordensNoPeriodo.length) * 100)
      : 0;

  const tempoMedioCiclo = React.useMemo(() => {
    const fechadas = fluxoNoPeriodo.filter((o) => o.estadoGeral === 'finalizada');
    if (fechadas.length === 0) return null;
    const totalDias = fechadas.reduce((acc, o) => {
      const inicio = new Date(o.criadaEm).getTime();
      const fim = new Date(o.atualizadaEm).getTime();
      if (Number.isNaN(inicio) || Number.isNaN(fim) || fim < inicio) return acc;
      return acc + Math.max(0.1, (fim - inicio) / 86_400_000);
    }, 0);
    return Number((totalDias / fechadas.length).toFixed(1));
  }, [fluxoNoPeriodo]);

  // Evolução mensal real nos últimos 6 meses com base em OS e registros salvos
  const evolucaoMensal = React.useMemo(() => {
    const agora = new Date();
    const buckets: Array<{
      key: string;
      mes: string;
      recebidas: number;
      concluidas: number;
      taxa: number;
    }> = [];
    const byKey = new Map<string, { recebidas: Set<string>; concluidas: Set<string> }>();

    for (let i = 5; i >= 0; i -= 1) {
      const ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
      const label = i === 0 ? `${MESES_PT[ref.getMonth()]} (Atual)` : MESES_PT[ref.getMonth()] ?? '';
      byKey.set(key, { recebidas: new Set(), concluidas: new Set() });
      buckets.push({ key, mes: label, recebidas: 0, concluidas: 0, taxa: 0 });
    }

    for (const o of ordensFluxo) {
      const k = toYearMonthKey(o.criadaEm);
      if (k && byKey.has(k)) {
        byKey.get(k)!.recebidas.add(o.numeroOsNormalizado || o.numeroOs);
      }
      if (o.estadoGeral === 'finalizada' || o.etiquetaAtual === 'GREEN') {
        const kf = toYearMonthKey(o.atualizadaEm);
        if (kf && byKey.has(kf)) {
          byKey.get(kf)!.concluidas.add(o.numeroOsNormalizado || o.numeroOs);
        }
      }
    }

    for (const os of ordensServico) {
      const k = toYearMonthKey(os.ultimaAtualizacao);
      if (k && byKey.has(k)) {
        const id = os.numeroOs.trim().toUpperCase();
        byKey.get(k)!.recebidas.add(id);
        if (os.tagColor === 'GREEN') {
          byKey.get(k)!.concluidas.add(id);
        }
      }
    }

    return buckets.map((b) => {
      const entry = byKey.get(b.key)!;
      const recebidas = entry.recebidas.size;
      const concluidas = entry.concluidas.size;
      const taxa = recebidas > 0 ? Math.min(100, Math.round((concluidas / recebidas) * 100)) : 0;
      return { ...b, recebidas, concluidas, taxa };
    });
  }, [ordensFluxo, ordensServico]);

  const maxBarras = React.useMemo(
    () => Math.max(1, ...evolucaoMensal.map((m) => Math.max(m.recebidas, m.concluidas))),
    [evolucaoMensal],
  );

  const resumoSemestre = React.useMemo(() => {
    const rec = evolucaoMensal.reduce((acc, m) => acc + m.recebidas, 0);
    const conc = evolucaoMensal.reduce((acc, m) => acc + m.concluidas, 0);
    const taxa = rec > 0 ? Math.round((conc / rec) * 100) : 0;
    return { rec, conc, taxa };
  }, [evolucaoMensal]);

  const distribuicaoStatus = React.useMemo(() => {
    const counts: Record<TagColor, number> = {
      VIOLET: 0,
      WHITE: 0,
      GRAY: 0,
      ORANGE: 0,
      YELLOW: 0,
      BROWN: 0,
      BLUE: 0,
      BLACK: 0,
      RED: 0,
      GREEN: 0,
    };

    ordensNoPeriodo.forEach((os) => {
      counts[os.tagColor] = (counts[os.tagColor] ?? 0) + 1;
    });

    const total = ordensNoPeriodo.length || 1;
    return Object.entries(counts)
      .map(([cor, qtd]) => ({
        cor: cor as TagColor,
        spec: TAG_SPECS[cor as TagColor],
        qtd,
        pct: ordensNoPeriodo.length > 0 ? Math.round((qtd / total) * 100) : 0,
      }))
      .filter((item) => item.qtd > 0 || ['WHITE', 'VIOLET', 'GREEN', 'YELLOW', 'RED'].includes(item.cor))
      .slice(0, 6);
  }, [ordensNoPeriodo]);

  const metricasSetoriais = React.useMemo(() => {
    const totalAtForms =
      (formContagens['etapas-manutencao']?.total ?? 0) +
      (formContagens['limpeza-equipamento']?.total ?? 0) +
      (formContagens['checklist-manutencao']?.total ?? 0);
    const osPendentesAt = ordensFluxo.filter(
      (o) => o.setorPendente === 'AT' && o.estadoGeral !== 'finalizada' && o.estadoGeral !== 'cancelada',
    ).length;

    const totalCalibracao = formContagens['verificacao-calibracao']?.total ?? 0;
    const calibAprovadas = formRecords.filter(
      (r) => r.tipo === 'verificacao-calibracao' && r.status === 'conforme',
    ).length;

    const totalRecebimento = formContagens['inspecao-recebimento']?.total ?? 0;
    const osAguardandoPecas = ordensServico.filter((o) => o.tagColor === 'BLACK').length;

    return {
      totalAtForms,
      osPendentesAt,
      totalCalibracao,
      calibAprovadas,
      totalRecebimento,
      osAguardandoPecas,
    };
  }, [formContagens, formRecords, ordensFluxo, ordensServico]);

  const taxaConformidadePops = totalPops > 0 ? Math.round((totalPopsVigentes / totalPops) * 100) : 0;
  const taxaResolucaoNc =
    ncsResumo.total > 0 ? Math.round((ncsResumo.concluidas / ncsResumo.total) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Cabeçalho compacto com gradiente esmeralda LinkMed + seletor de período */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 p-4 shadow-xs sm:flex-row sm:items-center sm:p-5 dark:border-emerald-500/20">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Governança & Conformidade RDC 665/22
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Visão Executiva em Tempo Real
          </h2>
          <p className="text-xs text-muted-foreground">
            Dados consolidados diretamente dos registros operacionais, ordens de serviço e auditoria.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-border/80 bg-background/90 p-1 text-xs shadow-2xs">
          <span className="hidden items-center gap-1 px-2 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
            Período:
          </span>
          {(['30d', '90d', '12m'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={cn(
                'ios-touch rounded-lg px-3 py-1.5 text-xs font-medium transition-all touch-manipulation',
                periodo === p
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              {p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : '12 meses'}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Indicadores Executivos Reais (disposição exata preservada + brilho esmeralda) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card via-card to-primary/[0.04] transition-all hover:border-primary/35">
          <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              POPs Vigentes
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.6} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {taxaConformidadePops}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalPopsVigentes}/{totalPops}
              </span>
            </div>
            <Progress value={taxaConformidadePops} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {totalPops > 0
                ? `${totalPopsVigentes} de ${totalPops} POP(s) publicados`
                : 'Nenhum POP cadastrado'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-sky-500/[0.04] transition-all hover:border-primary/35">
          <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ordens no Período
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/25 dark:text-sky-400">
              <Wrench className="h-4 w-4" strokeWidth={1.6} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {ordensNoPeriodo.length} OS
              </span>
              <span className="text-xs font-semibold text-primary tabular-nums">
                {taxaConclusaoOs}% concluídas
              </span>
            </div>
            <Progress value={taxaConclusaoOs} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {osFinalizadasPeriodo} finalizada(s) · {osEmFluxoPeriodo} em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-violet-500/[0.04] transition-all hover:border-primary/35">
          <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ciclo Médio (MTTR)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-400">
              <Clock className="h-4 w-4" strokeWidth={1.6} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {tempoMedioCiclo !== null ? `${tempoMedioCiclo} dias` : `${osEmFluxoPeriodo} ativas`}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {fluxoNoPeriodo.filter((o) => o.estadoGeral === 'finalizada').length} fechada(s)
              </span>
            </div>
            <Progress
              value={tempoMedioCiclo !== null ? Math.min(100, Math.round(taxaConclusaoOs)) : 0}
              className="h-1.5"
            />
            <p className="text-[11px] text-muted-foreground">
              {tempoMedioCiclo !== null
                ? 'Tempo médio entre abertura no REG-022 e Etiqueta Verde'
                : 'Aguardando conclusão das primeiras OS neste período'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card via-card to-amber-500/[0.04] transition-all hover:border-primary/35">
          <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resolução de NCs
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.6} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {taxaResolucaoNc}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {ncsResumo.concluidas}/{ncsResumo.total}
              </span>
            </div>
            <Progress value={taxaResolucaoNc} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {ncsResumo.abertas + ncsResumo.emAndamento} ocorrência(s) em tratamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Reais: Evolução Mensal + Funil de Status REG-016 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <LineChart className="h-4 w-4 text-primary" strokeWidth={1.5} />
                Evolução Mensal Real (Últimos 6 Meses)
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Entradas registradas versus OS concluídas com Etiqueta Verde.
              </p>
            </div>
            <Badge variant="outline" className="hidden tabular-nums sm:inline-flex">
              {resumoSemestre.conc} de {resumoSemestre.rec} concluídas ({resumoSemestre.taxa}%)
            </Badge>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="space-y-3">
              <div className="grid h-44 grid-cols-6 items-end gap-2 border-b border-border/70 pb-2 pt-6 sm:gap-4">
                {evolucaoMensal.map((item) => {
                  const alturaRecebidas =
                    item.recebidas > 0
                      ? Math.max(8, Math.round((item.recebidas / maxBarras) * 100))
                      : 4;
                  const alturaConcluidas =
                    item.concluidas > 0
                      ? Math.max(8, Math.round((item.concluidas / maxBarras) * 100))
                      : 0;

                  return (
                    <div
                      key={item.key}
                      className="group flex h-full flex-col items-center justify-end gap-1.5"
                    >
                      <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-1.5">
                        <div
                          style={{ height: `${alturaRecebidas}%` }}
                          className="relative w-3 rounded-t-md bg-muted-foreground/25 transition-all group-hover:bg-muted-foreground/45 sm:w-5"
                          title={`Entradas em ${item.mes}: ${item.recebidas}`}
                        />
                        {alturaConcluidas > 0 && (
                          <div
                            style={{ height: `${alturaConcluidas}%` }}
                            className="relative w-3 rounded-t-md bg-gradient-to-t from-primary to-emerald-400 shadow-[0_0_12px_hsl(var(--primary)/0.28)] transition-all group-hover:brightness-110 sm:w-5"
                            title={`Concluídas em ${item.mes}: ${item.concluidas}`}
                          />
                        )}
                      </div>
                      <span className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs">
                        {item.mes}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                    <span className="font-medium text-foreground">Concluídas (Verde)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
                    <span>Registradas no mês</span>
                  </div>
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  Taxa real de encerramento: {resumoSemestre.taxa}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
              <Layers className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Equipamentos por Etiqueta
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Distribuição atual das OS no REG-016.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {distribuicaoStatus.map((item) => (
              <div key={item.cor} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-full',
                        item.spec.dotClass,
                      )}
                    />
                    {item.spec.labelStatus}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    <strong className="font-medium text-foreground">{item.qtd}</strong> ({item.pct}%)
                  </span>
                </div>
                <Progress value={item.pct} className="h-1.5" />
              </div>
            ))}

            <div className="border-t border-border/70 pt-3">
              <Link
                href="/equipamentos"
                className="flex items-center justify-between text-xs font-medium text-primary hover:underline"
              >
                <span>Ver fila completa de OS</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panorama Operacional por Setor (Dados Reais) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Atividade Real por Área da Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/35 to-primary/[0.04] p-3.5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Assistência Técnica</span>
                <Badge variant="outline">{metricasSetoriais.osPendentesAt} pendente(s)</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                {metricasSetoriais.totalAtForms}
                <span className="ml-1 text-xs font-normal text-muted-foreground">registros</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                REG-034, REG-016 e REG-035 salvos na base.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/35 to-sky-500/[0.04] p-3.5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Metrologia (REG-030)</span>
                <Badge variant="outline">{metricasSetoriais.calibAprovadas} aprovada(s)</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                {metricasSetoriais.totalCalibracao}
                <span className="ml-1 text-xs font-normal text-muted-foreground">verificações</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Verificações periódicas e calibrações registradas.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/35 to-amber-500/[0.04] p-3.5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Recebimento & Peças</span>
                <Badge variant={metricasSetoriais.osAguardandoPecas > 0 ? 'warning' : 'outline'}>
                  {metricasSetoriais.osAguardandoPecas} em espera
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                {metricasSetoriais.totalRecebimento}
                <span className="ml-1 text-xs font-normal text-muted-foreground">REG-022</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Inspeções de entrada e pendências de almoxarifado.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/35 to-emerald-500/[0.05] p-3.5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Qualidade & Auditoria</span>
                <Badge variant="success">Auditável</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                {totalForms}
                <span className="ml-1 text-xs font-normal text-muted-foreground">formulários</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Registros imutáveis + {totalPopsVigentes} POP(s) publicados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
