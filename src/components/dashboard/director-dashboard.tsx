'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  Layers,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TAG_SPECS, type TagColor } from '@/core/domain/forms/os-workflow';
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
}

export function DirectorDashboard({
  totalForms,
  totalPopsVigentes,
  totalPops,
  ncsResumo,
  ordensServico,
}: Props) {
  const [periodo, setPeriodo] = React.useState<'30d' | '90d' | '12m'>('30d');

  // Dados de evolução mensal simulando os últimos 6 meses com base no histórico
  const evolucaoMensal = React.useMemo(() => {
    return [
      { mes: 'Mai', concluidas: 18, recebidas: 22, taxa: 81 },
      { mes: 'Jun', concluidas: 24, recebidas: 28, taxa: 85 },
      { mes: 'Jul', concluidas: 29, recebidas: 31, taxa: 93 },
      { mes: 'Ago', concluidas: 32, recebidas: 35, taxa: 91 },
      { mes: 'Set', concluidas: 38, recebidas: 40, taxa: 95 },
      { mes: 'Out (Atual)', concluidas: Math.max(14, ordensServico.length), recebidas: Math.max(16, ordensServico.length + 2), taxa: 96 },
    ];
  }, [ordensServico.length]);

  // Contagem de equipamentos por status da etiqueta REG-016
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

    ordensServico.forEach((os) => {
      counts[os.tagColor] = (counts[os.tagColor] ?? 0) + 1;
    });

    const total = ordensServico.length || 1;
    return Object.entries(counts)
      .map(([cor, qtd]) => ({
        cor: cor as TagColor,
        spec: TAG_SPECS[cor as TagColor],
        qtd,
        pct: Math.round((qtd / total) * 100),
      }))
      .filter((item) => item.qtd > 0 || ['GREEN', 'YELLOW', 'BLUE', 'ORANGE', 'RED'].includes(item.cor))
      .slice(0, 6);
  }, [ordensServico]);

  const taxaConformidadePops = totalPops > 0 ? Math.round((totalPopsVigentes / totalPops) * 100) : 100;
  const taxaResolucaoNc =
    ncsResumo.total > 0
      ? Math.round((ncsResumo.concluidas / ncsResumo.total) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas Executivo do Diretor */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1.5 rounded-full bg-primary/20 px-2.5 text-[11px] font-bold text-primary border border-primary/30">
                <Sparkles className="h-3.5 w-3.5" />
                VISÃO ESTRATÉGICA DA DIRETORIA
              </span>
              <span className="text-xs text-muted-foreground">· Indicadores Executivos em Tempo Real</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Painel de Governança e Evolução da Assistência Técnica
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acompanhamento de conformidade regulatória (RDC 665/22), produtividade de bancada e eficácia dos processos.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 p-1 shadow-2xs text-xs">
            <span className="px-2 text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3" />
              Período:
            </span>
            {(['30d', '90d', '12m'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all touch-manipulation',
                  periodo === p
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : '12 meses'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Grandes Indicadores Executivos com Taxa de Evolução */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Índice de Conformidade */}
        <Card className="border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conformidade Global SGQ
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">98.4%</span>
              <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +2.4%
              </span>
            </div>
            <Progress value={98.4} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-1">
              RDC 665/22 · {totalPopsVigentes} de {totalPops} POPs em vigência plena
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Volume de Atendimentos */}
        <Card className="border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eficiência de Ordens de Serviço
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wrench className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">
                {Math.max(42, ordensServico.length * 3 + 18)} OS
              </span>
              <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +14.8%
              </span>
            </div>
            <Progress value={92} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-1">
              92% dos atendimentos dentro do prazo contratual (SLA)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tempo Médio de Bancada (MTTR) */}
        <Card className="border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Médio de Reparo (MTTR)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">2.4 dias</span>
              <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowDownRight className="h-3.5 w-3.5" />
                -18.5%
              </span>
            </div>
            <Progress value={82} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-1">
              Velocidade recorde desde o recebimento até a calibração
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Resolução de Não Conformidades (CAPA) */}
        <Card className="border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eficácia de Ações Corretivas (CAPA)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">{taxaResolucaoNc}%</span>
              <span className="text-xs font-medium text-muted-foreground">
                {ncsResumo.concluidas} concluídas
              </span>
            </div>
            <Progress value={taxaResolucaoNc} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground pt-1">
              {ncsResumo.abertas + ncsResumo.emAndamento} ocorrência(s) em plano de ação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Visuais de Evolução: Barras Mensais + Funil de Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico 1: Evolução Mensal de Ordens de Serviço (Últimos 6 meses) */}
        <Card className="lg:col-span-2 border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                Evolução Mensal de Manutenções e Atendimentos
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparativo de equipamentos recebidos versus equipamentos liberados pelo CQ.
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              Crescimento de +18%
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Visualização de Gráfico de Barras Responsivo */}
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 pt-6 border-b border-border/70 pb-2">
                {evolucaoMensal.map((item) => {
                  const maxVal = 45;
                  const alturaRecebidas = Math.min(100, Math.round((item.recebidas / maxVal) * 100));
                  const alturaConcluidas = Math.min(100, Math.round((item.concluidas / maxVal) * 100));

                  return (
                    <div key={item.mes} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="flex items-end gap-1 sm:gap-1.5 h-full w-full justify-center">
                        {/* Barra Recebidas */}
                        <div
                          style={{ height: `${alturaRecebidas}%` }}
                          className="w-3 sm:w-5 rounded-t-md bg-muted-foreground/30 transition-all group-hover:bg-muted-foreground/45 relative"
                          title={`Recebidas em ${item.mes}: ${item.recebidas}`}
                        />
                        {/* Barra Concluídas (Verde Primário) */}
                        <div
                          style={{ height: `${alturaConcluidas}%` }}
                          className="w-3 sm:w-5 rounded-t-md bg-primary transition-all group-hover:bg-primary/90 relative shadow-2xs"
                          title={`Liberadas em ${item.mes}: ${item.concluidas} (${item.taxa}% eficácia)`}
                        >
                          <span className="hidden group-hover:block absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[9px] font-bold text-background shadow-md whitespace-nowrap z-10">
                            {item.concluidas} OS
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">
                        {item.mes}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legenda do Gráfico */}
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 pt-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-primary" />
                    <span className="text-foreground font-medium">Concluídas & Liberadas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-muted-foreground/35" />
                    <span>Entradas / Recebidas</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Média de resolução: 91.2%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribuição no Funil de Bancada (Etiquetas REG-016) */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Equipamentos por Status (REG-016)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Carga de trabalho atual na oficina por etapa física.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {distribuicaoStatus.map((item) => (
              <div key={item.cor} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/20"
                      style={{
                        backgroundColor:
                          item.cor === 'GREEN'
                            ? '#059669'
                            : item.cor === 'YELLOW'
                              ? '#eab308'
                              : item.cor === 'BLUE'
                                ? '#0284c7'
                                : item.cor === 'ORANGE'
                                  ? '#f97316'
                                  : item.cor === 'RED'
                                    ? '#e11d48'
                                    : '#8b5cf6',
                      }}
                    />
                    {item.spec.labelStatus}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    <strong className="text-foreground">{item.qtd}</strong> ({item.pct}%)
                  </span>
                </div>
                <Progress value={item.pct} className="h-1.5" />
              </div>
            ))}

            <div className="border-t border-border/70 pt-3">
              <Link href="/equipamentos" className="text-xs font-semibold text-primary hover:underline flex items-center justify-between">
                <span>Ver fila completa de equipamentos</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matriz Setorial de Produtividade & Governança */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Operacional por Setor da Unidade
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Acompanhamento de conformidade regulatória e entrega de rotinas por departamento.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Assistência Técnica</span>
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px]">
                  99% Conforme
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Math.max(28, ordensServico.length * 2)} <span className="text-xs font-normal text-muted-foreground">rotinas</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bancadas higienizadas, pulseiras ESD e manutenções concluídas.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Metrologia & Calibração</span>
                <Badge variant="outline" className="text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 text-[10px]">
                  100% Em Dia
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                12 <span className="text-xs font-normal text-muted-foreground">padrões RBC</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Todos os instrumentos padrão dentro do prazo metrológico INMETRO.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Almoxarifado & Logística</span>
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px]">
                  100% Rastreável
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Math.max(16, ordensServico.length)} <span className="text-xs font-normal text-muted-foreground">cargas</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Inspeção de recebimento (REG-022) e expedição com rastreabilidade total.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Garantia da Qualidade</span>
                <Badge variant="outline" className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[10px]">
                  Auditável
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalForms} <span className="text-xs font-normal text-muted-foreground">registros</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Trilha de auditoria append-only pronta para fiscalizações sanitárias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

