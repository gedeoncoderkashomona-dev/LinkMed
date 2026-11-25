'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  ShieldAlert,
  Tag,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  agoraBR,
  calcularAlertas,
  diffDias,
  verificarAtividadesObrigatoriasDiariasPorSetor,
  type NivelAlerta,
} from '@/core/domain/forms/alerts';
import {
  normalizarNumeroOs,
  type OrdemServicoFluxoState,
  type SetorOperacional,
  type TagSpec,
} from '@/core/domain/forms/os-workflow';
import {
  gerarAvisosOsV4,
  usuarioPodeConfirmarAvisoSetor,
} from '@/core/domain/forms/os-notices';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useConfirmOsNotification,
  useFormsOverview,
  useNcs,
  useOsFlowList,
  useTreinamentos,
} from '@/hooks/use-operacional';
import { usePops } from '@/hooks/use-pops';
import { isRuleErrorMessage, showRuleNotice } from '@/lib/rule-notice';
import { cn } from '@/lib/utils';

type CategoriaNotificacao = 'operacional' | 'intersetorial' | 'ncs' | 'pops' | 'treinamentos';

interface NotificacaoItem {
  id: string;
  categoria: CategoriaNotificacao;
  nivel: NivelAlerta;
  titulo: string;
  descricao: string;
  href: string;
  origemLabel: string;
  destinatarioSetor?: SetorOperacional;
  numeroOs?: string;
  confirmadaEm?: string | null;
  confirmadaPorNome?: string | null;
  tipoAviso?: 'pendencia_etapa' | 'comunicacao_intersetorial';
  etapaAtualPt?: string;
  equipamentoResumo?: string;
  tagSpec?: TagSpec | null;
  ehLembrete?: boolean;
  retidaAteIso?: string | null;
  entregueEmIso?: string | null;
  notifIdReal?: string | null;
  acaoSugeridaLabel?: string;
  formularioSecundarioLabel?: string | null;
  formularioSecundarioHref?: string | null;
}

const STORAGE_KEY_LIDAS = 'regulaon:notificacoes:lidas:v1';
const STORAGE_KEY_CONFIRMADAS = 'regulaon:notificacoes:confirmadas:v1';
const STORAGE_KEY_FLUXO_PREFIX = 'regulaon:os_fluxo_v2:';

function formatarDataHoraBR(iso: string): string {
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

export default function NotificacoesPage() {
  const { data: user } = useCurrentUser();
  const { data: formsData, isLoading: loadingForms } = useFormsOverview();
  const { data: osFlowData, isLoading: loadingOsFlow } = useOsFlowList();
  const confirmOsNotif = useConfirmOsNotification();
  const { data: ncsData, isLoading: loadingNcs } = useNcs();
  const { data: popsData, isLoading: loadingPops } = usePops();
  const { data: treinosData, isLoading: loadingTreinos } = useTreinamentos();

  const [categoria, setCategoria] = React.useState<'todas' | CategoriaNotificacao>('todas');
  const [setorFiltro, setSetorFiltro] = React.useState<'todos' | SetorOperacional>('todos');
  const [apenasNaoLidas, setApenasNaoLidas] = React.useState(false);

  // Filtra automaticamente pelo setor do login para que o colaborador veja de imediato suas pendências
  React.useEffect(() => {
    if (!user) return;
    if (user.perfil === 'adm') setSetorFiltro('ADM');
    else if (user.perfil === 'tecnico') setSetorFiltro('AT');
    else if (user.perfil === 'estoquista') setSetorFiltro('ALMOXARIFADO');
  }, [user]);
  const [lidasIds, setLidasIds] = React.useState<string[]>([]);
  const [confirmadasMap, setConfirmadasMap] = React.useState<
    Record<string, { porNome: string; em: string }>
  >({});

  const osFluxoPorNumero = React.useMemo(() => {
    const map = new Map<string, OrdemServicoFluxoState>();
    for (const os of osFlowData?.ordens ?? []) {
      map.set(normalizarNumeroOs(os.numeroOs), os);
    }
    return map;
  }, [osFlowData?.ordens]);

  const osNotificacoesDinamicas = React.useMemo<NotificacaoItem[]>(() => {
    const avisos = gerarAvisosOsV4(osFlowData?.ordens ?? []);
    return avisos.map((av) => ({
      id: av.id,
      categoria: 'intersetorial',
      nivel: av.nivel,
      titulo: av.titulo,
      descricao: av.descricao,
      href: av.acaoSugeridaHref,
      origemLabel:
        av.tipoAviso === 'pendencia_etapa'
          ? `Ação Pendente no Fluxo (${av.destinatarioSetor})`
          : `Aviso Intersetorial (Destino: ${av.destinatarioSetor})`,
      destinatarioSetor: av.destinatarioSetor,
      numeroOs: av.numeroOs,
      confirmadaEm: av.confirmadaEm,
      confirmadaPorNome: av.confirmadaPorNome,
      tipoAviso: av.tipoAviso,
      etapaAtualPt: av.etapaAtualPt,
      equipamentoResumo: av.equipamentoResumo,
      tagSpec: av.tagSpec,
      ehLembrete: av.ehLembrete,
      retidaAteIso: av.retidaAteIso,
      entregueEmIso: av.entregueEmIso,
      notifIdReal: av.notifIdReal,
      acaoSugeridaLabel: av.acaoSugeridaLabel,
      formularioSecundarioLabel: av.formularioSecundarioLabel,
      formularioSecundarioHref: av.formularioSecundarioHref,
    }));
  }, [osFlowData?.ordens]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIDAS);
      if (raw) setLidasIds(JSON.parse(raw) as string[]);
      const rawConf = localStorage.getItem(STORAGE_KEY_CONFIRMADAS);
      if (rawConf) setConfirmadasMap(JSON.parse(rawConf));

      // Purga caches legados de OS de teste do navegador para evitar poluição visual após reset do banco
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_FLUXO_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignora erro de storage
    }
  }, []);

  function salvarLidas(ids: string[]) {
    setLidasIds(ids);
    try {
      localStorage.setItem(STORAGE_KEY_LIDAS, JSON.stringify(ids));
    } catch {
      // ignora
    }
  }

  async function confirmarCienciaIntersetorial(item: NotificacaoItem) {
    const nome = user?.nomeCompleto || 'Colaborador Autorizado';
    const agoraIso = new Date().toISOString();

    const osAtual = item.numeroOs
      ? osFluxoPorNumero.get(normalizarNumeroOs(item.numeroOs)) ?? null
      : null;

    // Extrai o id real da notificação no servidor (`os:dyn:<uuid>` -> `<uuid>`)
    const notifIdReal = item.id.startsWith('os:dyn:')
      ? item.id.slice('os:dyn:'.length)
      : item.id;
    const existeNoServidor =
      osAtual &&
      (osAtual.notificacoes ?? []).some(
        (n) => !n.confirmadaEm && n.id === notifIdReal,
      );

    if (osAtual && existeNoServidor) {
      try {
        await confirmOsNotif.mutateAsync({
          notificacaoId: notifIdReal,
          numeroOs: osAtual.numeroOs,
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Não foi possível confirmar ciência desta notificação.';
        if (isRuleErrorMessage(msg)) {
          showRuleNotice({
            title: 'Confirmação Exclusiva do Setor Destinatário',
            message: msg,
            severity: 'blocked',
          });
        } else {
          toast.error('Falha ao confirmar ciência', { description: msg });
        }
        return;
      }
    }

    const novoMap = { ...confirmadasMap, [item.id]: { porNome: nome, em: agoraIso } };
    setConfirmadasMap(novoMap);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIRMADAS, JSON.stringify(novoMap));
    } catch {
      // ignora
    }
    if (!lidasIds.includes(item.id)) {
      salvarLidas([...lidasIds, item.id]);
    }

    toast.success('Ciência confirmada (etapa da OS mantida — R08)', {
      description: `Notificação ${item.numeroOs ?? ''} confirmada por ${nome}. Acesse a OS para executar a próxima ação.`,
    });
  }

  const obrigatoriasAt = React.useMemo(
    () => verificarAtividadesObrigatoriasDiariasPorSetor(formsData?.records ?? [], 'AT'),
    [formsData?.records],
  );
  const obrigatoriasAlmox = React.useMemo(
    () =>
      verificarAtividadesObrigatoriasDiariasPorSetor(
        formsData?.records ?? [],
        'ALMOXARIFADO',
      ),
    [formsData?.records],
  );

  const notificacoes = React.useMemo<NotificacaoItem[]>(() => {
    const lista: NotificacaoItem[] = [];
    const hoje = agoraBR().data;

    // 1. Avisos e Pendências Intersetoriais reais do fluxo v4 (`os_fluxo` — sem dados fictícios)
    const idsVistos = new Set<string>();
    for (const notif of osNotificacoesDinamicas) {
      if (idsVistos.has(notif.id)) continue;
      idsVistos.add(notif.id);

      const confirmacao = !notif.confirmadaPorNome ? confirmadasMap[notif.id] : undefined;
      lista.push({
        ...notif,
        confirmadaEm: confirmacao ? confirmacao.em : notif.confirmadaEm,
        confirmadaPorNome: confirmacao ? confirmacao.porNome : notif.confirmadaPorNome,
      });
    }

    // 2. Alertas Operacionais (Temperatura 2x/dia, Bancada semanal, Pulseira, Calibração 60 dias REG-015)
    const alertasForm = calcularAlertas(formsData?.records ?? []);
    for (const a of alertasForm) {
      lista.push({
        id: `form:${a.id}`,
        categoria: 'operacional',
        nivel: a.nivel,
        titulo: a.titulo,
        descricao: a.descricao,
        href: a.href,
        origemLabel: 'Rotina Operacional / Calibração (REG-015)',
      });
    }

    // 3. Não Conformidades abertas ou graves
    for (const nc of ncsData?.ncs ?? []) {
      if (nc.status === 'concluida') continue;
      const isGrave = nc.severidade === 'grave';
      lista.push({
        id: `nc:${nc.id}`,
        categoria: 'ncs',
        nivel: isGrave ? 'danger' : 'warning',
        titulo: `${nc.codigo} — ${nc.titulo}`,
        descricao: `Status: ${nc.status === 'aberta' ? 'Aberta' : 'Em andamento'} · Severidade: ${nc.severidade.toUpperCase()}`,
        href: '/ncs',
        origemLabel: 'Não Conformidades (REG 038 / REG 047)',
      });
    }

    // 4. POPs aguardando aprovação ou com leituras pendentes
    for (const pop of popsData?.pops ?? []) {
      if (pop.status === 'aguardando_aprovacao') {
        lista.push({
          id: `pop:aprov:${pop.id}`,
          categoria: 'pops',
          nivel: 'warning',
          titulo: `${pop.codigo} aguardando aprovação da Direção`,
          descricao: `O documento "${pop.titulo}" foi submetido e aguarda assinatura eletrônica.`,
          href: `/pops?popId=${encodeURIComponent(pop.id)}`,
          origemLabel: 'Gestão Documental (POPs)',
        });
      } else if (pop.status === 'publicado' && pop.totalPendentes > 0) {
        lista.push({
          id: `pop:read:${pop.id}`,
          categoria: 'pops',
          nivel: 'info',
          titulo: `${pop.codigo} possui ${pop.totalPendentes} leitura(s) pendente(s)`,
          descricao: `${pop.titulo} (v${pop.versaoAtual}) — colaboradores ainda precisam confirmar ciência.`,
          href: `/pops?popId=${encodeURIComponent(pop.id)}&tab=leituras`,
          origemLabel: 'Gestão Documental (POPs)',
        });
      }

      if ((pop.totalSugestoesPendentes ?? 0) > 0) {
        lista.push({
          id: `pop:sug:${pop.id}`,
          categoria: 'pops',
          nivel: 'warning',
          titulo: `${pop.codigo} possui ${pop.totalSugestoesPendentes} sugestão(ões) de melhoria pendente(s)`,
          descricao: `${pop.titulo} — acesse a aba Sugestões do POP para analisar e aprovar ou rejeitar.`,
          href: `/pops?popId=${encodeURIComponent(pop.id)}&tab=sugestoes`,
          origemLabel: 'Sugestões em POPs (Gestão Documental)',
        });
      }
    }

    // 5. Treinamentos vencidos ou vencendo em até 30 dias
    for (const t of treinosData?.treinamentos ?? []) {
      if (!t.validadeAte) continue;
      const dias = diffDias(hoje, t.validadeAte);
      if (dias < 0) {
        lista.push({
          id: `treino:venc:${t.id}`,
          categoria: 'treinamentos',
          nivel: 'danger',
          titulo: `Treinamento vencido: ${t.titulo}`,
          descricao: `Validade expirou há ${Math.abs(dias)} dia(s) (${t.validadeAte}). Programe reciclagem.`,
          href: '/treinamentos',
          origemLabel: 'Capacitação & Treinamentos (REG 008)',
        });
      } else if (dias <= 30) {
        lista.push({
          id: `treino:aviso:${t.id}`,
          categoria: 'treinamentos',
          nivel: 'warning',
          titulo: `Reciclagem próxima: ${t.titulo}`,
          descricao: `Vence em ${dias} dia(s) (${t.validadeAte}) · Modalidade: ${t.tipo}.`,
          href: '/treinamentos',
          origemLabel: 'Capacitação & Treinamentos (REG 008)',
        });
      }
    }

    const pesoNivel: Record<NivelAlerta, number> = { danger: 0, warning: 1, info: 2 };
    return lista.sort((a, b) => pesoNivel[a.nivel] - pesoNivel[b.nivel]);
  }, [
    osNotificacoesDinamicas,
    confirmadasMap,
    formsData?.records,
    ncsData?.ncs,
    popsData?.pops,
    treinosData?.treinamentos,
  ]);

  const filtradas = React.useMemo(() => {
    return notificacoes.filter((n) => {
      if (categoria !== 'todas' && n.categoria !== categoria) return false;
      if (setorFiltro !== 'todos') {
        if (n.categoria === 'intersetorial') {
          if (n.destinatarioSetor !== setorFiltro) return false;
        } else if (categoria === 'intersetorial') {
          return false;
        }
      }
      if (apenasNaoLidas && lidasIds.includes(n.id)) return false;
      return true;
    });
  }, [notificacoes, categoria, setorFiltro, apenasNaoLidas, lidasIds]);

  const isLoading = loadingForms || loadingOsFlow || loadingNcs || loadingPops || loadingTreinos;
  const naoLidasCount = notificacoes.filter((n) => !lidasIds.includes(n.id)).length;
  const criticasCount = notificacoes.filter((n) => n.nivel === 'danger').length;
  const intersetoriaisCount = notificacoes.filter((n) => n.categoria === 'intersetorial').length;

  function alternarLida(id: string) {
    if (lidasIds.includes(id)) {
      salvarLidas(lidasIds.filter((x) => x !== id));
    } else {
      salvarLidas([...lidasIds, id]);
    }
  }

  function marcarTodasComoLidas() {
    salvarLidas(notificacoes.map((n) => n.id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Central de Notificações
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Avisos intersetoriais (ADM, Almoxarifado e AT), rotinas diárias e vencimentos REG-015.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApenasNaoLidas((v) => !v)}
          >
            {apenasNaoLidas ? 'Mostrar todas' : `Não lidas (${naoLidasCount})`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={marcarTodasComoLidas}
            disabled={naoLidasCount === 0}
          >
            <CheckCheck className="h-4 w-4" strokeWidth={1.6} />
            Marcar todas
          </Button>
        </div>
      </div>

      {/* Filtro rápido Intersetorial */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 px-4 py-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeftRight className="h-4 w-4 text-primary" strokeWidth={1.6} />
          <span className="font-medium text-foreground">Setor destinatário</span>
          <span className="hidden sm:inline text-muted-foreground/80">
            · Seg–Sex 07:30h–19:30h
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'todos', label: 'Todos' },
              { key: 'ALMOXARIFADO', label: 'Almoxarifado' },
              { key: 'AT', label: 'Assistência Técnica' },
              { key: 'ADM', label: 'Administrativo' },
            ] as const
          ).map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => {
                setSetorFiltro(st.key);
                if (categoria !== 'intersetorial' && st.key !== 'todos') {
                  setCategoria('intersetorial');
                }
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-[0.98]',
                setorFiltro === st.key
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'border border-border/70 bg-background/80 text-muted-foreground hover:text-foreground',
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel Oficial da Seção 5.2: Atividades Obrigatórias Diárias por Setor */}
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Clock className="h-4 w-4" />
              Atividades Obrigatórias Diárias por Setor (Seção 5.2 — Verificação no Fim do Dia)
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">
              Notificação diária às 07:30h se pendente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {/* Assistência Técnica */}
          <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                Setor: Assistência Técnica (AT)
              </span>
              <Badge variant={obrigatoriasAt.todasConcluidas ? 'success' : 'warning'}>
                {obrigatoriasAt.todasConcluidas ? 'Concluídas hoje' : 'Pendente hoje'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {obrigatoriasAt.atividades.map((at) => (
                <div
                  key={at.codigo}
                  className="flex items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {at.codigo}
                    </Badge>
                    <span>{at.titulo}</span>
                  </div>
                  {at.concluidaHoje ? (
                    <Badge variant="success" className="text-[10px]">
                      Realizada
                    </Badge>
                  ) : (
                    <Link href={at.href}>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
                        Preencher
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Almoxarifado */}
          <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                Setor: Almoxarifado
              </span>
              <Badge variant={obrigatoriasAlmox.todasConcluidas ? 'success' : 'warning'}>
                {obrigatoriasAlmox.todasConcluidas ? 'Concluídas hoje' : 'Pendente hoje'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {obrigatoriasAlmox.atividades.map((at) => (
                <div
                  key={at.codigo}
                  className="flex items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {at.codigo}
                    </Badge>
                    <span>{at.titulo}</span>
                  </div>
                  {at.concluidaHoje ? (
                    <Badge variant="success" className="text-[10px]">
                      Realizada
                    </Badge>
                  ) : (
                    <Link href={at.href}>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
                        Preencher
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Regra Seção 5.2: Verificação no fim do dia. Se não realizadas, notifica às 07:30h do dia seguinte e repete diariamente até a conclusão.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumo rápido */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Intersetoriais (OS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {intersetoriaisCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Avisos entre ADM, Estoque e AT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Alertas Não Lidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{naoLidasCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              de {notificacoes.length} notificações ativas no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prioridade Crítica / Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-bold',
                criticasCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {criticasCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Atrasos de rotina, calibrações vencidas ou NCs críticas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Calibração (REG-015)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">60 dias</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Antecedência ativa para alerta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'todas', label: 'Todas', icon: Bell },
            { key: 'intersetorial', label: `Intersetorial OS (${intersetoriaisCount})`, icon: ArrowLeftRight },
            { key: 'operacional', label: 'Rotinas & Calibração (REG-015)', icon: Wrench },
            { key: 'ncs', label: 'Não Conformidades', icon: ShieldAlert },
            { key: 'pops', label: 'Documentos (POPs)', icon: FileText },
            { key: 'treinamentos', label: 'Treinamentos', icon: GraduationCap },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = categoria === tab.key;
          return (
            <Button
              key={tab.key}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setCategoria(tab.key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Lista de notificações */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-medium">Nenhuma pendência neste filtro</p>
          <p className="text-xs text-muted-foreground">
            Todas as rotinas e avisos selecionados estão em dia.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map((item) => {
            const lida = lidasIds.includes(item.id);
            const isIntersetorial = item.categoria === 'intersetorial';
            const isComunicacaoOs = item.tipoAviso === 'comunicacao_intersetorial';
            const isPendenciaEtapa = item.tipoAviso === 'pendencia_etapa';
            const confirmada = Boolean(item.confirmadaPorNome);
            const podeConfirmarEsteSetor = Boolean(
              isComunicacaoOs &&
                !confirmada &&
                item.destinatarioSetor &&
                usuarioPodeConfirmarAvisoSetor(user?.perfil, item.destinatarioSetor),
            );

            return (
              <Card
                key={item.id}
                className={cn(
                  'transition-colors',
                  lida ? 'opacity-75' : 'border-l-4',
                  !lida && item.nivel === 'danger' && 'border-l-rose-500',
                  !lida && item.nivel === 'warning' && 'border-l-amber-500',
                  !lida &&
                    item.nivel === 'info' &&
                    (isPendenciaEtapa
                      ? 'border-l-emerald-500'
                      : isIntersetorial
                        ? 'border-l-indigo-500'
                        : 'border-l-sky-500'),
                )}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {isIntersetorial ? (
                      <ArrowLeftRight
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          isPendenciaEtapa
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-indigo-600 dark:text-indigo-400',
                        )}
                      />
                    ) : (
                      <AlertTriangle
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          item.nivel === 'danger'
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.nivel === 'warning'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-sky-600 dark:text-sky-400',
                        )}
                      />
                    )}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!lida && (
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                            title="Não lida"
                          />
                        )}
                        <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                        {item.tagSpec && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                              item.tagSpec.badgeClass,
                            )}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {item.tagSpec.nomeCor}
                          </span>
                        )}
                        {item.destinatarioSetor && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            Setor: {item.destinatarioSetor}
                          </Badge>
                        )}
                        {item.ehLembrete && (
                          <Badge variant="destructive" className="text-[10px]">
                            Lembrete 7 dias
                          </Badge>
                        )}
                        {item.retidaAteIso && (
                          <Badge variant="warning" className="text-[10px]">
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            Retida até {formatarDataHoraBR(item.retidaAteIso)}
                          </Badge>
                        )}
                        {isComunicacaoOs &&
                          (confirmada ? (
                            <Badge variant="success" className="text-[10px]">
                              Ciência: {item.confirmadaPorNome}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-700 border-amber-500/35 dark:text-amber-300"
                            >
                              Aguardando ciência de {item.destinatarioSetor}
                            </Badge>
                          ))}
                      </div>

                      {item.equipamentoResumo && (
                        <p className="text-[11px] font-medium text-foreground/85">
                          {item.equipamentoResumo}
                          {item.etapaAtualPt ? ` · Etapa: ${item.etapaAtualPt}` : ''}
                        </p>
                      )}

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.descricao}
                      </p>

                      {isComunicacaoOs && !confirmada && (
                        <p className="text-[10px] text-muted-foreground/80">
                          Confirmar ciência registra o recebimento deste aviso sem avançar
                          automaticamente a etapa da OS.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {podeConfirmarEsteSetor && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={confirmOsNotif.isPending}
                        onClick={() => void confirmarCienciaIntersetorial(item)}
                        className="text-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirmar Ciência
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alternarLida(item.id)}
                      className="text-xs"
                    >
                      {lida ? 'Marcar não lida' : 'Marcar lida'}
                    </Button>

                    {item.formularioSecundarioLabel && item.formularioSecundarioHref && (
                      <Link href={item.formularioSecundarioHref}>
                        <Button size="sm" variant="outline" className="text-xs">
                          <FileText className="h-3.5 w-3.5" />
                          {item.formularioSecundarioLabel}
                        </Button>
                      </Link>
                    )}

                    <Link href={item.href}>
                      <Button size="sm" variant={isIntersetorial ? 'default' : 'outline'}>
                        {item.acaoSugeridaLabel ??
                          (isIntersetorial ? 'Abrir Painel da OS' : 'Resolver')}
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
