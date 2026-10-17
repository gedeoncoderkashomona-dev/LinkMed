'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  ShieldAlert,
  Tag,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FORM_DEFS } from '@/core/domain/forms/definitions';
import { aggregateServiceOrders, TAG_SPECS, type TagColor } from '@/core/domain/forms/os-workflow';
import { useFormsOverview, useNcs, useTreinamentos } from '@/hooks/use-operacional';
import { usePops } from '@/hooks/use-pops';
import { cn } from '@/lib/utils';

const TAG_ORDER: TagColor[] = [
  'VIOLET',
  'WHITE',
  'GRAY',
  'ORANGE',
  'YELLOW',
  'BROWN',
  'BLUE',
  'BLACK',
  'RED',
  'GREEN',
];

export default function IndicadoresPage() {
  const { data: formsData, isLoading: loadingForms } = useFormsOverview();
  const { data: popsData, isLoading: loadingPops } = usePops();
  const { data: ncsData, isLoading: loadingNcs } = useNcs();
  const { data: treinosData, isLoading: loadingTreinos } = useTreinamentos();

  const isLoading = loadingForms || loadingPops || loadingNcs || loadingTreinos;

  // 1. Métricas de Formulários (REGs)
  const formStats = React.useMemo(() => {
    const records = formsData?.records ?? [];
    const total = records.length;
    const naoConformes = records.filter((r) => r.status === 'nao_conforme').length;
    const conformes = total - naoConformes;
    const taxaConformidade = total > 0 ? Math.round((conformes / total) * 100) : 100;

    const porModulo = FORM_DEFS.map((def) => {
      const doTipo = records.filter((r) => r.tipo === def.tipo);
      const nc = doTipo.filter((r) => r.status === 'nao_conforme').length;
      const tot = doTipo.length;
      const pct = tot > 0 ? Math.round(((tot - nc) / tot) * 100) : 100;
      return {
        tipo: def.tipo,
        codigo: def.reg ?? 'S/REG',
        titulo: def.titulo,
        total: tot,
        naoConformes: nc,
        conformes: tot - nc,
        pctConformidade: pct,
      };
    });

    return { total, conformes, naoConformes, taxaConformidade, porModulo };
  }, [formsData?.records]);

  // 2. Funil de OS e Etiquetas REG-016
  const osStats = React.useMemo(() => {
    const records = formsData?.records ?? [];
    const osList = aggregateServiceOrders(records);
    const totalOs = osList.length;
    const porCor: Record<TagColor, number> = {
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

    for (const os of osList) {
      porCor[os.tagColor] = (porCor[os.tagColor] ?? 0) + 1;
    }

    const osComNcKeys = new Set(
      records
        .filter((r) => r.status === 'nao_conforme' && (r.dados?.numero_os || r.dados?.numero_serie))
        .map((r) => String(r.dados.numero_os || r.dados.numero_serie).toUpperCase()),
    );
    const comRetrabalhoOuNc = osComNcKeys.size;
    const finalizadas = porCor.GREEN;
    const taxaFinalizacao = totalOs > 0 ? Math.round((finalizadas / totalOs) * 100) : 0;
    const indiceRetrabalho = totalOs > 0 ? Math.round((comRetrabalhoOuNc / totalOs) * 100) : 0;

    return { totalOs, porCor, finalizadas, taxaFinalizacao, comRetrabalhoOuNc, indiceRetrabalho };
  }, [formsData?.records]);

  // 3. Indicadores de Não Conformidade (REG-020)
  const ncStats = React.useMemo(() => {
    const ncs = ncsData?.ncs ?? [];
    const resumo = ncsData?.resumo ?? { abertas: 0, emAndamento: 0, concluidas: 0, total: 0 };
    const taxaResolucao =
      resumo.total > 0 ? Math.round((resumo.concluidas / resumo.total) * 100) : 100;

    const porSeveridade = {
      leve: ncs.filter((n) => n.severidade === 'leve').length,
      moderada: ncs.filter((n) => n.severidade === 'moderada').length,
      grave: ncs.filter((n) => n.severidade === 'grave').length,
    };

    const porOrigem = {
      assistencia_tecnica: ncs.filter((n) => n.origem === 'assistencia_tecnica').length,
      almoxarifado: ncs.filter((n) => n.origem === 'almoxarifado').length,
      qualidade: ncs.filter((n) => n.origem === 'qualidade').length,
    };

    return { resumo, taxaResolucao, porSeveridade, porOrigem };
  }, [ncsData]);

  // 4. Indicadores de POPs e Treinamentos
  const docAndTrainingStats = React.useMemo(() => {
    const pops = popsData?.pops ?? [];
    const publicados = pops.filter((p) => p.status === 'publicado');
    const totalConfirmacoes = publicados.reduce((acc, p) => acc + p.totalConfirmacoes, 0);
    const totalPendentes = publicados.reduce((acc, p) => acc + p.totalPendentes, 0);
    const totalEsperado = totalConfirmacoes + totalPendentes;
    const coberturaLeitura =
      totalEsperado > 0 ? Math.round((totalConfirmacoes / totalEsperado) * 100) : 100;

    const treinos = treinosData?.treinamentos ?? [];
    const internos = treinos.filter((t) => t.tipo === 'interno').length;
    const externos = treinos.filter((t) => t.tipo === 'externo').length;

    return {
      totalPops: pops.length,
      popsPublicados: publicados.length,
      coberturaLeitura,
      totalConfirmacoes,
      totalPendentes,
      totalTreinos: treinos.length,
      internos,
      externos,
    };
  }, [popsData?.pops, treinosData?.treinamentos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Indicadores & Métricas da Qualidade (SGQ)
        </h1>
        <p className="text-sm text-muted-foreground">
          Análise consolidada de conformidade operacional, retrabalho, eficácia de CAPA e cobertura documental (RDC 665/22).
        </p>
      </div>

      {/* KPIs Executivos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Conformidade Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formStats.taxaConformidade}%
                </p>
                <Progress value={formStats.taxaConformidade} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {formStats.conformes} conformes de {formStats.total} registros (REGs)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Índice de Retrabalho / RNC em OS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    osStats.indiceRetrabalho > 15
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground',
                  )}
                >
                  {osStats.indiceRetrabalho}%
                </p>
                <Progress value={osStats.indiceRetrabalho} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {osStats.comRetrabalhoOuNc} de {osStats.totalOs} OS com desvio técnico
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Eficácia de NCs (Concluídas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{ncStats.taxaResolucao}%</p>
                <Progress value={ncStats.taxaResolucao} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {ncStats.resumo.concluidas} encerradas · {ncStats.resumo.abertas} abertas ·{' '}
                  {ncStats.resumo.emAndamento} em andamento
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cobertura de Leitura (POPs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {docAndTrainingStats.coberturaLeitura}%
                </p>
                <Progress value={docAndTrainingStats.coberturaLeitura} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {docAndTrainingStats.totalConfirmacoes} leituras confirmadas ({docAndTrainingStats.popsPublicados} POPs vigentes)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funil de Bancada (Etiquetas REG-016) & Conformidade por Módulo */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição de Etiquetas REG-016 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Distribuição de OS por Etiqueta (REG-016)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Volume atual de equipamentos em cada estágio da Assistência Técnica
              </p>
            </div>
            <Link
              href="/equipamentos"
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver bancada
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              TAG_ORDER.map((color) => {
                const spec = TAG_SPECS[color];
                const count = osStats.porCor[color] ?? 0;
                const pct =
                  osStats.totalOs > 0 ? Math.round((count / osStats.totalOs) * 100) : 0;

                return (
                  <div key={color} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', spec.dotClass)} />
                        <span className="font-medium">{spec.nomeCor}</span>
                        <span className="text-muted-foreground">— {spec.labelStatus}</span>
                      </div>
                      <span className="font-mono font-semibold">
                        {count} OS ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Desempenho por Módulo Operacional (9 Módulos) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                Conformidade por Módulo Operacional (9 REGs)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Taxa de aprovação técnica nos formulários da Assistência Técnica e Almoxarifado
              </p>
            </div>
            <Link
              href="/formularios"
              className="text-xs font-medium text-primary hover:underline"
            >
              Abrir REGs
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              formStats.porModulo.map((mod) => (
                <div
                  key={mod.tipo}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {mod.codigo}
                      </Badge>
                      <Link
                        href={`/formularios/${mod.tipo}`}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {mod.titulo}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {mod.total} reg.
                      {mod.naoConformes > 0 && (
                        <span className="ml-1 font-medium text-rose-600 dark:text-rose-400">
                          ({mod.naoConformes} NC)
                        </span>
                      )}
                    </span>
                    <Badge
                      variant={mod.pctConformidade === 100 ? 'success' : 'warning'}
                      className="w-12 justify-center font-mono text-[10px]"
                    >
                      {mod.pctConformidade}%
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Não Conformidades (Severidade/Origem) & Capacitação */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              NCs por Severidade (REG-020)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-md bg-rose-500/10 px-3 py-2">
              <span className="font-medium text-rose-700 dark:text-rose-300">
                Grave (Prazo 7d · Aprovação Direção)
              </span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                {ncStats.porSeveridade.grave}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2">
              <span className="font-medium text-amber-700 dark:text-amber-300">
                Moderada (Prazo 15d)
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {ncStats.porSeveridade.moderada}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-500/10 px-3 py-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Leve (Prazo 30d)
              </span>
              <span className="font-mono font-bold">{ncStats.porSeveridade.leve}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-primary" />
              NCs por Setor de Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="font-medium">Assistência Técnica (POP-020)</span>
              <Badge variant="outline">{ncStats.porOrigem.assistencia_tecnica}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="font-medium">Almoxarifado / Recebimento (POP-010)</span>
              <Badge variant="outline">{ncStats.porOrigem.almoxarifado}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="font-medium">Gestão da Qualidade (SGQ)</span>
              <Badge variant="outline">{ncStats.porOrigem.qualidade}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              Capacitação & Documentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                POPs Publicados / Total
              </span>
              <span className="font-mono font-semibold">
                {docAndTrainingStats.popsPublicados} / {docAndTrainingStats.totalPops}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Treinamentos Internos
              </span>
              <span className="font-mono font-semibold">{docAndTrainingStats.internos}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium">
                <BarChart3 className="h-3.5 w-3.5 text-sky-600" />
                Treinamentos Externos
              </span>
              <span className="font-mono font-semibold">{docAndTrainingStats.externos}</span>
            </div>
            <div className="pt-1 text-right">
              <Link
                href="/treinamentos"
                className="text-xs font-medium text-primary hover:underline"
              >
                Gerenciar capacitações →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
