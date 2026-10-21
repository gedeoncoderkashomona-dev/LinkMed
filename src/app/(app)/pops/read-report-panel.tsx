'use client';

import * as React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PERFIL_LABEL, type Perfil } from '@/core/domain/enums/user';
import { useReadReport } from '@/hooks/use-pops';

interface Props {
  popId: string;
  canSeeReport: boolean;
}

export function ReadReportPanel({ popId, canSeeReport }: Props) {
  const { data, isLoading } = useReadReport(canSeeReport ? popId : null);

  // Resumo por setor para que o Gestor e Diretor vejam imediatamente quais setores leram
  const resumoPorSetor = React.useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { lidos: number; total: number }>();
    for (const u of [...data.lidos, ...data.pendentes]) {
      const setorNome = u.setor || 'Geral';
      const atual = map.get(setorNome) ?? { lidos: 0, total: 0 };
      atual.total += 1;
      if (u.confirmadoEm) atual.lidos += 1;
      map.set(setorNome, atual);
    }
    return Array.from(map.entries());
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const pct =
    data.totalEsperado > 0
      ? Math.round((data.totalConfirmado / data.totalEsperado) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cobertura geral de leitura</p>
            <span className="text-sm font-semibold">
              {pct}% ({data.totalConfirmado}/{data.totalEsperado})
            </span>
          </div>
          <Progress
            value={pct}
            tone={pct >= 90 ? 'success' : pct >= 50 ? 'primary' : 'warning'}
          />
          <p className="text-[11px] text-muted-foreground">
            {data.totalConfirmado} de {data.totalEsperado} colaboradores ativos confirmaram a
            leitura da versão vigente (Rev.{' '}
            {String(data.versaoVigente.numeroVersao).padStart(2, '0')}).
          </p>

          {/* Resumo por Setor (Assistência Técnica, Almoxarifado, Qualidade) */}
          <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
            {resumoPorSetor.map(([setorNome, st]) => {
              const sPct = st.total > 0 ? Math.round((st.lidos / st.total) * 100) : 0;
              return (
                <div
                  key={setorNome}
                  className="rounded-lg border border-border/70 bg-muted/20 p-2 text-xs"
                >
                  <p className="truncate font-semibold text-foreground">{setorNome}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <strong>{st.lidos}</strong> de <strong>{st.total}</strong> leram ({sPct}%)
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Leram ({data.lidos.length})
          </p>
          <div className="space-y-1.5">
            {data.lidos.length === 0 && (
              <p className="text-xs text-muted-foreground">Ninguém confirmou ainda.</p>
            )}
            {data.lidos.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{u.nomeCompleto}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {u.setor ?? PERFIL_LABEL[u.perfil as Perfil] ?? u.perfil}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="success" className="text-[10px]">
                    {PERFIL_LABEL[u.perfil as Perfil] ?? u.perfil}
                  </Badge>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {u.confirmadoEm
                      ? new Date(u.confirmadoEm).toLocaleDateString('pt-BR')
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Pendentes ({data.pendentes.length})
          </p>
          <div className="space-y-1.5">
            {data.pendentes.length === 0 && (
              <p className="text-xs text-muted-foreground">Todos já leram. 🎉</p>
            )}
            {data.pendentes.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{u.nomeCompleto}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {u.setor ?? PERFIL_LABEL[u.perfil as Perfil] ?? u.perfil}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {PERFIL_LABEL[u.perfil as Perfil] ?? u.perfil}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
