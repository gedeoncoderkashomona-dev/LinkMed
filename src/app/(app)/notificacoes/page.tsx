'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  ShieldAlert,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { agoraBR, calcularAlertas, diffDias, type NivelAlerta } from '@/core/domain/forms/alerts';
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

  const notificacoes = React.useMemo<NotificacaoItem[]>(() => {
    const lista: NotificacaoItem[] = [];
    const hoje = agoraBR().data;

    // 1. Alertas Operacionais (Temperatura 2x/dia, Bancada semanal, Pulseira, Calibração 60 dias)
    const alertasForm = calcularAlertas(formsData?.records ?? []);
    for (const a of alertasForm) {
      lista.push({
        id: `form:${a.id}`,
        categoria: 'operacional',
        nivel: a.nivel,
        titulo: a.titulo,
        descricao: a.descricao,
        href: a.href,
        origemLabel: 'Rotina Operacional / Calibração',
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
        origemLabel: 'Não Conformidades (REG-020)',
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
          origemLabel: 'Gestão Documental (POP-001)',
        });
      } else if (pop.status === 'publicado' && pop.totalPendentes > 0) {
        lista.push({
          id: `pop:read:${pop.id}`,
          categoria: 'pops',
          nivel: 'info',
          titulo: `${pop.codigo} possui ${pop.totalPendentes} leitura(s) pendente(s)`,
          descricao: `${pop.titulo} (v${pop.versaoAtual}) — colaboradores ainda precisam confirmar ciência.`,
          href: '/pops',
          origemLabel: 'Gestão Documental (POP-001)',
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
          origemLabel: 'Capacitação & Treinamentos',
        });
      } else if (dias <= 30) {
        lista.push({
          id: `treino:aviso:${t.id}`,
          categoria: 'treinamentos',
          nivel: 'warning',
          titulo: `Reciclagem próxima: ${t.titulo}`,
          descricao: `Vence em ${dias} dia(s) (${t.validadeAte}) · Modalidade: ${t.tipo}.`,
          href: '/treinamentos',
          origemLabel: 'Capacitação & Treinamentos',
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
            Alertas em tempo real de rotinas diárias, validade de calibração (60 dias), NCs e documentos pendentes.
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
              Antecedência de Calibração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">60 dias</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Regra ativa para alerta preventivo de instrumentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'todas', label: 'Todas', icon: Bell },
            { key: 'operacional', label: 'Rotinas & Calibração', icon: Wrench },
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
