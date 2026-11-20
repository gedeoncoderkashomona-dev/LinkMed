'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  Lock,
  Printer,
  RotateCcw,
  ShieldAlert,
  Undo2,
  Wrench,
  XCircle,
} from 'lucide-react';

import {
  EquipmentLabelPrintDialog,
  type DadosEtiquetaEquipamento,
} from '@/components/operacional/equipment-label-print-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import {
  TAG_SPECS,
  determinarFormularioItem5PorMarca,
  type OrdemServicoFluxoState,
} from '@/core/domain/forms/os-workflow';
import {
  NODE_LABEL_PT,
  etiquetaV4ParaTagColor,
  formatarAcaoEventoV4,
} from '@/core/domain/os-v4/adapter';
import {
  acoesPermitidasParaPerfil,
  estadoDe,
  perfilSistemaParaSetorV4,
  type Comando,
  type Estado,
  type Evento,
} from '@/core/domain/os-v4/nucleo';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  OsCommandError,
  useConfirmOsNotification,
  useOsCommand,
  useOsFlowDetail,
  type OsNotificacaoV4Item,
} from '@/hooks/use-operacional';
import { showRuleNotice } from '@/lib/rule-notice';
import { cn } from '@/lib/utils';

export interface OsFlowPanelProps {
  numeroOs: string;
  osInicial?: OrdemServicoFluxoState | null;
  compact?: boolean;
  onAtualizada?: (os: OrdemServicoFluxoState) => void;
  onAbrirDossie?: (os: OrdemServicoFluxoState) => void;
}

const TRANSPORTE_OPTIONS = [
  { value: 'TRANSPORTADORA_LINKMED', label: 'Transportadora LinkMed' },
  { value: 'CORREIOS', label: 'Correios' },
  { value: 'CLIENTE', label: 'Portador / Cliente' },
] as const;

const ESTADO_GERAL_LABEL: Record<string, string> = {
  em_andamento: 'Em andamento',
  stand_by: 'Stand-by',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

function formatDataHoraBR(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

export function OsFlowPanel({
  numeroOs,
  osInicial = null,
  compact = false,
  onAtualizada,
  onAbrirDossie,
}: OsFlowPanelProps) {
  const { data: currentUser } = useCurrentUser();
  const detailQuery = useOsFlowDetail(numeroOs);
  const cmdMutation = useOsCommand();
  const confirmNotifMutation = useConfirmOsNotification();

  const os = detailQuery.data?.os ?? osInicial;
  const v4 = detailQuery.data?.v4;

  const eventos: Evento[] = React.useMemo(() => {
    if (v4?.eventos) return v4.eventos;
    if (os?.v4Eventos) return os.v4Eventos;
    return [];
  }, [v4?.eventos, os?.v4Eventos]);

  const estado: Estado | null = React.useMemo(() => {
    if (v4?.estado) return v4.estado;
    if (os?.v4Estado) return os.v4Estado;
    if (eventos.length > 0) return estadoDe(eventos);
    if (os) return estadoDe([]);
    return null;
  }, [v4?.estado, os, eventos]);

  const notificacoes: OsNotificacaoV4Item[] = React.useMemo(() => {
    if (v4?.notificacoes) return v4.notificacoes;
    if (!os?.notificacoes) return [];
    return os.notificacoes.map((n) => ({
      id: n.id,
      osId: os.id,
      numeroOs: os.numeroOs,
      numeroOsNormalizado: os.numeroOsNormalizado,
      para: n.destinatario,
      mensagem: n.mensagem,
      criadaEm: new Date(n.criadaEm).toISOString(),
      entregarEm: new Date(n.entregueEm).toISOString(),
      confirmadaEm: n.confirmadaEm ? new Date(n.confirmadaEm).toISOString() : null,
      confirmadaPorId: n.confirmadaPorId ?? null,
      confirmadaPorNome: n.confirmadaPorNome ?? null,
      ultimoLembreteEm: n.lembreteEnviadoEm ? new Date(n.lembreteEnviadoEm).toISOString() : null,
      ehLembrete: n.quantidadeLembretes > 0 || n.mensagem.startsWith('Lembrete (7 dias):'),
    }));
  }, [v4?.notificacoes, os]);

  const reg034Salvo = v4?.reg034Salvo ?? os?.reg034Preenchido ?? false;
  const item5Preenchido = v4?.item5Preenchido ?? os?.item5Preenchido ?? false;

  // Estados de formulários inline para ações com parâmetros
  const [transporte, setTransporte] = React.useState<string>('TRANSPORTADORA_LINKMED');
  const [mostrarNaoEnviado, setMostrarNaoEnviado] = React.useState(false);
  const [justificativaNaoEnviado, setJustificativaNaoEnviado] = React.useState('');
  const [finalNaoEnviado, setFinalNaoEnviado] = React.useState<'VERDE' | 'VERMELHA'>('VERDE');

  // Transversais: corrigir / estornar / cancelar / reabrir
  const [modoTransversal, setModoTransversal] = React.useState<
    null | 'CORRIGIR' | 'ESTORNAR' | 'CANCELAR' | 'REABRIR'
  >(null);
  const [motivoTransversal, setMotivoTransversal] = React.useState('');
  const [paraNoEstorno, setParaNoEstorno] = React.useState('');

  const [etiquetaPrint, setEtiquetaPrint] = React.useState<DadosEtiquetaEquipamento | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = React.useState(!compact);

  if (detailQuery.isLoading && !os) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Carregando fluxo oficial da OS {numeroOs}...
        </CardContent>
      </Card>
    );
  }

  if (!os || !estado) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-semibold text-foreground">
              OS {numeroOs} ainda não iniciada no fluxo
            </p>
            <p className="text-xs text-muted-foreground">
              Toda OS deve começar pelo cadastro no REG-022 (Inspeção de Recebimento — ADM).
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/formularios/inspecao-recebimento?os=${encodeURIComponent(numeroOs)}`}>
              Abrir REG-022
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tagColor = etiquetaV4ParaTagColor(estado.etiqueta);
  const tagSpec = tagColor ? TAG_SPECS[tagColor] : null;
  const permissoes = acoesPermitidasParaPerfil(estado, currentUser?.perfil, currentUser?.id);
  const setorUsuario = perfilSistemaParaSetorV4(currentUser?.perfil);
  const item5Form = determinarFormularioItem5PorMarca(os.identificacao.marca);

  async function runComando(comando: Comando) {
    if (!os || !estado) return;
    try {
      const res = await cmdMutation.mutateAsync({
        numeroOs: os.numeroOs,
        versaoVista: estado.versao,
        comando,
      });
      setModoTransversal(null);
      setMotivoTransversal('');
      setMostrarNaoEnviado(false);
      setJustificativaNaoEnviado('');
      onAtualizada?.(res.os);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível executar esta ação no fluxo da OS.';
      showRuleNotice({
        message: msg,
        severity:
          err instanceof OsCommandError && err.codigo === 'versao' ? 'warning' : 'blocked',
      });
      if (err instanceof OsCommandError && err.codigo === 'versao') {
        detailQuery.refetch();
      }
    }
  }

  async function handleConfirmarNotificacao(n: OsNotificacaoV4Item) {
    try {
      const res = await confirmNotifMutation.mutateAsync({
        notificacaoId: n.id,
        numeroOs: n.numeroOs,
      });
      if (res.os) onAtualizada?.(res.os);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar ciência.';
      showRuleNotice({ message: msg, severity: 'warning' });
    }
  }

  function openPrintDialog() {
    if (!os) return;
    setEtiquetaPrint({
      numeroOs: os.numeroOs,
      cliente: os.identificacao.cliente,
      equipamento: os.identificacao.equipamento,
      marca: os.identificacao.marca,
      modelo: os.identificacao.modelo,
      numeroSerie: os.identificacao.numeroSerie,
      dataAnalise: formatDataHoraBR(String(os.atualizadaEm)),
      responsavelAnalise: currentUser?.nomeCompleto ?? os.criadaPorNome,
      statusEtiqueta: tagSpec ? `${tagSpec.nomeCor} — ${tagSpec.labelStatus}` : estado?.etiqueta ?? 'Em análise',
    });
  }

  const nowMs = Date.now();
  const notifPendentes = notificacoes.filter(
    (n) => !n.confirmadaEm && new Date(n.entregarEm).getTime() <= nowMs,
  );
  const notifRetidas = notificacoes.filter(
    (n) => !n.confirmadaEm && new Date(n.entregarEm).getTime() > nowMs,
  );

  const acaoUnica = (acaoName: string, valor?: boolean) =>
    permissoes.acoesFluxo.find(
      (a) => a.acao === acaoName && (valor === undefined || a.valor === valor),
    );

  const isBusy = cmdMutation.isPending || confirmNotifMutation.isPending;

  return (
    <div className="space-y-4" data-testid={`os-flow-panel-${os.numeroOsNormalizado}`}>
      {/* Cabeçalho da OS com etiqueta calculada e metadados */}
      <Card className="border-border bg-card">
        <CardHeader className={cn('pb-3', compact && 'p-4 pb-2')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold text-foreground">
                  OS {os.numeroOs}
                </span>
                {tagSpec ? (
                  <Badge className={cn('border font-medium', tagSpec.badgeClass)}>
                    {tagSpec.nomeCor} · {tagSpec.labelStatus}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Sem etiqueta atribuída (Inicial)
                  </Badge>
                )}
                <Badge
                  variant={
                    estado.estadoGeral === 'finalizada'
                      ? 'success'
                      : estado.estadoGeral === 'cancelada'
                        ? 'destructive'
                        : estado.estadoGeral === 'stand_by'
                          ? 'warning'
                          : 'outline'
                  }
                >
                  {ESTADO_GERAL_LABEL[estado.estadoGeral] ?? estado.estadoGeral}
                </Badge>
                <Badge variant="outline" className="font-mono text-[11px]">
                  v{estado.versao}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{os.identificacao.cliente}</strong> —{' '}
                {os.identificacao.equipamento} · {os.identificacao.marca}{' '}
                {os.identificacao.modelo} (NS: {os.identificacao.numeroSerie || 'S/N'})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {permissoes.liberaImpressaoEtiqueta && (
                <Button size="sm" variant="outline" onClick={openPrintDialog}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Imprimir Etiqueta
                </Button>
              )}
              {onAbrirDossie && (
                <Button size="sm" variant="outline" onClick={() => onAbrirDossie(os)}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Dossiê POP-020
                </Button>
              )}
            </div>
          </div>

          {/* Linha de status operacional + Item 5 + Setor Pendente */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Etapa: {NODE_LABEL_PT[estado.no] ?? estado.no}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
              Setor responsável:{' '}
              <strong className="text-foreground">
                {estado.setor ?? 'Nenhum (Encerrado)'}
              </strong>
            </span>
            {estado.item5Bloqueado ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 font-medium text-red-700 dark:text-red-300">
                <Lock className="h-3.5 w-3.5" />
                Item 5 bloqueado definitivamente (Etiqueta VERMELHA)
              </span>
            ) : item5Preenchido ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Item 5 ({item5Form}) preenchido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Item 5 ({item5Form}) liberado · obrigatório antes da Etiqueta VERDE
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Próxima Ação (Exclusiva para o nó atual e perfil logado — Seção 8) */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Próxima ação da OS
            </span>
            {setorUsuario ? (
              <Badge variant="outline" className="text-[11px]">
                Seu setor: {setorUsuario}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                Perfil: {currentUser?.perfil ?? 'Visitante'} (somente leitura no fluxo)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {estado.cancelada ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">
                  Ordem de Serviço Cancelada
                </p>
                <p className="text-xs text-muted-foreground">
                  Para retomar do ponto onde parou, ADM ou AT deve reabrir a OS informando o
                  motivo.
                </p>
              </div>
              {permissoes.podeReabrir && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setModoTransversal('REABRIR');
                    setMotivoTransversal('');
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reabrir OS
                </Button>
              )}
            </div>
          ) : estado.estadoGeral === 'finalizada' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Fluxo encerrado com etiqueta <strong>{estado.etiqueta}</strong>.
                </span>
              </div>
              {!estado.item5Bloqueado && (
                <Link
                  href={`/formularios/etapas-manutencao?os=${encodeURIComponent(os.numeroOs)}`}
                  className="text-xs font-medium text-primary underline"
                >
                  Visualizar REG-016
                </Link>
              )}
            </div>
          ) : permissoes.acoesFluxo.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Aguardando atuação do setor{' '}
                <strong className="text-primary">{estado.setor}</strong>
              </p>
              <p className="mt-0.5">
                Etapa atual: {NODE_LABEL_PT[estado.no] ?? estado.no}.{' '}
                {setorUsuario
                  ? 'Nenhuma ação está atribuída ao seu perfil neste momento.'
                  : 'Perfis de governança/diretoria visualizam o histórico, mas apenas AT, ADM ou Almoxarifado avançam etapas.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* A01: ADM abrir REG-016 */}
              {acaoUnica('ABRIR_REG016') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      Abrir REG-016 e atribuir Etiqueta BRANCA
                    </p>
                    <p className="text-muted-foreground">
                      Envia a OS para a fila da Assistência Técnica (AT) e libera preenchimento do
                      REG-034.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => runComando({ tipo: 'ACAO', acao: 'ABRIR_REG016' })}
                    >
                      Abrir REG-016 (Etiqueta BRANCA)
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    {!compact && (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/formularios/etapas-manutencao?os=${encodeURIComponent(os.numeroOs)}`}
                        >
                          Preencher no formulário REG-016
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* A02: AT receber OS */}
              {acaoUnica('RECEBER_OS') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">Confirmar recebimento pela AT</p>
                    <p className="text-muted-foreground">
                      Habilita a etapa obrigatória do REG-034 (Limpeza e Higienização).
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'RECEBER_OS' })}
                  >
                    Receber OS (Iniciar REG-034)
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* A03: REG-034 salvo */}
              {acaoUnica('REG034_SALVO') && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs">
                      <p className="font-medium text-foreground">
                        Etapa REG-034 (Limpeza e Higienização — Álcool 70%)
                      </p>
                      <p className="text-muted-foreground">
                        {reg034Salvo
                          ? 'REG-034 já salvo para esta OS. Você pode avançar para higienização.'
                          : 'Preencha e salve o REG-034 primeiro para liberar a próxima etapa.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant={reg034Salvo ? 'outline' : 'default'}>
                        <Link
                          href={`/formularios/limpeza-equipamento?os=${encodeURIComponent(os.numeroOs)}`}
                        >
                          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                          {reg034Salvo ? 'Ver / Editar REG-034' : 'Preencher REG-034'}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant={reg034Salvo ? 'default' : 'outline'}
                        disabled={isBusy}
                        onClick={() => runComando({ tipo: 'ACAO', acao: 'REG034_SALVO' })}
                      >
                        Avançar com REG-034 salvo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* A04: Marcar higienizado (VIOLETA) */}
              {acaoUnica('MARCAR_HIGIENIZADO') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      Concluir higienização (Etiqueta VIOLETA)
                    </p>
                    <p className="text-muted-foreground">
                      Coloca o equipamento em análise técnica na bancada.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'MARCAR_HIGIENIZADO' })}
                  >
                    Marcar Higienizado (VIOLETA)
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* A05: Análise completa (CINZA) */}
              {acaoUnica('ANALISE_COMPLETA') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      Concluir análise técnica (Etiqueta CINZA)
                    </p>
                    <p className="text-muted-foreground">
                      Após concluir a análise inicial no REG-016, avance para definir Garantia /
                      Envio / Orçamento.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'ANALISE_COMPLETA' })}
                  >
                    Análise Completa (CINZA)
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* B01/B02: Pergunta garantia */}
              {(acaoUnica('RESPONDER_GARANTIA', true) ||
                acaoUnica('RESPONDER_GARANTIA', false)) && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Trata-se de garantia?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_GARANTIA', valor: true })
                      }
                    >
                      Sim — Garantia (Etiqueta LARANJA)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_GARANTIA', valor: false })
                      }
                    >
                      Não — Verificar envio à fábrica
                    </Button>
                  </div>
                </div>
              )}

              {/* B03/B04: Pergunta envio à fábrica */}
              {(acaoUnica('RESPONDER_ENVIO', true) ||
                acaoUnica('RESPONDER_ENVIO', false)) && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Trata-se de envio à fábrica?
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tipo de transporte (obrigatório se Sim)
                      </label>
                      <SelectNative
                        value={transporte}
                        onChange={(e) => setTransporte(e.target.value)}
                      >
                        {TRANSPORTE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({
                          tipo: 'ACAO',
                          acao: 'RESPONDER_ENVIO',
                          valor: true,
                          campos: { transporte },
                        })
                      }
                    >
                      Sim — Aguardar envio
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_ENVIO', valor: false })
                      }
                    >
                      Não — Enviar para Orçamento (ADM)
                    </Button>
                  </div>
                </div>
              )}

              {/* B05/B06: Equipamento foi enviado à fábrica? */}
              {(acaoUnica('RESPONDER_ENVIADO', true) ||
                acaoUnica('RESPONDER_ENVIADO', false)) && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">
                    O equipamento foi enviado à fábrica?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_ENVIADO', valor: true })
                      }
                    >
                      Sim — Enviado à Fábrica (Etiqueta MARROM)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => setMostrarNaoEnviado((prev) => !prev)}
                    >
                      Não — Justificar e Encerrar
                    </Button>
                  </div>

                  {mostrarNaoEnviado && (
                    <div className="space-y-2.5 rounded-md border border-border bg-background p-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">
                          Justificativa de não envio (obrigatória)
                        </label>
                        <Input
                          placeholder="Ex.: Cliente optou por não enviar / equipamento resolvido em bancada..."
                          value={justificativaNaoEnviado}
                          onChange={(e) => setJustificativaNaoEnviado(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">
                          Etiqueta final do encerramento
                        </label>
                        <SelectNative
                          value={finalNaoEnviado}
                          onChange={(e) =>
                            setFinalNaoEnviado(e.target.value as 'VERDE' | 'VERMELHA')
                          }
                        >
                          <option value="VERDE">
                            Etiqueta VERDE — Serviço finalizado (exige Item 5)
                          </option>
                          <option value="VERMELHA">
                            Etiqueta VERMELHA — Não aprovado / Encerrado (bloqueia Item 5)
                          </option>
                        </SelectNative>
                      </div>
                      {finalNaoEnviado === 'VERDE' && !item5Preenchido && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Atenção (D8): para encerrar como VERDE, salve antes o Item 5 no REG-016
                          ou o {item5Form}.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            runComando({
                              tipo: 'ACAO',
                              acao: 'RESPONDER_ENVIADO',
                              valor: false,
                              campos: {
                                justificativa: justificativaNaoEnviado,
                                final: finalNaoEnviado,
                              },
                            })
                          }
                        >
                          Confirmar encerramento ({finalNaoEnviado})
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMostrarNaoEnviado(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* B07: Retorno da fábrica -> VERDE (sem Item 5, sem orçamento — D7/D8) */}
              {acaoUnica('FINALIZAR_RETORNO_FABRICA') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      Equipamento em stand-by na fábrica (Etiqueta MARROM)
                    </p>
                    <p className="text-muted-foreground">
                      Quando retornar da fábrica, confirme abaixo para encerrar com Etiqueta VERDE
                      (D7: sem orçamento adicional).
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      runComando({ tipo: 'ACAO', acao: 'FINALIZAR_RETORNO_FABRICA' })
                    }
                  >
                    Retornou da Fábrica — Finalizar (VERDE)
                  </Button>
                </div>
              )}

              {/* C01: ADM contatar cliente -> AMARELA */}
              {acaoUnica('AGUARDAR_APROVACAO') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      ADM contatar cliente com orçamento
                    </p>
                    <p className="text-muted-foreground">
                      Envia orçamento ao cliente e coloca a OS em stand-by (Etiqueta AMARELA).
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'AGUARDAR_APROVACAO' })}
                  >
                    Cliente Contatado — Aguardar Aprovação (AMARELA)
                  </Button>
                </div>
              )}

              {/* C02/C03: Orçamento aprovado? */}
              {(acaoUnica('RESPONDER_ORCAMENTO', true) ||
                acaoUnica('RESPONDER_ORCAMENTO', false)) && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">
                    O orçamento foi aprovado pelo cliente?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_ORCAMENTO', valor: true })
                      }
                    >
                      Aprovado (Etiqueta AZUL → Almoxarifado)
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isBusy}
                      onClick={() =>
                        runComando({ tipo: 'ACAO', acao: 'RESPONDER_ORCAMENTO', valor: false })
                      }
                    >
                      Reprovado (Notificar AT)
                    </Button>
                  </div>
                </div>
              )}

              {/* C04: AT ciência da reprovação -> VERMELHA */}
              {acaoUnica('CIENTE_REPROVACAO') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-red-700 dark:text-red-300">
                      Orçamento reprovado pelo cliente
                    </p>
                    <p className="text-muted-foreground">
                      Confirme a ciência da AT para aplicar Etiqueta VERMELHA e encerrar a OS (D4:
                      Item 5 bloqueado).
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'CIENTE_REPROVACAO' })}
                  >
                    Ciente da Reprovação (Etiqueta VERMELHA)
                  </Button>
                </div>
              )}

              {/* P01/P02/P03: Almoxarifado peças */}
              {(acaoUnica('PECAS_DISPONIVEIS') || acaoUnica('AGUARDANDO_PECAS')) && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Disponibilidade de peças (Almoxarifado)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {acaoUnica('PECAS_DISPONIVEIS') && (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => runComando({ tipo: 'ACAO', acao: 'PECAS_DISPONIVEIS' })}
                      >
                        Peças Disponíveis (Notificar AT)
                      </Button>
                    )}
                    {acaoUnica('AGUARDANDO_PECAS') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => runComando({ tipo: 'ACAO', acao: 'AGUARDANDO_PECAS' })}
                      >
                        Falta de Peças — Stand-by (Etiqueta PRETA · POP 009)
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* P04: AT confirmar recebimento de peças */}
              {acaoUnica('PECAS_RECEBIDAS') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">
                      Peças liberadas pelo Almoxarifado
                    </p>
                    <p className="text-muted-foreground">
                      Confirme o recebimento das peças pela AT para iniciar o reparo.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => runComando({ tipo: 'ACAO', acao: 'PECAS_RECEBIDAS' })}
                  >
                    Peças Recebidas (Em Execução)
                  </Button>
                </div>
              )}

              {/* P05: AT finalizar serviço -> VERDE (exige Item 5 - D8) */}
              {acaoUnica('SERVICO_FINALIZADO') && (
                <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs">
                      <p className="font-medium text-foreground">
                        Finalizar serviço e atribuir Etiqueta VERDE
                      </p>
                      <p className="text-muted-foreground">
                        {item5Preenchido
                          ? `Item 5 (${item5Form}) preenchido. Pronto para encerrar com Etiqueta VERDE.`
                          : `Decisão D8: preencha antes a seção 5 (Item 5) no REG-016 ou o ${item5Form}.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!item5Preenchido && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/formularios/checklist-manutencao?os=${encodeURIComponent(os.numeroOs)}`}
                          >
                            Preencher {item5Form}
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => runComando({ tipo: 'ACAO', acao: 'SERVICO_FINALIZADO' })}
                      >
                        Serviço Finalizado (Etiqueta VERDE)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barra de ações transversais (Corrigir / Estornar / Cancelar) */}
          {(permissoes.podeCorrigir || permissoes.podeEstornar || permissoes.podeCancelar) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
              {permissoes.podeCorrigir && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setModoTransversal(modoTransversal === 'CORRIGIR' ? null : 'CORRIGIR');
                    setMotivoTransversal('');
                  }}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Corrigir minha última ação
                </Button>
              )}
              {permissoes.podeEstornar && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300"
                  onClick={() => {
                    setModoTransversal(modoTransversal === 'ESTORNAR' ? null : 'ESTORNAR');
                    setMotivoTransversal('');
                    if (!paraNoEstorno && permissoes.nosEstornaveis[0]) {
                      setParaNoEstorno(permissoes.nosEstornaveis[0].no);
                    }
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Estornar etapa (ADM)
                </Button>
              )}
              {permissoes.podeCancelar && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-red-600 hover:text-red-700"
                  onClick={() => {
                    setModoTransversal(modoTransversal === 'CANCELAR' ? null : 'CANCELAR');
                    setMotivoTransversal('');
                  }}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Cancelar OS
                </Button>
              )}
            </div>
          )}

          {/* Painel inline transversal */}
          {modoTransversal && (
            <div className="space-y-2.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                {modoTransversal === 'CORRIGIR' && 'Corrigir última ação (R09)'}
                {modoTransversal === 'ESTORNAR' && 'Estornar OS para nó já percorrido (ADM)'}
                {modoTransversal === 'CANCELAR' && 'Cancelar Ordem de Serviço'}
                {modoTransversal === 'REABRIR' && 'Reabrir Ordem de Serviço'}
              </p>

              {modoTransversal === 'ESTORNAR' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Retornar para o nó
                  </label>
                  <SelectNative
                    value={paraNoEstorno}
                    onChange={(e) => setParaNoEstorno(e.target.value)}
                  >
                    {permissoes.nosEstornaveis.map((opt) => (
                      <option key={opt.no} value={opt.no}>
                        {NODE_LABEL_PT[opt.no] ?? opt.no}
                        {opt.etiqueta ? ` (${opt.etiqueta})` : ''}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Motivo / Justificativa obrigatória
                </label>
                <Input
                  placeholder="Descreva o motivo..."
                  value={motivoTransversal}
                  onChange={(e) => setMotivoTransversal(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    if (modoTransversal === 'ESTORNAR') {
                      runComando({
                        tipo: 'ESTORNAR',
                        paraNo: paraNoEstorno,
                        motivo: motivoTransversal,
                      });
                    } else {
                      runComando({
                        tipo: modoTransversal,
                        motivo: motivoTransversal,
                      });
                    }
                  }}
                >
                  Confirmar {modoTransversal.toLowerCase()}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoTransversal(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notificações Pendentes / Retidas da OS (Confirmar ciência NÃO muda etapa — D5/R08) */}
      {(notifPendentes.length > 0 || notifRetidas.length > 0) && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              Notificações entre setores
              <Badge variant="outline" className="text-[11px] font-normal">
                Confirmar ciência não avança etapa (R08)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {notifPendentes.map((n) => {
              const podeConfirmar = setorUsuario === n.para;
              return (
                <div
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{n.para}</Badge>
                      {n.ehLembrete && <Badge variant="warning">Lembrete 7 dias</Badge>}
                      <span className="font-medium text-foreground">{n.mensagem}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Entregue em {formatDataHoraBR(n.entregarEm)}
                    </p>
                  </div>
                  {podeConfirmar ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => handleConfirmarNotificacao(n)}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Confirmar ciência
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Aguardando ciência de {n.para}
                    </span>
                  )}
                </div>
              );
            })}
            {notifRetidas.map((n) => (
              <div
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <div>
                  <Badge variant="warning" className="mr-2">
                    Retida até {formatDataHoraBR(n.entregarEm)}
                  </Badge>
                  <span className="font-medium text-foreground">{n.mensagem}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Para {n.para}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Linha do Tempo Append-Only (eventos anulados aparecem riscados — R09) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-muted-foreground" />
              Linha do Tempo Imutável ({eventos.length} evento{eventos.length === 1 ? '' : 's'})
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setMostrarHistorico((v) => !v)}
            >
              {mostrarHistorico ? 'Recolher' : 'Exibir histórico'}
            </Button>
          </div>
        </CardHeader>
        {mostrarHistorico && (
          <CardContent className="space-y-2 text-xs">
            {eventos.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum evento registrado ainda após abertura no REG-022 (aguardando ADM abrir o
                REG-016).
              </p>
            ) : (
              <div className="space-y-1.5">
                {[...eventos].reverse().map((ev) => {
                  const anulado = estado.anuladosIds.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/60 px-3 py-2',
                        anulado && 'bg-muted/30 opacity-65',
                      )}
                    >
                      <div className={cn('space-y-0.5', anulado && 'line-through')}>
                        <p className="font-medium text-foreground">
                          {formatarAcaoEventoV4(ev)}
                        </p>
                        {ev.motivo && (
                          <p className="text-[11px] text-muted-foreground">
                            Motivo: {ev.motivo}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-[11px] text-muted-foreground">
                        <span>
                          {ev.usuario.nome ?? ev.usuario.perfil} ({ev.usuario.perfil})
                        </span>
                        <span>{formatDataHoraBR(ev.em)}</span>
                        {anulado && (
                          <Badge variant="outline" className="text-[10px]">
                            Anulado
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
