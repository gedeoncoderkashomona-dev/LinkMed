'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  FileText,
  History,
  Lock,
  PlayCircle,
  Printer,
  RotateCcw,
  Search,
  Tag,
  Undo2,
  Wrench,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EquipmentLabelPrintDialog,
  type DadosEtiquetaEquipamento,
} from '@/components/operacional/equipment-label-print-dialog';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
import {
  aggregateServiceOrders,
  admMarcarEtiquetaAmarelaOrcamento,
  admMarcarEtiquetaBrancaNoReg016,
  admResponderOrcamentoAprovado,
  almoxarifadoDecidirPecas,
  almoxarifadoRetomarOsDeAguardandoPecas,
  atFinalizarServicoComEtiquetaVerde,
  atMarcarEtiquetaCinzaAnaliseCompleta,
  atMarcarEtiquetaVioleta,
  atPreencherItem5Reg016,
  atRegistrarReg034,
  atResponderEquipamentoEnviadoFabrica,
  atResponderPerguntaEnvioFabrica,
  atResponderPerguntaGarantia,
  cancelarOs,
  confirmarNotificacaoSetor,
  corrigirMarcacaoOuRespostaPeloDono,
  criarOsViaReg022,
  formatarNomeSetorCompleto,
  type CodigoPassoFluxoOS,
  OPCOES_TRANSPORTE_FABRICA,
  reabrirOs,
  TAG_SPECS,
  TAG_SPECS_LIST,
  type AtorAcaoOS,
  type OrdemServicoFluxoState,
  type TagColor,
  type TipoTransporteFabrica,
} from '@/core/domain/forms/os-workflow';
import { mergeOsFluxoIntoServiceOrders } from '@/core/domain/forms/os-reg016-sync';
import {
  useFormsOverview,
  useOsFlowList,
  useSaveOsFlow,
} from '@/hooks/use-operacional';
import { useCurrentUser } from '@/hooks/use-current-user';
import { showRuleNotice } from '@/lib/rule-notice';
import { cn } from '@/lib/utils';

const ATOR_FALLBACK_INICIAL: AtorAcaoOS = {
  usuarioId: 'usr-adm-01',
  usuarioNome: 'Setor Administrativo (ADM)',
  perfil: 'adm',
};

const STORAGE_KEY_FLUXO_PREFIX = 'regulaon:os_fluxo_v2:';

function salvarFluxoLocalStorage(state: OrdemServicoFluxoState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_FLUXO_PREFIX}${state.numeroOs}`, JSON.stringify(state));
    localStorage.setItem(`${STORAGE_KEY_FLUXO_PREFIX}current`, state.numeroOs);
  } catch {
    // ignora se storage estiver desabilitado
  }
}

const SETOR_COMPETENCIA_MAP: Record<string, string> = {
  adm: 'Administrativo (ADM)',
  tecnico: 'Assistência Técnica (AT)',
  estoquista: 'Almoxarifado / Estoque',
  todos: 'Geral',
};

const ESTADO_GERAL_LABEL: Record<string, string> = {
  em_andamento: 'Em andamento',
  stand_by: 'Em espera (Stand-by)',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

function formatTipoEventoHumano(tipo: string): string {
  switch (tipo) {
    case 'CRIACAO_OS':
      return 'Abertura REG-022';
    case 'MARCACAO_ETIQUETA':
      return 'Etiqueta';
    case 'CONFIRMACAO_NOTIFICACAO':
      return 'Ciência do setor';
    case 'FORMULARIO_CONCLUIDO':
      return 'Registro concluído';
    case 'RESPOSTA_PERGUNTA':
      return 'Decisão';
    case 'CORRECAO_MARCACAO':
      return 'Correção (Autor)';
    case 'CANCELAMENTO':
      return 'Cancelamento';
    case 'REABERTURA':
      return 'Reabertura';
    default:
      return 'Atualização';
  }
}

function obterSetorDoPasso(passo: CodigoPassoFluxoOS): 'adm' | 'tecnico' | 'estoquista' | 'todos' {
  switch (passo) {
    case 'A1_CRIADA_NO_REG022':
    case 'C_AGUARDANDO_ORCAMENTO_ADM':
    case 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE':
      return 'adm';

    case 'A2_BRANCA_NOTIFICA_AT':
    case 'A3_AT_CONFIRMOU_PREENCHER_REG034':
    case 'A4_REG034_PREENCHIDO':
    case 'A5_VIOLETA_HIGIENIZADO':
    case 'A6_CINZA_ANALISE_CONCLUIDA':
    case 'B2_PERGUNTA_ENVIO_FABRICA':
    case 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA':
    case 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT':
    case 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT':
    case 'D5_AT_PRONTO_PARA_FINALIZAR':
      return 'tecnico';

    case 'D_AGUARDANDO_CONFIRMACAO_ALMOX':
    case 'D1_ALMOX_DECIDINDO_PECAS':
    case 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS':
      return 'estoquista';

    default:
      return 'todos';
  }
}

export function EquipamentosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useFormsOverview();
  const searchParams = useSearchParams();
  const osQueryParam = searchParams.get('os');
  const [busca, setBusca] = React.useState('');
  const [filtroCor, setFiltroCor] = React.useState<TagColor | ''>('');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);
  const [etiquetaPrint, setEtiquetaPrint] = React.useState<DadosEtiquetaEquipamento | null>(null);

  const { data: osFlowData } = useOsFlowList();
  const saveOsFlow = useSaveOsFlow();
  const [mostrarPainelExecucao, setMostrarPainelExecucao] = React.useState(true);
  const [mostrarHistorico, setMostrarHistorico] = React.useState(false);
  const [mostrarCorrecao, setMostrarCorrecao] = React.useState(false);
  const [motivoCorrecao, setMotivoCorrecao] = React.useState('');
  const ordensFluxoServidor = React.useMemo(
    () => osFlowData?.ordens ?? [],
    [osFlowData?.ordens],
  );
  const jaAutoSelecionouRef = React.useRef(false);

  const atorLogado: AtorAcaoOS = React.useMemo(
    () => ({
      usuarioId: user?.id ?? ATOR_FALLBACK_INICIAL.usuarioId,
      usuarioNome: user?.nomeCompleto ?? ATOR_FALLBACK_INICIAL.usuarioNome,
      perfil: user?.perfil ?? ATOR_FALLBACK_INICIAL.perfil,
    }),
    [user],
  );

  const [transporteSelecionado, setTransporteSelecionado] =
    React.useState<TipoTransporteFabrica>('transportadora_linkmed');
  const [justificativaNaoEnviado, setJustificativaNaoEnviado] = React.useState(
    'Cliente optou por reparo em bancada local',
  );
  const [motivoCancelamento, setMotivoCancelamento] = React.useState('');
  const [fluxoV2, setFluxoV2] = React.useState<OrdemServicoFluxoState | null>(null);

  const setorDoPasso = fluxoV2 ? obterSetorDoPasso(fluxoV2.passoAtual) : 'todos';
  const podeExecutarPasso =
    !user ||
    user.perfil === 'diretor' ||
    user.perfil === 'gestor' ||
    user.perfil === setorDoPasso;

  const setorOperacionalDoUsuario = React.useMemo(() => {
    if (!user) return null;
    if (user.perfil === 'adm') return 'ADM' as const;
    if (user.perfil === 'tecnico') return 'AT' as const;
    if (user.perfil === 'estoquista') return 'ALMOXARIFADO' as const;
    return null;
  }, [user]);

  const ordensPendentesMeuSetor = React.useMemo(() => {
    return ordensFluxoServidor.filter((o) => {
      if (o.estadoGeral === 'finalizada' || o.estadoGeral === 'cancelada') return false;
      if (!setorOperacionalDoUsuario) return o.setorPendente !== 'NENHUM';
      return o.setorPendente === setorOperacionalDoUsuario;
    });
  }, [ordensFluxoServidor, setorOperacionalDoUsuario]);

  const ordensServico = React.useMemo(
    () =>
      mergeOsFluxoIntoServiceOrders(
        ordensFluxoServidor,
        aggregateServiceOrders(data?.records ?? []),
      ),
    [ordensFluxoServidor, data?.records],
  );

  const ultimoEventoCorrigivel = React.useMemo(() => {
    if (!fluxoV2 || !user || fluxoV2.estadoGeral === 'cancelada') return null;
    for (let i = fluxoV2.historico.length - 1; i >= 0; i -= 1) {
      const ev = fluxoV2.historico[i];
      if (!ev) continue;
      if (
        ev.snapshotAnterior &&
        ev.usuarioId === user.id &&
        ev.tipo !== 'CRIACAO_OS' &&
        ev.tipo !== 'CORRECAO_MARCACAO' &&
        ev.tipo !== 'CANCELAMENTO' &&
        ev.tipo !== 'REABERTURA'
      ) {
        return ev;
      }
      // Só permite corrigir imediatamente o último ato operacional antes de outro usuário avançar
      if (ev.usuarioId !== user.id) break;
    }
    return null;
  }, [fluxoV2, user]);

  React.useEffect(() => {
    if (!osFlowData?.ordens) return;
    const lista = osFlowData.ordens;

    if (osQueryParam) {
      const alvoLimpo = osQueryParam.replace(/^OS:/i, '').trim().toUpperCase();
      const encontradaServidor = lista.find(
        (o) => o.numeroOs.trim().toUpperCase() === alvoLimpo,
      );
      if (encontradaServidor) {
        setFluxoV2((atual) =>
          !atual ||
          atual.numeroOs.trim().toUpperCase() !== alvoLimpo ||
          (encontradaServidor.historico?.length ?? 0) >= (atual.historico?.length ?? 0)
            ? encontradaServidor
            : atual,
        );
        salvarFluxoLocalStorage(encontradaServidor);
        setMostrarPainelExecucao(true);
        return;
      }
    }

    if (fluxoV2) {
      const correspondenteAtual = lista.find(
        (o) => o.numeroOs.trim().toUpperCase() === fluxoV2.numeroOs.trim().toUpperCase(),
      );
      if (
        correspondenteAtual &&
        (correspondenteAtual.historico?.length ?? 0) > (fluxoV2.historico?.length ?? 0)
      ) {
        setFluxoV2(correspondenteAtual);
        salvarFluxoLocalStorage(correspondenteAtual);
        return;
      }
    }

    if (!jaAutoSelecionouRef.current && lista.length > 0 && !osQueryParam) {
      const pendenteMeuSetor = setorOperacionalDoUsuario
        ? lista.find(
            (o) =>
              o.estadoGeral !== 'finalizada' &&
              o.estadoGeral !== 'cancelada' &&
              o.setorPendente === setorOperacionalDoUsuario,
          )
        : null;
      const alvo = pendenteMeuSetor ?? lista[0] ?? null;
      if (alvo) {
        setFluxoV2(alvo);
        salvarFluxoLocalStorage(alvo);
        setMostrarPainelExecucao(true);
        jaAutoSelecionouRef.current = true;
      }
    }
  }, [
    osFlowData?.ordens,
    osQueryParam,
    setorOperacionalDoUsuario,
    fluxoV2,
  ]);

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

  async function executarTransicao(
    fn: (s: OrdemServicoFluxoState) => OrdemServicoFluxoState,
    msg: string,
  ) {
    if (!fluxoV2) return;
    const anterior = fluxoV2;
    let next: OrdemServicoFluxoState;
    try {
      next = fn(structuredClone(anterior));
    } catch (err) {
      showRuleNotice({
        title: 'Regra Operacional (POP-020)',
        message: err instanceof Error ? err.message : 'Transição inválida no fluxo da OS.',
        severity: 'warning',
      });
      return;
    }

    setFluxoV2(next);

    try {
      const res = await saveOsFlow.mutateAsync(next);
      setFluxoV2(next);
      salvarFluxoLocalStorage(next);
      if (res.reg016Record) {
        toast.success(msg, {
          description: 'REG-016 sincronizado e atualizado automaticamente no sistema.',
        });
      } else {
        toast.success(msg);
      }
    } catch (err) {
      setFluxoV2(anterior);
      showRuleNotice({
        title: 'Acesso ou Transição Não Concluída',
        message:
          err instanceof Error
            ? err.message
            : 'Você não tem permissão ou a etapa anterior ainda não foi concluída.',
        severity: 'blocked',
      });
    }
  }

  async function carregarOsRealNoPainel(os: {
    numeroOs: string;
    cliente: string;
    equipamento: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    tagColor: TagColor;
  }) {
    const doServidor = ordensFluxoServidor.find(
      (o) => o.numeroOs.trim().toUpperCase() === os.numeroOs.trim().toUpperCase(),
    );
    if (doServidor) {
      setFluxoV2(doServidor);
      salvarFluxoLocalStorage(doServidor);
      setMostrarPainelExecucao(true);
      toast.success(`OS ${os.numeroOs} selecionada no painel.`);
      return;
    }

    if (!['adm', 'diretor', 'gestor'].includes(user?.perfil ?? '')) {
      showRuleNotice({
        title: 'Acesso ou Transição Não Concluída',
        sectorLabel: 'Setor Administrativo (ADM)',
        severity: 'blocked',
        message:
          'Fluxo da OS ainda não inicializado. Toda OS nova só pode ser criada no estado inicial (REG-022 / Inspeção de Recebimento) pelo Setor Administrativo (ADM).',
        hint: 'Solicite ao Setor Administrativo (ADM) a criação/confirmação inicial desta OS no formulário REG-022 antes de prosseguir.',
      });
      return;
    }

    const nova = criarOsViaReg022({
      numeroOs: os.numeroOs,
      identificacao: {
        cliente: os.cliente || 'Cliente Hospitalar',
        equipamento: os.equipamento || 'Equipamento Médico',
        marca: os.marca || 'Cardios',
        modelo: os.modelo || 'Modelo Padrão',
        numeroSerie: os.numeroSerie || 'S/N',
      },
      ator: atorLogado,
    });

    try {
      await saveOsFlow.mutateAsync(nova);
      salvarFluxoLocalStorage(nova);
      setFluxoV2(nova);
      setMostrarPainelExecucao(true);
      toast.info(`Fluxo inicializado para a OS ${os.numeroOs}.`);
    } catch (err) {
      showRuleNotice({
        title: 'Não Foi Possível Inicializar a OS',
        sectorLabel: 'Setor Administrativo (ADM)',
        severity: 'blocked',
        message:
          err instanceof Error
            ? err.message
            : 'Toda OS nova precisa começar pelo formulário REG-022 (Inspeção de Recebimento).',
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho limpo */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Equipamentos & Ordens de Serviço
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Trilha POP-020: REG-022 (ADM) → REG-034 (AT) → REG-016 (Central AT) → REG-035 (Pós-Serviço).
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

      {/* Aguardando ação do setor */}
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
                  Selecione uma OS para retomar exatamente de onde o setor anterior parou.
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
              const isAtiva = fluxoV2?.numeroOs === o.numeroOs;
              const ultimaNotif = o.notificacoes?.[o.notificacoes.length - 1];
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
                      setFluxoV2(o);
                      setMostrarPainelExecucao(true);
                      salvarFluxoLocalStorage(o);
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

      {/* Painel Unificado da OS Selecionada */}
      {mostrarPainelExecucao && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-[15px] font-semibold">
                  {fluxoV2
                    ? `OS ${fluxoV2.numeroOs} — ${fluxoV2.identificacao.equipamento}`
                    : 'Execução da Ordem de Serviço'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {fluxoV2
                    ? `${fluxoV2.identificacao.cliente} · Marca ${fluxoV2.identificacao.marca}${
                        fluxoV2.identificacao.numeroSerie
                          ? ` · S/N ${fluxoV2.identificacao.numeroSerie}`
                          : ''
                      }`
                    : 'Selecione uma OS na fila abaixo ou inicie uma nova no REG-022.'}
                </p>
              </div>
              {fluxoV2?.etiquetaAtual && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                    TAG_SPECS[fluxoV2.etiquetaAtual].badgeClass,
                  )}
                >
                  <Tag className="h-3 w-3" strokeWidth={1.5} />
                  {TAG_SPECS[fluxoV2.etiquetaAtual].nomeCor} — {TAG_SPECS[fluxoV2.etiquetaAtual].labelStatus}
                </span>
              )}
            </div>
          </CardHeader>

          {!fluxoV2 ? (
            <CardContent>
              <div className="rounded-xl border border-dashed border-black/15 bg-muted/20 p-6 text-center text-xs text-muted-foreground dark:border-white/15">
                {['adm', 'diretor', 'gestor'].includes(user?.perfil ?? '')
                  ? 'Cadastre uma nova OS pelo REG-022 ou selecione uma OS na fila abaixo.'
                  : 'Aguarde o Setor Administrativo (ADM) iniciar a OS pelo REG-022 ou selecione uma OS na fila.'}
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-4">
              {/* Stepper visual das 4 etapas POP-020 */}
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  {
                    titulo: '1. REG-022 (ADM)',
                    sub: 'Recebimento',
                    done: fluxoV2.reg022Preenchido,
                    unlocked: true,
                    sectorLabel: 'Setor Administrativo (ADM)',
                    lockMsg: '',
                    href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(fluxoV2.numeroOs)}`,
                  },
                  {
                    titulo: '2. REG-034 (AT)',
                    sub: 'Limpeza',
                    done: fluxoV2.reg034Preenchido,
                    unlocked: fluxoV2.reg022Preenchido,
                    sectorLabel: 'Assistência Técnica (AT)',
                    lockMsg:
                      'Pré-requisito obrigatório (POP-020): conclua primeiro o REG-022 (Inspeção de Recebimento — ADM) para liberar o REG-034.',
                    href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(fluxoV2.numeroOs)}`,
                  },
                  {
                    titulo: '3. REG-016 (AT)',
                    sub: 'Central Técnica',
                    done: fluxoV2.etiquetaAtual === 'GREEN' || fluxoV2.etiquetaAtual === 'RED',
                    unlocked: fluxoV2.reg022Preenchido && fluxoV2.reg034Preenchido,
                    sectorLabel: 'Assistência Técnica (AT)',
                    lockMsg:
                      'Pré-requisito obrigatório (POP-020): conclua o REG-022 (ADM) e o REG-034 (Limpeza e Higienização — AT) antes de acessar o REG-016.',
                    href: `/formularios/etapas-manutencao?os=${encodeURIComponent(fluxoV2.numeroOs)}`,
                  },
                  {
                    titulo: `4. REG-035 (${fluxoV2.item5FormularioTipo ?? 'Pós-Serviço'})`,
                    sub: 'Finalização',
                    done: fluxoV2.item5Preenchido,
                    unlocked:
                      fluxoV2.etiquetaAtual === 'GREEN' && Boolean(fluxoV2.item5Liberado),
                    sectorLabel: 'Assistência Técnica (AT)',
                    lockMsg:
                      fluxoV2.etiquetaAtual === 'RED'
                        ? 'REG-035 bloqueado porque esta OS recebeu Etiqueta VERMELHA (orçamento reprovado pelo cliente).'
                        : 'Pré-requisito obrigatório (POP-020): o REG-035 só fica liberado quando a Assistência Técnica (AT) acionar a Etiqueta VERDE (Serviço Finalizado) no REG-016.',
                    href: `/formularios/checklist-manutencao?os=${encodeURIComponent(fluxoV2.numeroOs)}`,
                  },
                ].map((st) =>
                  st.unlocked || st.done ? (
                    <Link
                      key={st.titulo}
                      href={st.href}
                      className={cn(
                        'ios-touch flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors',
                        st.done
                          ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300'
                          : 'border-primary/30 bg-primary/[0.04] text-foreground hover:bg-primary/[0.08]',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{st.titulo}</p>
                        <p className="text-[11px] opacity-80">{st.sub}</p>
                      </div>
                      {st.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                      )}
                    </Link>
                  ) : (
                    <button
                      key={st.titulo}
                      type="button"
                      onClick={() =>
                        showRuleNotice({
                          title: 'Etapa Bloqueada (POP-020)',
                          message: st.lockMsg,
                          sectorLabel: st.sectorLabel,
                          severity: 'warning',
                        })
                      }
                      className="ios-touch flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{st.titulo}</p>
                        <p className="text-[11px] opacity-80">Aguardando etapa anterior</p>
                      </div>
                      <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    </button>
                  ),
                )}
              </div>

              {/* Resumo limpo da OS */}
              <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Situação</span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {ESTADO_GERAL_LABEL[fluxoV2.estadoGeral] ?? fluxoV2.estadoGeral}
                    </Badge>
                    <Badge variant="outline">
                      Vez: {formatarNomeSetorCompleto(fluxoV2.setorPendente)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Checklist por Marca</span>
                  <p className="mt-1 font-medium text-foreground">
                    {fluxoV2.item5FormularioTipo} · Marca {fluxoV2.identificacao.marca} (
                    {fluxoV2.item5Liberado ? 'Liberado' : 'Aguardando Etiqueta Verde'})
                  </p>
                </div>
                <div className="flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Etiqueta Física</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={fluxoV2.etiquetaIdentificacaoLiberada ? 'default' : 'outline'}
                    disabled={!fluxoV2.etiquetaIdentificacaoLiberada}
                    onClick={() =>
                      setEtiquetaPrint({
                        numeroOs: fluxoV2.numeroOs,
                        cliente: fluxoV2.identificacao.cliente,
                        equipamento: fluxoV2.identificacao.equipamento,
                        marca: fluxoV2.identificacao.marca,
                        modelo: fluxoV2.identificacao.modelo,
                        numeroSerie: fluxoV2.identificacao.numeroSerie,
                        statusEtiqueta: fluxoV2.etiquetaAtual
                          ? `${TAG_SPECS[fluxoV2.etiquetaAtual].nomeCor} — ${TAG_SPECS[fluxoV2.etiquetaAtual].labelStatus}`
                          : 'CINZA — Análise Completa',
                      })
                    }
                    className="mt-1 h-8 gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {fluxoV2.etiquetaIdentificacaoLiberada
                      ? 'Imprimir Etiqueta'
                      : 'Liberado após Análise'}
                  </Button>
                </div>
              </div>

              {fluxoV2.mensagemTelaAtual && (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-2.5 text-xs text-foreground">
                  <span className="font-medium text-primary">Situação atual: </span>
                  {fluxoV2.mensagemTelaAtual}
                </div>
              )}

              {/* Ações setorizadas */}
              {!podeExecutarPasso && fluxoV2.estadoGeral !== 'finalizada' && fluxoV2.estadoGeral !== 'cancelada' ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                    <span>
                      Etapa atual atribuída a <strong>{SETOR_COMPETENCIA_MAP[setorDoPasso]}</strong>.
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      showRuleNotice({
                        title: 'Etapa de Outro Setor',
                        sectorLabel: SETOR_COMPETENCIA_MAP[setorDoPasso],
                        severity: 'blocked',
                        message: `Você não tem permissão para realizar esta etapa agora. Esta ação é de responsabilidade do setor ${SETOR_COMPETENCIA_MAP[setorDoPasso]}.`,
                      })
                    }
                  >
                    Por quê?
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {fluxoV2.passoAtual === 'A1_CRIADA_NO_REG022' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => admMarcarEtiquetaBrancaNoReg016(s, atorLogado),
                          'Etiqueta BRANCA registrada no REG-016. Assistência Técnica notificada!',
                        )
                      }
                    >
                      Marcar Etiqueta BRANCA no REG-016
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'A2_BRANCA_NOTIFICA_AT' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => confirmarNotificacaoSetor(s, atorLogado),
                          'Assistência Técnica confirmou recebimento. REG-034 liberado!',
                        )
                      }
                    >
                      Confirmar Ciência e Abrir REG-034
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'A3_AT_CONFIRMOU_PREENCHER_REG034' && (
                    <>
                      <Link href={`/formularios/limpeza-equipamento?os=${encodeURIComponent(fluxoV2.numeroOs)}`}>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Preencher Formulário REG-034
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) => atRegistrarReg034(s, atorLogado),
                            'Higienização (REG-034) concluída!',
                          )
                        }
                      >
                        Confirmar Higienização Concluída
                      </Button>
                    </>
                  )}

                  {fluxoV2.passoAtual === 'A4_REG034_PREENCHIDO' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => atMarcarEtiquetaVioleta(s, atorLogado),
                          'Etiqueta VIOLETA (Higienizado) aplicada no REG-016!',
                        )
                      }
                    >
                      Aplicar Etiqueta VIOLETA (Higienizado)
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'A5_VIOLETA_HIGIENIZADO' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => atMarcarEtiquetaCinzaAnaliseCompleta(s, atorLogado),
                          'Etiqueta CINZA aplicada! Etiqueta física liberada para impressão.',
                        )
                      }
                    >
                      Concluir Análise (Etiqueta CINZA)
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'A6_CINZA_ANALISE_CONCLUIDA' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) => atResponderPerguntaGarantia(s, true, atorLogado),
                            'Garantia confirmada (Etiqueta LARANJA). Almoxarifado notificado!',
                          )
                        }
                      >
                        Trata-se de Garantia? SIM (Etiqueta LARANJA)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          executarTransicao(
                            (s) => atResponderPerguntaGarantia(s, false, atorLogado),
                            'Registrado como não-garantia. Próxima pergunta: envio ao fabricante.',
                          )
                        }
                      >
                        Não é Garantia
                      </Button>
                    </>
                  )}

                  {fluxoV2.passoAtual === 'B2_PERGUNTA_ENVIO_FABRICA' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <SelectNative
                        value={transporteSelecionado}
                        onChange={(e) =>
                          setTransporteSelecionado(e.target.value as TipoTransporteFabrica)
                        }
                        className="h-9 w-64 text-xs"
                      >
                        {OPCOES_TRANSPORTE_FABRICA.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </SelectNative>
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) =>
                              atResponderPerguntaEnvioFabrica(
                                s,
                                { trataSeEnvioFabrica: true, tipoTransporte: transporteSelecionado },
                                atorLogado,
                              ),
                            'Equipamento marcado em espera para envio à fábrica.',
                          )
                        }
                      >
                        Enviar à Fábrica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          executarTransicao(
                            (s) =>
                              atResponderPerguntaEnvioFabrica(
                                s,
                                { trataSeEnvioFabrica: false },
                                atorLogado,
                              ),
                            'Reparo direto selecionado. ADM notificado para orçamento!',
                          )
                        }
                      >
                        Reparo Direto (Sem Fábrica)
                      </Button>
                    </div>
                  )}

                  {fluxoV2.passoAtual === 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) =>
                              atResponderEquipamentoEnviadoFabrica(
                                s,
                                { foiEnviado: true },
                                atorLogado,
                              ),
                            'Envio confirmado! Etiqueta MARROM aplicada e ADM notificado.',
                          )
                        }
                      >
                        Enviado à Fábrica (Etiqueta MARROM)
                      </Button>
                      <Input
                        value={justificativaNaoEnviado}
                        onChange={(e) => setJustificativaNaoEnviado(e.target.value)}
                        placeholder="Justificativa se não enviado..."
                        className="h-9 w-60 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          executarTransicao(
                            (s) =>
                              atResponderEquipamentoEnviadoFabrica(
                                s,
                                {
                                  foiEnviado: false,
                                  justificativaNaoEnviado,
                                  etiquetaEscolhidaSeNaoEnviado: 'GREEN',
                                },
                                atorLogado,
                              ),
                            'Justificativa salva → Serviço Finalizado (Etiqueta VERDE).',
                          )
                        }
                      >
                        Não Enviado → VERDE
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          executarTransicao(
                            (s) =>
                              atResponderEquipamentoEnviadoFabrica(
                                s,
                                {
                                  foiEnviado: false,
                                  justificativaNaoEnviado,
                                  etiquetaEscolhidaSeNaoEnviado: 'RED',
                                },
                                atorLogado,
                              ),
                            'Orçamento reprovado (Etiqueta VERMELHA). REG-035 bloqueado.',
                          )
                        }
                      >
                        Não Enviado → VERMELHA
                      </Button>
                    </div>
                  )}

                  {fluxoV2.passoAtual === 'C_AGUARDANDO_ORCAMENTO_ADM' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => {
                            const c = confirmarNotificacaoSetor(s, atorLogado);
                            return admMarcarEtiquetaAmarelaOrcamento(c, atorLogado);
                          },
                          'Etiqueta AMARELA registrada. Aguardando resposta do cliente.',
                        )
                      }
                    >
                      Enviar Orçamento (Etiqueta AMARELA)
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) => admResponderOrcamentoAprovado(s, true, atorLogado),
                            'Orçamento aprovado! Etiqueta AZUL aplicada e Almoxarifado notificado.',
                          )
                        }
                      >
                        Orçamento Aprovado (Etiqueta AZUL)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          executarTransicao(
                            (s) => admResponderOrcamentoAprovado(s, false, atorLogado),
                            'Orçamento reprovado pelo cliente. AT notificada.',
                          )
                        }
                      >
                        Orçamento Reprovado
                      </Button>
                    </>
                  )}

                  {fluxoV2.passoAtual === 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        executarTransicao(
                          (s) => confirmarNotificacaoSetor(s, atorLogado),
                          'Reprovação confirmada (Etiqueta VERMELHA).',
                        )
                      }
                    >
                      Confirmar Reprovação (Etiqueta VERMELHA)
                    </Button>
                  )}

                  {(fluxoV2.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX' ||
                    fluxoV2.passoAtual === 'D1_ALMOX_DECIDINDO_PECAS') && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          executarTransicao(
                            (s) => {
                              const c =
                                s.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX'
                                  ? confirmarNotificacaoSetor(s, atorLogado)
                                  : s;
                              return almoxarifadoDecidirPecas(c, 'pecas_disponiveis', atorLogado);
                            },
                            'Peças disponíveis separadas! Assistência Técnica notificada.',
                          )
                        }
                      >
                        Peças Disponíveis
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          executarTransicao(
                            (s) => {
                              const c =
                                s.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX'
                                  ? confirmarNotificacaoSetor(s, atorLogado)
                                  : s;
                              return almoxarifadoDecidirPecas(c, 'aguardando_pecas', atorLogado);
                            },
                            'Etiqueta PRETA aplicada (OS aguardando peças).',
                          )
                        }
                      >
                        Falta Peça (Etiqueta PRETA)
                      </Button>
                    </>
                  )}

                  {fluxoV2.passoAtual === 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => almoxarifadoRetomarOsDeAguardandoPecas(s, atorLogado),
                          'Peças disponíveis! Etiqueta anterior restaurada e AT notificada.',
                        )
                      }
                    >
                      Peças Chegaram (Retomar Serviço)
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => confirmarNotificacaoSetor(s, atorLogado),
                          'Peças confirmadas pela AT! Serviço pronto para execução e finalização.',
                        )
                      }
                    >
                      Confirmar Recebimento das Peças
                    </Button>
                  )}

                  {fluxoV2.passoAtual === 'D5_AT_PRONTO_PARA_FINALIZAR' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => atFinalizarServicoComEtiquetaVerde(s, atorLogado),
                          'Etiqueta VERDE aplicada! REG-035 pós-serviço liberado.',
                        )
                      }
                    >
                      Finalizar Serviço (Etiqueta VERDE)
                    </Button>
                  )}

                  {fluxoV2.etiquetaAtual === 'GREEN' &&
                    fluxoV2.item5Liberado &&
                    !fluxoV2.item5Preenchido &&
                    ['tecnico', 'diretor', 'gestor'].includes(user?.perfil ?? '') && (
                      <>
                        <Link
                          href={`/formularios/checklist-manutencao?os=${encodeURIComponent(fluxoV2.numeroOs)}`}
                        >
                          <Button size="sm" variant="default" className="gap-1.5">
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Abrir REG-035 ({fluxoV2.item5FormularioTipo})
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            executarTransicao(
                              (s) =>
                                atPreencherItem5Reg016(
                                  s,
                                  s.identificacao.marca,
                                  atorLogado,
                                ),
                              `REG-035 (${fluxoV2.item5FormularioTipo}) concluído para ${fluxoV2.identificacao.marca}!`,
                            )
                          }
                        >
                          Concluir Pós-Serviço
                        </Button>
                      </>
                    )}
                </div>
              )}

              {/* Controles secundários: Correção do Autor (E3), Cancelamento (ADM/AT), Reabertura e Histórico */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setMostrarHistorico((v) => !v)}
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                  >
                    <History className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Histórico ({fluxoV2.historico.length})
                  </Button>

                  {ultimoEventoCorrigivel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setMostrarCorrecao((v) => !v)}
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Corrigir minha última resposta
                    </Button>
                  )}

                  {fluxoV2.estadoGeral === 'cancelada' && user?.perfil !== 'estoquista' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() =>
                        executarTransicao(
                          (s) =>
                            reabrirOs(
                              s,
                              'Reabertura operacional autorizada para continuidade',
                              atorLogado,
                            ),
                          'OS reaberta exatamente na etapa anterior ao cancelamento!',
                        )
                      }
                      className="h-8 gap-1.5 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Reabrir OS
                    </Button>
                  )}
                </div>

                {fluxoV2.estadoGeral !== 'cancelada' &&
                  fluxoV2.estadoGeral !== 'finalizada' &&
                  ['adm', 'tecnico', 'diretor', 'gestor'].includes(user?.perfil ?? '') && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input
                        value={motivoCancelamento}
                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                        placeholder="Motivo para cancelar OS..."
                        className="h-8 w-48 text-xs sm:w-56"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!motivoCancelamento.trim()) {
                            showRuleNotice({
                              title: 'Justificativa Obrigatória',
                              message:
                                'Informe o motivo do cancelamento antes de cancelar esta Ordem de Serviço.',
                              severity: 'warning',
                            });
                            return;
                          }
                          executarTransicao(
                            (s) => cancelarOs(s, motivoCancelamento, atorLogado),
                            'OS cancelada com justificativa registrada.',
                          );
                          setMotivoCancelamento('');
                        }}
                        className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Cancelar OS
                      </Button>
                    </div>
                  )}
              </div>

              {/* Box inline da Correção do Autor (E3) */}
              {mostrarCorrecao && ultimoEventoCorrigivel && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs">
                  <span className="text-muted-foreground">
                    Desfazer última ação ({formatTipoEventoHumano(ultimoEventoCorrigivel.tipo)}):
                  </span>
                  <Input
                    value={motivoCorrecao}
                    onChange={(e) => setMotivoCorrecao(e.target.value)}
                    placeholder="Explique o motivo da correção..."
                    className="h-8 min-w-[200px] flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      executarTransicao(
                        (s) =>
                          corrigirMarcacaoOuRespostaPeloDono(
                            s,
                            {
                              eventoId: ultimoEventoCorrigivel.id,
                              observacaoCorrecao:
                                motivoCorrecao.trim() ||
                                'Correção solicitada pelo autor da marcação',
                              executarNovaAcao: () => {},
                            },
                            atorLogado,
                          ),
                        'Etapa restaurada! Selecione novamente a opção correta.',
                      );
                      setMostrarCorrecao(false);
                      setMotivoCorrecao('');
                    }}
                    className="h-8 text-xs"
                  >
                    Confirmar Correção
                  </Button>
                </div>
              )}

              {/* Histórico colapsável e legível */}
              {mostrarHistorico && (
                <div className="ios-grouped divide-y divide-border/70">
                  <div className="max-h-52 space-y-0 overflow-y-auto text-[11px]">
                    {fluxoV2.historico.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2"
                      >
                        <span className="text-foreground">
                          <span className="font-medium text-primary">
                            {formatTipoEventoHumano(ev.tipo)}:
                          </span>{' '}
                          {ev.observacao || ev.valorNovo}
                        </span>
                        <span className="text-muted-foreground">
                          {ev.usuarioNome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
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
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : osFiltradas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm font-medium">Nenhuma Ordem de Serviço encontrada.</p>
              <p className="text-xs text-muted-foreground">
                Toda OS começa pelo formulário REG-022 preenchido pelo Setor Administrativo (ADM).
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {osFiltradas.map((os) => {
              const tag = TAG_SPECS[os.tagColor];
              const analiseJaConcluida =
                os.tagColor !== 'WHITE' && os.tagColor !== 'VIOLET';
              const reg022Done = os.etapasConcluidas.reg022Recebimento;
              const reg034Done = os.etapasConcluidas.reg034Limpeza;
              const reg016Done = os.etapasConcluidas.reg016Etapas;
              const reg035LiberadoPorVerde = os.tagColor === 'GREEN';
              const mostrarReg035 =
                reg035LiberadoPorVerde || os.etapasConcluidas.reg035Manutencao;

              const etapas = [
                {
                  label: '1. REG-022 (Recebimento ADM)',
                  done: reg022Done,
                  unlocked: true,
                  sectorLabel: 'Setor Administrativo (ADM)',
                  lockMsg: '',
                  href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '2. REG-034 (Higienização AT)',
                  done: reg034Done,
                  unlocked: reg022Done,
                  sectorLabel: 'Assistência Técnica (AT)',
                  lockMsg:
                    'Conclua o REG-022 (Inspeção de Recebimento — ADM) para liberar o REG-034.',
                  href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '3. REG-016 (Central AT)',
                  done: reg016Done,
                  unlocked: reg022Done && reg034Done,
                  sectorLabel: 'Assistência Técnica (AT)',
                  lockMsg:
                    'Conclua antes o REG-034 (Limpeza e Higienização — AT) para liberar o REG-016.',
                  href: `/formularios/etapas-manutencao?os=${encodeURIComponent(os.chave)}`,
                },
                ...(mostrarReg035
                  ? [
                      {
                        label: '4. REG-035 (Pós-Serviço)',
                        done: os.etapasConcluidas.reg035Manutencao,
                        unlocked: reg022Done && reg034Done && reg035LiberadoPorVerde,
                        sectorLabel: 'Assistência Técnica (AT)',
                        lockMsg:
                          'O REG-035 só fica disponível após acionar a Etiqueta VERDE (Serviço Finalizado) no REG-016.',
                        href: `/formularios/checklist-manutencao?os=${encodeURIComponent(os.chave)}`,
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
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => carregarOsRealNoPainel(os)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <PlayCircle className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                          Selecionar OS
                        </Button>

                        {analiseJaConcluida && (
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
                        mostrarReg035 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
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
        onOpenChange={(open) => !open && setEtiquetaPrint(null)}
        dados={etiquetaPrint}
      />
    </div>
  );
}
