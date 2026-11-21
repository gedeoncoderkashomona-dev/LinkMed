'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  FileText,
  Lock,
  PlayCircle,
  Printer,
  Search,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  EquipmentLabelPrintDialog,
  type DadosEtiquetaEquipamento,
} from '@/components/operacional/equipment-label-print-dialog';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
import { OsFlowPanel } from '@/components/operacional/os-flow-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import {
  aggregateServiceOrders,
  TAG_SPECS,
  TAG_SPECS_LIST,
  type TagColor,
} from '@/core/domain/forms/os-workflow';
import { mergeOsFluxoIntoServiceOrders } from '@/core/domain/forms/os-reg016-sync';
import { FLUXO, perfilSistemaParaSetorV4 } from '@/core/domain/os-v4/nucleo';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFormsOverview, useOsFlowList } from '@/hooks/use-operacional';
import { showRuleNotice } from '@/lib/rule-notice';
import { cn } from '@/lib/utils';

export function EquipamentosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useFormsOverview();
  const { data: osFlowData } = useOsFlowList();
  const searchParams = useSearchParams();
  const osQueryParam = searchParams.get('os');

  const [busca, setBusca] = React.useState('');
  const [filtroCor, setFiltroCor] = React.useState<TagColor | ''>('');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);
  const [etiquetaPrint, setEtiquetaPrint] =
    React.useState<DadosEtiquetaEquipamento | null>(null);
  const [selectedNumeroOs, setSelectedNumeroOs] = React.useState<string | null>(null);
  const [mostrarPainelExecucao, setMostrarPainelExecucao] = React.useState(true);
  const jaAutoSelecionouRef = React.useRef(false);

  const ordensFluxoServidor = React.useMemo(
    () => osFlowData?.ordens ?? [],
    [osFlowData?.ordens],
  );

  const setorUsuario = perfilSistemaParaSetorV4(user?.perfil);

  const ordensPendentesMeuSetor = React.useMemo(() => {
    return ordensFluxoServidor.filter((o) => {
      if (o.estadoGeral === 'finalizada' || o.estadoGeral === 'cancelada') return false;
      if (!setorUsuario) return o.setorPendente !== 'NENHUM';
      return o.setorPendente === setorUsuario;
    });
  }, [ordensFluxoServidor, setorUsuario]);

  const ordensServico = React.useMemo(
    () =>
      mergeOsFluxoIntoServiceOrders(
        ordensFluxoServidor,
        aggregateServiceOrders(data?.records ?? []),
      ),
    [ordensFluxoServidor, data?.records],
  );

  const osFluxoPorNumero = React.useMemo(() => {
    const map = new Map<string, (typeof ordensFluxoServidor)[number]>();
    for (const o of ordensFluxoServidor) {
      map.set(o.numeroOs.trim().toUpperCase(), o);
    }
    return map;
  }, [ordensFluxoServidor]);

  React.useEffect(() => {
    if (osQueryParam) {
      const alvoLimpo = osQueryParam.replace(/^OS:/i, '').trim();
      if (alvoLimpo) {
        setSelectedNumeroOs(alvoLimpo);
        setMostrarPainelExecucao(true);
        return;
      }
    }

    if (!jaAutoSelecionouRef.current && ordensFluxoServidor.length > 0 && !selectedNumeroOs) {
      const alvo =
        (setorUsuario
          ? ordensFluxoServidor.find(
              (o) =>
                o.estadoGeral !== 'finalizada' &&
                o.estadoGeral !== 'cancelada' &&
                o.setorPendente === setorUsuario,
            )
          : null) ?? ordensFluxoServidor[0];
      if (alvo) {
        setSelectedNumeroOs(alvo.numeroOs);
        setMostrarPainelExecucao(true);
        jaAutoSelecionouRef.current = true;
      }
    }
  }, [osQueryParam, ordensFluxoServidor, setorUsuario, selectedNumeroOs]);

  const osSelecionadaInicial = React.useMemo(() => {
    if (!selectedNumeroOs) return null;
    return osFluxoPorNumero.get(selectedNumeroOs.trim().toUpperCase()) ?? null;
  }, [selectedNumeroOs, osFluxoPorNumero]);

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
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Equipamentos & Ordens de Serviço
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Trilha POP-020 (v4): REG-022 (ADM) → REG-016 (AT) ↔ REG-034 (Limpeza) → Item 5 (REG-009 / REG-035).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['adm', 'diretor', 'gestor'].includes(user?.perfil ?? '') && (
            <Link href="/formularios/inspecao-recebimento">
              <Button type="button" size="sm" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                Nova OS (REG-022)
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarPainelExecucao((v) => !v)}
            className="gap-1.5"
          >
            <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            {mostrarPainelExecucao ? 'Ocultar Painel Ativo' : 'Painel da OS Ativa'}
          </Button>
        </div>
      </div>

      {/* Pendências do setor atual */}
      {ordensPendentesMeuSetor.length > 0 && (
        <div className="ios-card overflow-hidden border-emerald-500/25">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Bell className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Pendências do Seu Setor ({ordensPendentesMeuSetor.length})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Selecione uma OS para executar a próxima ação oficial no fluxo v4.
                </p>
              </div>
            </div>
            <Link href="/notificacoes">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">
                Central de Avisos
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border/70">
            {ordensPendentesMeuSetor.map((o) => {
              const isAtiva =
                selectedNumeroOs?.trim().toUpperCase() === o.numeroOs.trim().toUpperCase();
              const ultimaNotif = o.notificacoes?.[0];
              return (
                <div
                  key={o.numeroOs}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs transition-colors',
                    isAtiva ? 'bg-primary/[0.04]' : 'hover:bg-muted/30',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        OS {o.numeroOs}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {o.identificacao.equipamento} · {o.identificacao.marca}
                      </span>
                      {o.etiquetaAtual && (
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            TAG_SPECS[o.etiquetaAtual].badgeClass,
                          )}
                        >
                          {TAG_SPECS[o.etiquetaAtual].nomeCor}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ultimaNotif?.mensagem || o.mensagemTelaAtual || 'Aguardando execução'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isAtiva ? 'default' : 'secondary'}
                    onClick={() => {
                      setSelectedNumeroOs(o.numeroOs);
                      setMostrarPainelExecucao(true);
                    }}
                    className="h-8 shrink-0 text-xs"
                  >
                    {isAtiva ? 'Selecionada' : 'Assumir OS'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Painel Unificado da OS Selecionada (Motor v4) */}
      {mostrarPainelExecucao && (
        selectedNumeroOs ? (
          <OsFlowPanel
            numeroOs={selectedNumeroOs}
            osInicial={osSelecionadaInicial}
            onAbrirDossie={(os) => setDossierOs(os.numeroOs)}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-xs text-muted-foreground">
              {['adm', 'diretor', 'gestor'].includes(user?.perfil ?? '')
                ? 'Cadastre uma nova OS pelo REG-022 ou selecione uma OS na fila abaixo.'
                : 'Aguarde o Setor Administrativo (ADM) iniciar a OS pelo REG-022 ou selecione uma OS na fila abaixo.'}
            </CardContent>
          </Card>
        )
      )}

      {/* Filtros + Fila de OS */}
      <div className="space-y-3.5">
        <div className="ios-card grid gap-3 p-3.5 sm:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <Input
              placeholder="Buscar por OS, cliente, equipamento, marca ou nº de série..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <SelectNative
            value={filtroCor}
            onChange={(e) => setFiltroCor(e.target.value as TagColor | '')}
          >
            <option value="">Todas as etiquetas ({ordensServico.length})</option>
            {TAG_SPECS_LIST.map((t) => (
              <option key={t.color} value={t.color}>
                Etiqueta {t.nomeCor} — {t.labelStatus}
              </option>
            ))}
          </SelectNative>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : osFiltradas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Tag className="h-7 w-7 text-muted-foreground/60" strokeWidth={1.5} />
              <p className="text-sm font-semibold">Nenhuma Ordem de Serviço encontrada</p>
              <p className="text-xs text-muted-foreground">
                {busca || filtroCor
                  ? 'Nenhuma OS corresponde aos filtros atuais.'
                  : 'Cadastre uma inspeção no REG-022 para iniciar uma nova OS.'}
              </p>
              {(busca || filtroCor) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setBusca('');
                    setFiltroCor('');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {osFiltradas.map((os) => {
              const tag = TAG_SPECS[os.tagColor];
              const fluxoMatch = osFluxoPorNumero.get(os.numeroOs.trim().toUpperCase());
              const liberaImpressao = fluxoMatch?.v4No
                ? Boolean(FLUXO.nos[fluxoMatch.v4No]?.libera_impressao_etiqueta)
                : os.tagColor !== 'WHITE' && os.tagColor !== 'VIOLET';
              const item5Bloqueado =
                fluxoMatch?.v4Estado?.item5Bloqueado ?? os.tagColor === 'RED';

              const reg022Done = os.etapasConcluidas.reg022Recebimento;
              const reg034Done = os.etapasConcluidas.reg034Limpeza;
              const reg016Done = os.etapasConcluidas.reg016Etapas;
              const mostrarItem5Card =
                reg022Done && (!item5Bloqueado || os.etapasConcluidas.reg035Manutencao);

              const reg034Unlocked =
                reg022Done &&
                (!fluxoMatch?.v4No ||
                  (fluxoMatch.v4No !== 'AGUARDA_REG016' &&
                    fluxoMatch.v4No !== 'AT_RECEBER'));
              const reg034LockMsg = !reg022Done
                ? 'Conclua o REG-022 (Inspeção de Recebimento — ADM) para liberar o REG-034.'
                : fluxoMatch?.v4No === 'AGUARDA_REG016'
                  ? 'ADM precisa primeiro abrir o REG-016 (Etiqueta BRANCA) antes do REG-034.'
                  : 'Clique em "Receber OS (Iniciar REG-034)" no painel da AT para liberar o preenchimento do REG-034.';

              const etapas = [
                {
                  label: '1. REG-022 (Recebimento ADM)',
                  done: reg022Done,
                  unlocked: true,
                  sectorLabel: 'Setor Administrativo (ADM)',
                  lockMsg: '',
                  href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(os.numeroOs)}`,
                },
                {
                  label: '2. REG-034 (Higienização AT)',
                  done: reg034Done,
                  unlocked: reg034Unlocked,
                  sectorLabel: 'Assistência Técnica (AT)',
                  lockMsg: reg034LockMsg,
                  href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(os.numeroOs)}`,
                },
                {
                  label: '3. REG-016 (Central OS)',
                  done: reg016Done,
                  unlocked: reg022Done,
                  sectorLabel: 'ADM / Assistência Técnica (AT)',
                  lockMsg:
                    'Cadastre o REG-022 (ADM) antes de abrir o REG-016.',
                  href: `/formularios/etapas-manutencao?os=${encodeURIComponent(os.numeroOs)}`,
                },
                ...(mostrarItem5Card
                  ? [
                      {
                        label: '4. Item 5 (REG-009 / REG-035)',
                        done: os.etapasConcluidas.reg035Manutencao,
                        unlocked: !item5Bloqueado,
                        sectorLabel: 'Assistência Técnica (AT)',
                        lockMsg:
                          'Item 5 bloqueado definitivamente: esta OS possui Etiqueta VERMELHA (orçamento não aprovado).',
                        href: `/formularios/checklist-manutencao?os=${encodeURIComponent(os.numeroOs)}`,
                      },
                    ]
                  : []),
              ];

              return (
                <Card key={os.chave}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierOs(os.numeroOs)}
                            className="ios-touch font-mono text-sm font-semibold text-primary hover:underline"
                            title="Abrir Dossiê completo da OS"
                          >
                            OS {os.numeroOs}
                          </button>
                          <span className="text-sm font-medium text-foreground">
                            {os.equipamento || 'Equipamento'}
                          </span>
                          {(os.marca || os.modelo) && (
                            <span className="text-xs text-muted-foreground">
                              {[os.marca, os.modelo].filter(Boolean).join(' · ')}
                            </span>
                          )}
                          {os.numeroSerie && (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              S/N {os.numeroSerie}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {os.cliente || '—'} · Atualizado em{' '}
                          {os.ultimaAtualizacao.split('-').reverse().join('/')}
                          {fluxoMatch?.setorPendente && fluxoMatch.setorPendente !== 'NENHUM'
                            ? ` · Setor pendente: ${fluxoMatch.setorPendente}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedNumeroOs(os.numeroOs);
                            setMostrarPainelExecucao(true);
                            toast.success(`OS ${os.numeroOs} selecionada no painel.`);
                          }}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <PlayCircle className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                          Selecionar OS
                        </Button>

                        {liberaImpressao && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEtiquetaPrint({
                                numeroOs: os.numeroOs,
                                cliente: os.cliente,
                                equipamento: os.equipamento,
                                marca: os.marca,
                                modelo: os.modelo,
                                numeroSerie: os.numeroSerie,
                                dataAnalise: os.ultimaAtualizacao,
                                statusEtiqueta: `${tag.nomeCor} — ${tag.labelStatus}`,
                              })
                            }
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Printer className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                            Etiqueta
                          </Button>
                        )}

                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            tag.badgeClass,
                          )}
                        >
                          <Tag className="h-3 w-3" strokeWidth={1.5} />
                          {tag.nomeCor}: {tag.labelStatus}
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'grid gap-2 border-t border-border/70 pt-3',
                        mostrarItem5Card ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
                      )}
                    >
                      {etapas.map((etapa) =>
                        etapa.unlocked || etapa.done ? (
                          <Link
                            key={etapa.label}
                            href={etapa.href}
                            className={cn(
                              'ios-touch flex min-h-[38px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium transition-colors',
                              etapa.done
                                ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300'
                                : 'border-primary/30 bg-primary/[0.04] text-foreground hover:bg-primary/[0.08]',
                            )}
                          >
                            <span className="truncate">{etapa.label}</span>
                            {etapa.done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            ) : (
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} />
                            )}
                          </Link>
                        ) : (
                          <button
                            key={etapa.label}
                            type="button"
                            onClick={() =>
                              showRuleNotice({
                                title: 'Etapa Bloqueada (POP-020)',
                                message: etapa.lockMsg,
                                sectorLabel: etapa.sectorLabel,
                                severity: 'warning',
                              })
                            }
                            className="ios-touch flex min-h-[38px] items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                          >
                            <span className="truncate">{etapa.label}</span>
                            <Lock className="h-3.5 w-3.5 shrink-0 opacity-75" strokeWidth={1.5} />
                          </button>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />

      <EquipmentLabelPrintDialog
        open={Boolean(etiquetaPrint)}
        onOpenChange={(open) => {
          if (!open) setEtiquetaPrint(null);
        }}
        dados={etiquetaPrint}
      />
    </div>
  );
}
