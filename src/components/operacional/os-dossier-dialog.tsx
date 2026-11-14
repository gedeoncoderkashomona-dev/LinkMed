'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Printer,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck2,
  Layers,
  Lock,
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
import { showRuleNotice } from '@/lib/rule-notice';
import type { FormRecord } from '@/core/domain/entities/operacional';
import {
  FORM_DEFS,
  getCampos,
  STATUS_REGISTRO_LABEL,
} from '@/core/domain/forms/definitions';
import {
  aggregateServiceOrders,
  TAG_SPECS,
  verificarPreRequisitoFormularioPop020,
  type ServiceOrderContext,
} from '@/core/domain/forms/os-workflow';
import { mergeOsFluxoIntoServiceOrders } from '@/core/domain/forms/os-reg016-sync';
import { useFormsOverview, useOsFlowList } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

interface Props {
  osChaveOuNumero: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function OsDossierDialog({ osChaveOuNumero, open, onOpenChange }: Props) {
  const { data } = useFormsOverview();
  const { data: osFlowData } = useOsFlowList();
  const allRecords = React.useMemo(() => data?.records ?? [], [data?.records]);

  const ordens = React.useMemo(
    () =>
      mergeOsFluxoIntoServiceOrders(
        osFlowData?.ordens ?? [],
        aggregateServiceOrders(allRecords),
      ),
    [osFlowData?.ordens, allRecords],
  );

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

  const reg022Prereq = verificarPreRequisitoFormularioPop020('inspecao-recebimento', osCtx);
  const reg034Prereq = verificarPreRequisitoFormularioPop020('limpeza-equipamento', osCtx);
  const reg016Prereq = verificarPreRequisitoFormularioPop020('etapas-manutencao', osCtx);
  const reg035Prereq = verificarPreRequisitoFormularioPop020('checklist-manutencao', osCtx);

  const etapas = [
    {
      tipo: 'inspecao-recebimento',
      codigo: 'REG-022',
      titulo: '1. Inspeção de Recebimento',
      done: Boolean(osCtx?.etapasConcluidas.reg022Recebimento),
      visivel: reg022Prereq.visivel,
      liberado: reg022Prereq.liberado,
      motivoBloqueio: reg022Prereq.motivo,
      href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'limpeza-equipamento',
      codigo: 'REG-034',
      titulo: '2. Higienização & Limpeza (Álcool 70%)',
      done: Boolean(osCtx?.etapasConcluidas.reg034Limpeza),
      visivel: reg034Prereq.visivel,
      liberado: reg034Prereq.liberado,
      motivoBloqueio: reg034Prereq.motivo,
      href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'etapas-manutencao',
      codigo: 'REG-016',
      titulo: '3. Etapas da Manutenção & Etiquetas',
      done: Boolean(osCtx?.etapasConcluidas.reg016Etapas),
      visivel: reg016Prereq.visivel,
      liberado: reg016Prereq.liberado,
      motivoBloqueio: reg016Prereq.motivo,
      href: `/formularios/etapas-manutencao?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
    {
      tipo: 'checklist-manutencao',
      codigo: 'REG-035',
      titulo: '4. Pós-Serviço & Checklist Final',
      done: Boolean(osCtx?.etapasConcluidas.reg035Manutencao),
      visivel: reg035Prereq.visivel || Boolean(osCtx?.etapasConcluidas.reg035Manutencao),
      liberado: reg035Prereq.liberado,
      motivoBloqueio: reg035Prereq.motivo,
      href: `/formularios/checklist-manutencao?os=${encodeURIComponent(osCtx?.chave ?? '')}`,
    },
  ];
  const etapasVisiveis = etapas.filter((e) => e.visivel);


  function handlePrintDossier() {
    if (!osCtx) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      window.print();
      return;
    }

    const safeOs = escapeHtml(osCtx.numeroOs);
    const safeCliente = escapeHtml(osCtx.cliente || '—');
    const safeEquip = escapeHtml(osCtx.equipamento || '—');
    const safeMarca = escapeHtml(osCtx.marca || '—');
    const safeModelo = escapeHtml(osCtx.modelo || '—');
    const safeSerie = escapeHtml(osCtx.numeroSerie || '—');
    const safeTagColor = escapeHtml(osCtx.tagColor);
    const safeOsStatus = escapeHtml(osCtx.osStatus);
    const safeData = escapeHtml(new Date().toLocaleDateString('pt-BR'));

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Dossiê da Ordem de Serviço — ${safeOs}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 20px; color: #0f172a; background: #fff; line-height: 1.4; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .logo-box { display: flex; align-items: center; gap: 10px; }
    .logo-img { height: 42px; width: auto; object-fit: contain; }
    .title-box h1 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .title-box p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
    .os-badge { background: #0f172a; color: #fff; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .field { font-size: 11px; }
    .field-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .field-val { font-size: 12px; font-weight: 700; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 16px 0 10px; }
    .record-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
    .record-title { font-size: 12px; font-weight: 700; color: #0f172a; }
    .record-date { font-size: 11px; color: #64748b; font-family: monospace; }
    .record-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11px; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      <img src="/logo-linkmed.jpg" alt="LinkMed" class="logo-img" onerror="this.style.display='none'" />
      <div class="title-box">
        <h1>LINKMED SOLUÇÕES MÉDICAS — DOSSIÊ DA ORDEM DE SERVIÇO</h1>
        <p>Sistema de Gestão da Qualidade RDC 665/2022 (ANVISA) · POP-020</p>
      </div>
    </div>
    <div class="os-badge">${safeOs}</div>
  </div>

  <div class="grid">
    <div class="field">
      <div class="field-label">Cliente / Hospital</div>
      <div class="field-val">${safeCliente}</div>
    </div>
    <div class="field">
      <div class="field-label">Equipamento</div>
      <div class="field-val">${safeEquip}</div>
    </div>
    <div class="field">
      <div class="field-label">Marca / Modelo</div>
      <div class="field-val">${safeMarca} · ${safeModelo}</div>
    </div>
    <div class="field">
      <div class="field-label">Número de Série</div>
      <div class="field-val">${safeSerie}</div>
    </div>
    <div class="field">
      <div class="field-label">Etiqueta Atual</div>
      <div class="field-val">${safeTagColor} — ${safeOsStatus}</div>
    </div>
    <div class="field">
      <div class="field-label">Data de Emissão</div>
      <div class="field-val">${safeData}</div>
    </div>
  </div>

  <div class="section-title">REGISTROS OPERACIONAIS E RASTREABILIDADE (RDC 665/22)</div>
  <div id="records-content">
    ${recordsDaOs.map((rec) => {
      const def = FORM_DEFS.find(f => f.tipo === rec.tipo);
      const d = rec.dados || {};
      const chaves = Object.keys(d).filter(k => k !== 'numero_os' && !k.startsWith('__'));
      const safeReg = escapeHtml(def?.reg || rec.tipo);
      const safeTitulo = escapeHtml(def?.titulo || rec.tipo);
      const safeDataRef = escapeHtml(rec.dataRef);
      return `
        <div class="record-card">
          <div class="record-header">
            <span class="record-title">${safeReg} — ${safeTitulo}</span>
            <span class="record-date">Data: ${safeDataRef}</span>
          </div>
          <div class="record-grid">
            ${chaves.slice(0, 8).map(k => {
              const val = d[k];
              const strVal = typeof val === 'boolean' ? (val ? 'Sim' : 'Não') : String(val ?? '—');
              const safeKey = escapeHtml(k.replace(/_/g, ' '));
              const safeVal = escapeHtml(strVal);
              return `<div><strong>${safeKey}:</strong> ${safeVal}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <div class="footer">
    <span>Documento gerado eletronicamente com selo de integridade SHA-256 e amparo LGPD (Art. 7º, II).</span>
    <span>Página 1 / 1</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  }

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
          {/* Trilha visual estrita das etapas da OS (POP-020: REG-022 -> REG-034 -> REG-016 -> REG-035) */}
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Trilha de Execução da Assistência Técnica (POP-020)
            </p>
            <div
              className={cn(
                'grid gap-2',
                etapasVisiveis.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
              )}
            >
              {etapasVisiveis.map((et) =>
                et.liberado || et.done ? (
                  <Link
                    key={et.codigo}
                    href={et.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex flex-col justify-between rounded-lg border p-2 text-left transition-all hover:border-primary/50',
                      et.done
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                        : 'border-border/80 bg-background text-foreground',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">{et.codigo}</span>
                      {et.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">
                      {et.titulo}
                    </p>
                    <span className="mt-2 text-[10px] font-semibold underline opacity-80">
                      {et.done ? 'Ver / Atualizar' : 'Preencher'}
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    key={et.codigo}
                    onClick={() =>
                      showRuleNotice({
                        title: `${et.codigo} Bloqueado pela Trilha POP-020`,
                        message:
                          et.motivoBloqueio ??
                          `Na trilha POP-020 (REG-022 → REG-034 → REG-016 → REG-035), conclua completamente a etapa anterior antes de abrir o ${et.codigo}.`,
                        severity: 'warning',
                      })
                    }
                    className="flex cursor-pointer flex-col justify-between rounded-xl border border-border/60 bg-muted/40 p-2.5 text-left text-muted-foreground transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">{et.codigo}</span>
                      <Lock className="h-3.5 w-3.5 text-amber-600/80 dark:text-amber-400/80" strokeWidth={1.6} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">
                      {et.titulo}
                    </p>
                    <span className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      Ver pré-requisito
                    </span>
                  </button>
                ),
              )}
            </div>
            {!reg035Prereq.visivel && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {reg035Prereq.motivo}
              </p>
            )}
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
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={handlePrintDossier} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar Dossiê
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

