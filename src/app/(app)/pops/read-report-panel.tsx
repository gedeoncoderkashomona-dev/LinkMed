'use client';

import { CheckCircle2, Clock, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PERFIL_LABEL, type Perfil } from '@/core/domain/enums/user';
import { useReadReport } from '@/hooks/use-pops';

interface Props {
  popId: string;
  /** Se false, mostra apenas o resumo (sem nomes). Padrão: só Diretor/Gestor. */
  canSeeReport: boolean;
}

export function ReadReportPanel({ popId, canSeeReport }: Props) {
  const { data, isLoading } = useReadReport(canSeeReport ? popId : null);

  if (!canSeeReport) {
    return (
      <Card>
        <CardContent className="flex items-start gap-2 p-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Apenas o Diretor e o Gestor da Qualidade podem ver o relatório detalhado
            de quem leu e quem falta ler.
          </p>
        </CardContent>
      </Card>
    );
  }

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
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cobertura de leitura</p>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
          <Progress
            value={pct}
            tone={pct >= 90 ? 'success' : pct >= 50 ? 'primary' : 'warning'}
          />
          <p className="text-[11px] text-muted-foreground">
            {data.totalConfirmado} de {data.totalEsperado} colaboradores ativos leram a versão
            vigente (Rev. {String(data.versaoVigente.numeroVersao).padStart(2, '0')}).
          </p>
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
                className="flex items-center justify-between rounded-lg border border-border p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{u.nomeCompleto}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-[10px]">
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
                  <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
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