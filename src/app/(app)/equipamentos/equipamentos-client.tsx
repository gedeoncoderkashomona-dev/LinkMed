'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Tag,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
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
  const [busca, setBusca] = React.useState('');
  const [filtroCor, setFiltroCor] = React.useState<TagColor | ''>('');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);

  const ordensServico = React.useMemo(
    () => aggregateServiceOrders(data?.records ?? []),
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
            Rastreabilidade de equipamentos por etiqueta de status (REG-016 / POP-020) e acompanhamento das etapas de bancada.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
          <Wrench className="h-3.5 w-3.5 text-primary" />
          Fila de Bancada / Ordens de Serviço ({ordensServico.length})
        </Badge>
      </div>

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
                          <button
                            type="button"
                            onClick={() => setDossierOs(os.numeroOs)}
                            className="cursor-pointer transition-transform active:scale-95 text-left"
                            title="Clique para abrir o Dossiê completo com tudo o que já foi preenchido desta OS"
                          >
                            <Badge variant="default" className="font-mono hover:bg-primary/90 underline">
                              OS: {os.numeroOs}
                            </Badge>
                          </button>
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

      {/* Dossiê completo ao clicar na OS */}
      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />
    </div>
  );
}
