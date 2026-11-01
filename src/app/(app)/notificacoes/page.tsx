'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  ShieldAlert,
  Wrench,
} from 'lucide-react';

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
import { useFormsOverview, useNcs, useTreinamentos } from '@/hooks/use-operacional';
import { usePops } from '@/hooks/use-pops';
import { cn } from '@/lib/utils';

type CategoriaNotificacao = 'operacional' | 'ncs' | 'pops' | 'treinamentos';

interface NotificacaoItem {
  id: string;
  categoria: CategoriaNotificacao;
  nivel: NivelAlerta;
  titulo: string;
  descricao: string;
  href: string;
  origemLabel: string;
}

const STORAGE_KEY_LIDAS = 'regulaon:notificacoes:lidas:v1';

export default function NotificacoesPage() {
  const { data: formsData, isLoading: loadingForms } = useFormsOverview();
  const { data: ncsData, isLoading: loadingNcs } = useNcs();
  const { data: popsData, isLoading: loadingPops } = usePops();
  const { data: treinosData, isLoading: loadingTreinos } = useTreinamentos();

  const [categoria, setCategoria] = React.useState<'todas' | CategoriaNotificacao>('todas');
  const [apenasNaoLidas, setApenasNaoLidas] = React.useState(false);
  const [lidasIds, setLidasIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIDAS);
      if (raw) setLidasIds(JSON.parse(raw) as string[]);
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

    // 1. Alertas Operacionais (Temperatura 2x/dia, Bancada semanal, Pulseira, Calibração 60 dias REG-015)
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

    // 2. Não Conformidades abertas ou graves
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

    // 3. POPs aguardando aprovação ou com leituras pendentes
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

    // 4. Treinamentos vencidos ou vencendo em até 30 dias
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
  }, [formsData?.records, ncsData?.ncs, popsData?.pops, treinosData?.treinamentos]);

  const filtradas = React.useMemo(() => {
    return notificacoes.filter((n) => {
      if (categoria !== 'todas' && n.categoria !== categoria) return false;
      if (apenasNaoLidas && lidasIds.includes(n.id)) return false;
      return true;
    });
  }, [notificacoes, categoria, apenasNaoLidas, lidasIds]);

  const isLoading = loadingForms || loadingNcs || loadingPops || loadingTreinos;
  const naoLidasCount = notificacoes.filter((n) => !lidasIds.includes(n.id)).length;
  const criticasCount = notificacoes.filter((n) => n.nivel === 'danger').length;

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Entregas dentro do horário comercial (07:30h às 19:30h, Seg–Sex), atividades obrigatórias diárias por setor (Seção 5.2), lembretes de 7 dias e calibrações (REG-015).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApenasNaoLidas((v) => !v)}
          >
            {apenasNaoLidas ? 'Mostrar todas' : `Apenas não lidas (${naoLidasCount})`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={marcarTodasComoLidas}
            disabled={naoLidasCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
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
      <div className="grid gap-4 sm:grid-cols-3">
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
              Antecedência de Calibração (REG-015)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">60 dias</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Regra ativa para alerta preventivo de instrumentos (Pasta POP 011)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'todas', label: 'Todas', icon: Bell },
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
            Todas as rotinas e indicadores selecionados estão em dia.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map((item) => {
            const lida = lidasIds.includes(item.id);
            return (
              <Card
                key={item.id}
                className={cn(
                  'transition-colors',
                  lida ? 'opacity-65' : 'border-l-4',
                  !lida && item.nivel === 'danger' && 'border-l-rose-500',
                  !lida && item.nivel === 'warning' && 'border-l-amber-500',
                  !lida && item.nivel === 'info' && 'border-l-sky-500',
                )}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
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
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{item.titulo}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {item.origemLabel}
                        </Badge>
                        {!lida && (
                          <Badge variant="default" className="text-[10px]">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.descricao}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alternarLida(item.id)}
                      className="text-xs"
                    >
                      {lida ? 'Marcar não lida' : 'Marcar lida'}
                    </Button>
                    <Link href={item.href}>
                      <Button size="sm" variant="outline">
                        Resolver
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
