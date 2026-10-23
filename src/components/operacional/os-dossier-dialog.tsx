'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck2,
  Layers,
  ShieldCheck,
  Tag,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { FormRecord } from '@/core/domain/entities/operacional';
import {
  FORM_DEFS,
  getCampos,
  STATUS_REGISTRO_LABEL,
} from '@/core/domain/forms/definitions';
import {
  aggregateServiceOrders,
  TAG_SPECS,
  type ServiceOrderContext,
} from '@/core/domain/forms/os-workflow';
import { useFormsOverview } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

interface Props {
  osChaveOuNumero: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OsDossierDialog({ osChaveOuNumero, open, onOpenChange }: Props) {
  const { data } = useFormsOverview();
  const allRecords = React.useMemo(() => data?.records ?? [], [data?.records]);

  const ordens = React.useMemo(() => aggregateServiceOrders(allRecords), [allRecords]);

  const osCtx: ServiceOrderContext | null = React.useMemo(() => {
    if (!osChaveOuNumero) return null;
    const clean = osChaveOuNumero.trim().toUpperCase();
    return (
      ordens.find(
        (o) =>
          o.chave.toUpperCase() === clean ||
          o.numeroOs.toUpperCase() === clean ||
          `OS-${o.numeroOs}`.toUpperCase() === clean ||
          o.numeroSerie.toUpperCase() === clean,
      ) ?? null
    );
  }, [osChaveOuNumero, ordens]);

  // Registros específicos desta OS
  const recordsDaOs = React.useMemo(() => {
    if (!osCtx) return [];
    const numOsClean = osCtx.numeroOs.toUpperCase();
    const snClean = osCtx.numeroSerie.toUpperCase();

    return allRecords
      .filter((r) => {
        const d = r.dados ?? {};
        const rOs = String(d.numero_os ?? '').trim().toUpperCase();
        const rSn = String(d.numero_serie ?? '').trim().toUpperCase();
        if (numOsClean && numOsClean !== 'S/N' && rOs === numOsClean) return true;
        if (snClean && rSn === snClean) return true;
        return false;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [osCtx, allRecords]);

  if (!osCtx && !recordsDaOs.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dossiê da Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Nenhum dado localizado para o identificador informado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-xs text-muted-foreground">
            A OS &ldquo;{osChaveOuNumero}&rdquo; ainda não possui registros preenchidos.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const tag = osCtx ? TAG_SPECS[osCtx.tagColor] : TAG_SPECS.WHITE;

  const etapas = [
    {
      tipo: 'inspecao-recebimento',
      codigo: 'REG-022',
      titulo: '1. Inspeção de Recebimento',
      done: Boolean(osCtx?.etapasConcluidas.reg022Recebimento),
      href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'limpeza-equipamento',
      codigo: 'REG-034',
      titulo: '2. Higienização & Limpeza (Álcool 70%)',
      done: Boolean(osCtx?.etapasConcluidas.reg034Limpeza),
      href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'checklist-manutencao',
      codigo: 'REG-035',
      titulo: '3. Diagnóstico Técnico & Manutenção',
      done: Boolean(osCtx?.etapasConcluidas.reg035Manutencao),
      href: `/formularios/checklist-manutencao?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'etapas-manutencao',
      codigo: 'REG-016',
      titulo: '4. Etapas da Manutenção & Etiquetas',
      done: Boolean(osCtx?.etapasConcluidas.reg016Etapas),
      href: `/formularios/etapas-manutencao?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'verificacao-calibracao',
      codigo: 'REG-030',
      titulo: '5. Controle de Verificação da Calibração',
      done: Boolean(osCtx?.etapasConcluidas.reg030Calibracao),
      href: `/formularios/verificacao-calibracao?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="font-mono text-sm px-2.5 py-0.5">
                OS: {osCtx?.numeroOs || osChaveOuNumero}
              </Badge>
              {osCtx?.numeroSerie && (
                <Badge variant="outline" className="font-mono text-xs">
                  S/N: {osCtx.numeroSerie}
                </Badge>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                  tag.badgeClass,
                )}
              >
                <Tag className="h-3 w-3" />
                Etiqueta {tag.nomeCor}: {tag.labelStatus}
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Dossiê Técnico RDC 665/22
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">
            {osCtx?.equipamento || 'Equipamento'} — {osCtx?.marca} {osCtx?.modelo}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cliente: <strong>{osCtx?.cliente || 'Não informado'}</strong> · Última movimentação:{' '}
            {osCtx?.ultimaAtualizacao
              ? osCtx.ultimaAtualizacao.split('-').reverse().join('/')
              : '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Trilha visual das 5 etapas da OS */}
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Trilha de Execução da Assistência Técnica (POP-020)
            </p>
            <div className="grid gap-2 sm:grid-cols-5">
              {etapas.map((et, i) => (
                <Link
                  key={et.codigo}
                  href={et.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'flex flex-col justify-between rounded-lg border p-2 text-left transition-all hover:border-primary/50',
                    et.done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                      : 'border-border/80 bg-background text-muted-foreground',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold">{et.codigo}</span>
                    {et.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">
                    {et.titulo}
                  </p>
                  <span className="mt-2 text-[10px] font-semibold underline opacity-80">
                    {et.done ? 'Ver / Atualizar' : 'Preencher'}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Dossiê com tudo que já foi preenchido por etapa */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Registros Oficiais Preenchidos para esta OS ({recordsDaOs.length})
              </h3>
            </div>

            {recordsDaOs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum formulário operacional finalizado para esta Ordem de Serviço ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {recordsDaOs.map((rec, idx) => {
                  const def = FORM_DEFS.find((f) => f.tipo === rec.tipo);
                  const campos = def ? getCampos(def, rec.subtipo) : [];
                  const d = rec.dados ?? {};

                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-primary">
                            {def?.reg ?? rec.tipo.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {def?.titulo ?? rec.tipo}
                          </span>
                          {rec.subtipo && (
                            <Badge variant="outline" className="uppercase text-[10px]">
                              Marca {rec.subtipo}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={rec.status === 'conforme' ? 'success' : 'destructive'}
                            className="text-[10px]"
                          >
                            {STATUS_REGISTRO_LABEL[rec.status]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            Preenchido em {rec.dataRef.split('-').reverse().join('/')}
                            {rec.criadoPorNome ? ` por ${rec.criadoPorNome}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Grade com todos os campos preenchidos */}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(d).map(([k, v]) => {
                          const cDef = campos.find((c) => c.name === k);
                          const label = cDef?.label ?? k;
                          const valorTexto =
                            typeof v === 'boolean'
                              ? v
                                ? 'Sim'
                                : 'Não'
                              : v === 'C'
                                ? 'Conforme (C)'
                                : v === 'NC'
                                  ? 'Não conforme (NC)'
                                  : v === 'NA'
                                    ? 'Não aplicável (NA)'
                                    : String(v);

                          return (
                            <div
                              key={k}
                              className="rounded-lg border border-border/70 bg-muted/20 p-2 text-xs"
                            >
                              <span className="block text-[10px] font-medium text-muted-foreground truncate">
                                {label}
                              </span>
                              <span className="mt-0.5 block font-semibold text-foreground break-words">
                                {valorTexto}
                                {cDef?.unit ? ` ${cDef.unit}` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Governança do registro */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-3">
                          <span>
                            <strong>Elaborado por:</strong>{' '}
                            {String(d.elaborado_por || def?.responsaveis.elaboradoPor || 'Qualidade')}
                          </span>
                          <span>·</span>
                          <span>
                            <strong>Revisado por:</strong>{' '}
                            {String(d.revisado_por || def?.responsaveis.revisadoPor || 'RT')}
                          </span>
                          <span>·</span>
                          <span>
                            <strong>Aprovado por:</strong>{' '}
                            {String(d.aprovado_por || def?.responsaveis.aprovadoPor || 'Diretoria')}
                          </span>
                        </div>
                        <span className="font-mono">
                          ID: #{rec.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="text-[11px] text-muted-foreground">
            Rastreabilidade integral RDC 665/2022 — Sistema LinkMed
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar Dossiê
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

