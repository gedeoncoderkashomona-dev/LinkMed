'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Plus,
  Search,
  Tag,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { statusCalibracoes } from '@/core/domain/forms/alerts';
import {
  aggregateServiceOrders,
  TAG_SPECS,
  TAG_SPECS_LIST,
  type TagColor,
} from '@/core/domain/forms/os-workflow';
import { useFormsOverview } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

export function EquipamentosClient() {
  const { data, isLoading } = useFormsOverview();
  const [aba, setAba] = React.useState<'os' | 'calibracoes'>('os');
  const [busca, setBusca] = React.useState('');
  const [filtroCor, setFiltroCor] = React.useState<TagColor | ''>('');

  const ordensServico = React.useMemo(
    () => aggregateServiceOrders(data?.records ?? []),
    [data?.records],
  );

  const calibracoes = React.useMemo(
    () => statusCalibracoes(data?.records ?? []),
    [data?.records],
  );

  const osFiltradas = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordensServico.filter((os) => {
      if (filtroCor && os.tagColor !== filtroCor) return false;
      if (!q) return true;
      return (
        os.numeroOs.toLowerCase().includes(q) ||
        os.cliente.toLowerCase().includes(q) ||
        os.equipamento.toLowerCase().includes(q) ||
        os.numeroSerie.toLowerCase().includes(q) ||
        os.marca.toLowerCase().includes(q)
      );
    });
  }, [ordensServico, filtroCor, busca]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipamentos & Ordens de Serviço
          </h1>
          <p className="text-sm text-muted-foreground">
            Rastreabilidade de equipamentos por etiqueta de status (REG-016 / POP-020) e validade metrológica de calibração.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/formularios/inspecao-recebimento">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Receber Equipamento (REG-022)
            </Button>
          </Link>
          <Link href="/formularios/validade-calibracao">
            <Button size="sm">
              <CalendarClock className="h-4 w-4" />
              Registrar Validade de Calibração
            </Button>
          </Link>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={aba === 'os' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAba('os')}
        >
          <Wrench className="h-4 w-4" />
          Fila de Bancada / Ordens de Serviço ({ordensServico.length})
        </Button>
        <Button
          variant={aba === 'calibracoes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAba('calibracoes')}
        >
          <CalendarClock className="h-4 w-4" />
          Validade de Calibração ({calibracoes.length})
        </Button>
      </div>

      {aba === 'os' ? (
        <div className="space-y-4">
          {/* Filtros de OS e Etiquetas */}
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_260px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por Nº da OS, cliente, equipamento, marca ou nº de série..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <SelectNative
                value={filtroCor}
                onChange={(e) => setFiltroCor(e.target.value as TagColor | '')}
              >
                <option value="">Todas as etiquetas (REG-016)</option>
                {TAG_SPECS_LIST.map((t) => (
                  <option key={t.color} value={t.color}>
                    Etiqueta {t.nomeCor} — {t.labelStatus}
                  </option>
                ))}
              </SelectNative>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : osFiltradas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
                <Wrench className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">
                  Nenhuma Ordem de Serviço ou equipamento encontrado.
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicie pelo formulário de Inspeção de Recebimento (REG-022) ou Limpeza (REG-034).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {osFiltradas.map((os) => {
                const tag = TAG_SPECS[os.tagColor];
                const etapas = [
                  {
                    label: '1. Recebimento (REG-022)',
                    done: os.etapasConcluidas.reg022Recebimento,
                    href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(os.chave)}`,
                  },
                  {
                    label: '2. Higienização (REG-034)',
                    done: os.etapasConcluidas.reg034Limpeza,
                    href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(os.chave)}`,
                  },
                  {
                    label: '3. Diagnóstico (REG-035)',
                    done: os.etapasConcluidas.reg035Manutencao,
                    href: `/formularios/checklist-manutencao?os=${encodeURIComponent(os.chave)}`,
                  },
                  {
                    label: '4. Etapas / Etiquetas (REG-016)',
                    done: os.etapasConcluidas.reg016Etapas,
                    href: `/formularios/etapas-manutencao?os=${encodeURIComponent(os.chave)}`,
                  },
                  {
                    label: '5. Calibração / CQ (REG-030)',
                    done: os.etapasConcluidas.reg030Calibracao,
                    href: `/formularios/verificacao-calibracao?os=${encodeURIComponent(os.chave)}`,
                  },
                ];

                return (
                  <Card key={os.chave}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="font-mono">
                              OS: {os.numeroOs}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {os.equipamento || 'Equipamento'}
                            </span>
                            {(os.marca || os.modelo) && (
                              <span className="text-xs text-muted-foreground">
                                ({[os.marca, os.modelo].filter(Boolean).join(' · ')})
                              </span>
                            )}
                            {os.numeroSerie && (
                              <Badge variant="outline" className="font-mono">
                                S/N: {os.numeroSerie}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Cliente:</strong> {os.cliente || '—'} ·{' '}
                            <strong>Última movimentação:</strong>{' '}
                            {os.ultimaAtualizacao.split('-').reverse().join('/')}
                          </p>
                        </div>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                            tag.badgeClass,
                          )}
                        >
                          <Tag className="h-3.5 w-3.5" />
                          Etiqueta {tag.nomeCor}: {tag.labelStatus}
                        </span>
                      </div>

                      {/* Trilha de Etapas com Autopreenchimento */}
                      <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-5">
                        {etapas.map((etapa) => (
                          <Link
                            key={etapa.label}
                            href={etapa.href}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors',
                              etapa.done
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                          >
                            <span className="truncate">{etapa.label}</span>
                            {etapa.done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            )}
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Aba 2: Validade de Calibração (Alerta 60 dias) */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Controle de Validade de Calibração (Alerta 60 dias)</span>
              <Link href="/formularios/validade-calibracao">
                <Button size="sm" variant="outline">
                  <Plus className="h-3.5 w-3.5" />
                  Novo registro
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calibracoes.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma validade de calibração cadastrada ainda.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {calibracoes.map((c) => (
                  <div
                    key={c.chave}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{c.equipamento}</p>
                      <p className="text-muted-foreground">
                        Nº de série: <strong>{c.numeroSerie || '—'}</strong> · Validade:{' '}
                        <strong>{c.validade.split('-').reverse().join('/')}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.situacao === 'vencida' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Vencida há {Math.abs(c.diasRestantes)} dia(s)
                        </Badge>
                      ) : c.situacao === 'a_vencer' ? (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Vence em {c.diasRestantes} dia(s)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Vigente ({c.diasRestantes} dias restantes)
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
