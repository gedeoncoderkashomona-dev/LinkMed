'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Layers,
  Search,
  Tag,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { calcularAlertas } from '@/core/domain/forms/alerts';
import {
  FORM_DEFS,
  SETOR_FORM_LABEL,
  type SetorFormulario,
} from '@/core/domain/forms/definitions';
import { TAG_SPECS_LIST } from '@/core/domain/forms/os-workflow';
import { useFormsOverview } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

export function FormulariosClient() {
  const { data, isLoading } = useFormsOverview();
  const [setor, setSetor] = React.useState<SetorFormulario | ''>('');
  const [busca, setBusca] = React.useState('');
  const [mostrarLegendaCores, setMostrarLegendaCores] = React.useState(false);

  const alertas = React.useMemo(
    () => calcularAlertas(data?.records ?? []),
    [data?.records],
  );

  const formulariosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return FORM_DEFS.filter((f) => {
      if (setor && !f.setores.includes(setor)) return false;
      if (!q) return true;
      return (
        f.titulo.toLowerCase().includes(q) ||
        f.descricao.toLowerCase().includes(q) ||
        (f.reg && f.reg.toLowerCase().includes(q))
      );
    });
  }, [setor, busca]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Formulários Operacionais (REGs)
          </h1>
          <p className="text-sm text-muted-foreground">
            Checklists e registros da Assistência Técnica e Almoxarifado (POP-020 / RDC 665/22) com herança de dados por OS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarLegendaCores((v) => !v)}
          >
            <Tag className="h-4 w-4" />
            {mostrarLegendaCores ? 'Ocultar Etiquetas REG-016' : 'Legenda de Etiquetas (REG-016)'}
          </Button>
          <Link href="/equipamentos">
            <Button size="sm" variant="secondary">
              Fila de OS / Equipamentos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Painel expansível: Tabela Mestra de Etiquetas e Cores (REG-016) */}
      {mostrarLegendaCores && (
        <Card className="border-primary/20 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Tabela Mestra de Etiquetas e Cores de Status da OS (REG-016)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {TAG_SPECS_LIST.map((tag) => (
              <div
                key={tag.color}
                className="flex flex-col justify-between rounded-lg border border-border p-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        tag.badgeClass,
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', tag.dotClass)} />
                      {tag.nomeCor}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {tag.hex}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">{tag.labelStatus}</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {tag.regraOperacional}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alertas Operacionais Ativos */}
      {alertas.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {alertas.map((alerta) => (
            <Link
              key={alerta.id}
              href={alerta.href}
              className={cn(
                'flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/50',
                alerta.nivel === 'danger'
                  ? 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
              )}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{alerta.titulo}</p>
                  <p className="mt-0.5 text-xs opacity-90">{alerta.descricao}</p>
                </div>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
            </Link>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código (ex: REG-022, REG-035) ou título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={setor}
            onChange={(e) => setSetor(e.target.value as SetorFormulario | '')}
          >
            <option value="">Todos os setores</option>
            <option value="assistencia_tecnica">Assistência Técnica</option>
            <option value="almoxarifado">Almoxarifado</option>
          </SelectNative>
        </CardContent>
      </Card>

      {/* Catálogo de Formulários */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formulariosFiltrados.map((form) => {
            const stats = data?.contagens?.[form.tipo] ?? { total: 0, naoConformes: 0 };
            return (
              <Card
                key={form.tipo}
                className="flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {form.reg ? (
                        <Badge variant="default" className="font-mono">
                          {form.reg}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Controle Interno</Badge>
                      )}
                      {form.subtipos && (
                        <Badge variant="outline" className="gap-1">
                          <Layers className="h-3 w-3" />
                          {form.subtipos.map((s) => s.label).join(' · ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {form.setores.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {SETOR_FORM_LABEL[s]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <CardTitle className="text-base leading-snug">{form.titulo}</CardTitle>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {form.descricao}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {form.alerta && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>{form.alerta.mensagem}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                        <strong className="text-foreground">{stats.total}</strong> reg.
                      </span>
                      {stats.naoConformes > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <strong>{stats.naoConformes}</strong> NC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          100% conforme
                        </span>
                      )}
                    </div>

                    <Link href={`/formularios/${form.tipo}`}>
                      <Button size="sm">
                        Preencher
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
