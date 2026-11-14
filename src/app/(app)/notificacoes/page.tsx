'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Layers,
  Send,
  ShieldAlert,
  UserCheck,
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
  confirmarNotificacaoSetor,
  normalizarNumeroOs,
  type AtorAcaoOS,
  type OrdemServicoFluxoState,
  type SetorOperacional,
} from '@/core/domain/forms/os-workflow';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useFormsOverview,
  useNcs,
  useOsFlowList,
  useSaveOsFlow,
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
  remetenteSetor?: SetorOperacional;
  numeroOs?: string;
  confirmadaEm?: string | null;
  confirmadaPorNome?: string | null;
}

const STORAGE_KEY_LIDAS = 'regulaon:notificacoes:lidas:v1';
const STORAGE_KEY_CONFIRMADAS = 'regulaon:notificacoes:confirmadas:v1';
const STORAGE_KEY_FLUXO_PREFIX = 'regulaon:os_fluxo_v2:';

const NOTIFICACOES_SEMENTE_INTERSETORIAIS: NotificacaoItem[] = [
  {
    id: 'os:notif:0102:aprovado',
    categoria: 'intersetorial',
    nivel: 'info',
    titulo: 'OS-2026-0102 — Orçamento APROVADO pelo ADM (CardioSmart)',
    descricao:
      'O setor Administrativo (ADM) aprovou o orçamento junto ao cliente. O Almoxarifado foi notificado para separação e liberação imediata das peças solicitadas pela Assistência Técnica.',
    href: '/equipamentos?os=OS-2026-0102',
    origemLabel: 'Notificação Intersetorial (ADM → Almoxarifado)',
    destinatarioSetor: 'ALMOXARIFADO',
    remetenteSetor: 'ADM',
    numeroOs: 'OS-2026-0102',
    confirmadaEm: null,
    confirmadaPorNome: null,
  },
  {
    id: 'os:notif:0101:branca',
    categoria: 'intersetorial',
    nivel: 'info',
    titulo: 'OS-2026-0101 — Equipamento com Etiqueta BRANCA no Almoxarifado',
    descricao:
      'Equipamento Incubadora Neonatal (Olidef SC Line) recebido no Almoxarifado com Etiqueta BRANCA (REG 016). Assistência Técnica notificada para proceder com triagem técnica e higienização (REG 034).',
    href: '/equipamentos?os=OS-2026-0101',
    origemLabel: 'Notificação Intersetorial (Almoxarifado → AT)',
    destinatarioSetor: 'AT',
    remetenteSetor: 'ALMOXARIFADO',
    numeroOs: 'OS-2026-0101',
    confirmadaEm: null,
    confirmadaPorNome: null,
  },
  {
    id: 'os:notif:0103:reprovado',
    categoria: 'intersetorial',
    nivel: 'warning',
    titulo: 'OS-2026-0103 — Orçamento REPROVADO pelo Cliente (ADM)',
    descricao:
      'O cliente reprovou o orçamento de manutenção. O equipamento recebeu Etiqueta VERMELHA e o Almoxarifado foi notificado para providenciar a devolução formal com comprovante de entrega.',
    href: '/equipamentos?os=OS-2026-0103',
    origemLabel: 'Notificação Intersetorial (ADM → Almoxarifado)',
    destinatarioSetor: 'ALMOXARIFADO',
    remetenteSetor: 'ADM',
    numeroOs: 'OS-2026-0103',
    confirmadaEm: null,
    confirmadaPorNome: null,
  },
  {
    id: 'os:notif:0104:orcamento',
    categoria: 'intersetorial',
    nivel: 'info',
    titulo: 'OS-2026-0104 — Diagnóstico e Orçamento Concluídos pela AT (Etiqueta AMARELA)',
    descricao:
      'A Assistência Técnica concluiu a análise e elaborou a proposta no REG 022. Setor Administrativo (ADM) notificado para envio comercial e aprovação do orçamento com o cliente.',
    href: '/equipamentos?os=OS-2026-0104',
    origemLabel: 'Notificação Intersetorial (AT → ADM)',
    destinatarioSetor: 'ADM',
    remetenteSetor: 'AT',
    numeroOs: 'OS-2026-0104',
    confirmadaEm: null,
    confirmadaPorNome: null,
  },
];

export default function NotificacoesPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: formsData, isLoading: loadingForms } = useFormsOverview();
  const { data: osFlowData } = useOsFlowList();
  const saveOsFlow = useSaveOsFlow();
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
  const [osNotificacoesLocais, setOsNotificacoesLocais] = React.useState<NotificacaoItem[]>([]);

  const osFluxoPorNumero = React.useMemo(() => {
    const map = new Map<string, OrdemServicoFluxoState>();
    for (const os of osFlowData?.ordens ?? []) {
      map.set(normalizarNumeroOs(os.numeroOs), os);
    }
    return map;
  }, [osFlowData?.ordens]);

  const osNotificacoesDinâmicas = React.useMemo<NotificacaoItem[]>(() => {
    const map = new Map<string, NotificacaoItem>();
    for (const item of osNotificacoesLocais) {
      map.set(item.id, item);
    }
    for (const os of osFlowData?.ordens ?? []) {
      if (!Array.isArray(os.notificacoes)) continue;
      for (const notif of os.notificacoes) {
        map.set(`os:dyn:${notif.id}`, {
          id: `os:dyn:${notif.id}`,
          categoria: 'intersetorial',
          nivel: notif.retidaForaHorario ? 'warning' : 'info',
          titulo: `${os.numeroOs} — Notificação para Setor ${notif.destinatario}`,
          descricao: notif.mensagem,
          href: `/equipamentos?os=${encodeURIComponent(os.numeroOs)}`,
          origemLabel: `Comunicação Intersetorial (Destino: ${notif.destinatario})`,
          destinatarioSetor: notif.destinatario,
          numeroOs: os.numeroOs,
          confirmadaEm: notif.confirmadaEm ? new Date(notif.confirmadaEm).toISOString() : null,
          confirmadaPorNome: notif.confirmadaPorNome,
        });
      }
    }
    return Array.from(map.values());
  }, [osFlowData?.ordens, osNotificacoesLocais]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIDAS);
      if (raw) setLidasIds(JSON.parse(raw) as string[]);
      const rawConf = localStorage.getItem(STORAGE_KEY_CONFIRMADAS);
      if (rawConf) setConfirmadasMap(JSON.parse(rawConf));
    } catch {
      // ignora erro de storage
    }

    // Fallback offline para notificações salvas localmente antes do envio ao servidor
    if (typeof window !== 'undefined') {
      try {
        const dinâmicas: NotificacaoItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_KEY_FLUXO_PREFIX) && key !== `${STORAGE_KEY_FLUXO_PREFIX}current`) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const os = JSON.parse(raw) as OrdemServicoFluxoState;
              if (Array.isArray(os.notificacoes)) {
                for (const notif of os.notificacoes) {
                  dinâmicas.push({
                    id: `os:dyn:${notif.id}`,
                    categoria: 'intersetorial',
                    nivel: notif.retidaForaHorario ? 'warning' : 'info',
                    titulo: `${os.numeroOs} — Notificação para Setor ${notif.destinatario}`,
                    descricao: notif.mensagem,
                    href: `/equipamentos?os=${encodeURIComponent(os.numeroOs)}`,
                    origemLabel: `Comunicação Intersetorial (Destino: ${notif.destinatario})`,
                    destinatarioSetor: notif.destinatario,
                    numeroOs: os.numeroOs,
                    confirmadaEm: notif.confirmadaEm ? new Date(notif.confirmadaEm).toISOString() : null,
                    confirmadaPorNome: notif.confirmadaPorNome,
                  });
                }
              }
            }
          }
        }
        setOsNotificacoesLocais(dinâmicas);
      } catch {
        // ignora erro ao ler storage
      }
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
    const notifAbertaNoServidor =
      osAtual &&
      (osAtual.notificacoes ?? []).some(
        (n) => !n.confirmadaEm && (`os:dyn:${n.id}` === item.id || n.destinatario === item.destinatarioSetor),
      );

    let nextOsPersistida: OrdemServicoFluxoState | null = osAtual;

    if (osAtual && notifAbertaNoServidor) {
      const atorLogado: AtorAcaoOS = {
        usuarioId: user?.id ?? 'usr-operador',
        usuarioNome: nome,
        perfil: user?.perfil ?? 'tecnico',
      };

      let nextOs: OrdemServicoFluxoState;
      try {
        nextOs = confirmarNotificacaoSetor(structuredClone(osAtual), atorLogado);
      } catch (err) {
        showRuleNotice({
          title: 'Confirmação Exclusiva do Setor Destinatário',
          message:
            err instanceof Error
              ? err.message
              : 'Você não tem permissão para confirmar a notificação deste setor.',
          severity: 'blocked',
        });
        return;
      }

      try {
        await saveOsFlow.mutateAsync(nextOs);
        nextOsPersistida = nextOs;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${STORAGE_KEY_FLUXO_PREFIX}${nextOs.numeroOs}`,
            JSON.stringify(nextOs),
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Não foi possível confirmar esta etapa no servidor.';
        if (isRuleErrorMessage(msg)) {
          showRuleNotice({
            title: 'Acesso ou Transição Não Concluída',
            message: msg,
            severity: 'blocked',
          });
        } else {
          toast.error('Falha ao sincronizar confirmação', { description: msg });
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

    if (nextOsPersistida?.passoAtual === 'A3_AT_CONFIRMOU_PREENCHER_REG034') {
      toast.success('Ciência confirmada! Abrindo REG-034 (Limpeza e Higienização)...', {
        description: `OS ${nextOsPersistida.numeroOs} confirmada por ${nome}. Marque o equipamento como higienizado para liberar o REG-016.`,
      });
      router.push(
        `/formularios/limpeza-equipamento?os=${encodeURIComponent(nextOsPersistida.numeroOs)}`,
      );
      return;
    }

    toast.success('Ciência confirmada', {
      description: osAtual && notifAbertaNoServidor
        ? `OS ${item.numeroOs ?? ''} avançada e REG-016 sincronizado por ${nome}.`
        : `Notificação ${item.numeroOs ?? ''} registrada como recebida por ${nome}.`,
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

    // 1. Notificações Intersetoriais (ADM <-> Almoxarifado <-> Assistência Técnica)
    // Prioriza as notificações reais do banco (`os_fluxo`) e exibe exemplos apenas se ainda não houver OS ativa
    const idsVistos = new Set<string>();
    const intersetoriaisTodas =
      osNotificacoesDinâmicas.length > 0
        ? osNotificacoesDinâmicas
        : NOTIFICACOES_SEMENTE_INTERSETORIAIS;

    for (const notif of intersetoriaisTodas) {
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
          href: '/pops',
          origemLabel: 'Gestão Documental (POPs)',
        });
      } else if (pop.status === 'publicado' && pop.totalPendentes > 0) {
        lista.push({
          id: `pop:read:${pop.id}`,
          categoria: 'pops',
          nivel: 'info',
          titulo: `${pop.codigo} possui ${pop.totalPendentes} leitura(s) pendente(s)`,
          descricao: `${pop.titulo} (v${pop.versaoAtual}) — colaboradores ainda precisam confirmar ciência.`,
          href: '/pops',
          origemLabel: 'Gestão Documental (POPs)',
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
    osNotificacoesDinâmicas,
    confirmadasMap,
    formsData?.records,
    ncsData?.ncs,
    popsData?.pops,
    treinosData?.treinamentos,
  ]);

  const filtradas = React.useMemo(() => {
    return notificacoes.filter((n) => {
      if (categoria !== 'todas' && n.categoria !== categoria) return false;
      if (
        setorFiltro !== 'todos' &&
        n.destinatarioSetor &&
        n.destinatarioSetor !== setorFiltro
      ) {
        return false;
      }
      if (apenasNaoLidas && lidasIds.includes(n.id)) return false;
      return true;
    });
  }, [notificacoes, categoria, setorFiltro, apenasNaoLidas, lidasIds]);

  const isLoading = loadingForms || loadingNcs || loadingPops || loadingTreinos;
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
            const confirmada = Boolean(item.confirmadaPorNome);

            return (
              <Card
                key={item.id}
                className={cn(
                  'transition-colors',
                  lida ? 'opacity-70' : 'border-l-4',
                  !lida && item.nivel === 'danger' && 'border-l-rose-500',
                  !lida && item.nivel === 'warning' && 'border-l-amber-500',
                  !lida && item.nivel === 'info' && (isIntersetorial ? 'border-l-indigo-500' : 'border-l-sky-500'),
                )}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {isIntersetorial ? (
                      <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
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

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!lida && (
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                            title="Não lida"
                          />
                        )}
                        <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                        {item.destinatarioSetor && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {item.destinatarioSetor}
                          </Badge>
                        )}
                        {isIntersetorial && (
                          confirmada ? (
                            <Badge variant="success" className="text-[10px]">
                              Ciência: {item.confirmadaPorNome}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-700 border-amber-500/35 dark:text-amber-300"
                            >
                              Aguardando ciência
                            </Badge>
                          )
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.descricao}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isIntersetorial && !confirmada && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={saveOsFlow.isPending}
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

                    {isIntersetorial && item.numeroOs && (() => {
                      const osDaNotif = osFluxoPorNumero.get(normalizarNumeroOs(item.numeroOs));
                      const reg034Concluido = Boolean(osDaNotif?.reg034Preenchido);
                      const reg035Liberado = osDaNotif?.etiquetaAtual === 'GREEN';

                      if (!reg034Concluido) {
                        return (
                          <Link
                            href={`/formularios/limpeza-equipamento?os=${encodeURIComponent(item.numeroOs)}`}
                          >
                            <Button size="sm" variant="outline" className="text-xs">
                              <FileText className="h-3.5 w-3.5" />
                              REG-034
                            </Button>
                          </Link>
                        );
                      }

                      return (
                        <>
                          <Link
                            href={`/formularios/etapas-manutencao?os=${encodeURIComponent(item.numeroOs)}`}
                          >
                            <Button size="sm" variant="outline" className="text-xs">
                              <FileText className="h-3.5 w-3.5" />
                              REG-016
                            </Button>
                          </Link>
                          {reg035Liberado && (
                            <Link
                              href={`/formularios/checklist-manutencao?os=${encodeURIComponent(item.numeroOs)}`}
                            >
                              <Button size="sm" variant="outline" className="text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                REG-035
                              </Button>
                            </Link>
                          )}
                        </>
                      );
                    })()}

                    <Link href={item.href}>
                      <Button size="sm" variant="outline">
                        {isIntersetorial ? 'Ver na Fila de OS' : 'Resolver'}
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
