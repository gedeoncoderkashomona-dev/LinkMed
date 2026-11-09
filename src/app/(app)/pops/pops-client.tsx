'use client';

import * as React from 'react';
import {
  Download,
  Eye,
  FileCheck2,
  FileText,
  Plus,
  Search,
  UserCheck,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { DOCUMENTOS_OFICIAIS_POR_MODULO } from '@/core/domain/entities/operacional';
import {
  POP_STATUS_LABEL,
  POP_STATUS_VARIANT,
  SETORES,
  SETOR_LABEL,
  type PopStatus,
  type Setor,
} from '@/core/domain/enums/pop';
import { obterConteudoPop } from '@/core/domain/pops/pop-catalog-content';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePops } from '@/hooks/use-pops';
import { can } from '@/lib/auth/rbac';

import { PopDetailDrawer } from './pop-detail-drawer';
import { UploadPopDialog } from './upload-pop-dialog';

export function PopsClient() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = React.useState('');
  const [setor, setSetor] = React.useState<Setor | ''>('');
  const [status, setStatus] = React.useState<PopStatus | ''>('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [inlinePopId, setInlinePopId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const { data, isLoading } = usePops({
    search: search || undefined,
    setor: setor || undefined,
    status: status || undefined,
  });

  const canUpload = user ? can(user.perfil, 'pops:upload') : false;

  const inlinePop = React.useMemo(() => {
    if (!inlinePopId || !data?.pops) return null;
    const pop = data.pops.find((p) => p.id === inlinePopId);
    if (!pop) return null;
    return {
      pop,
      conteudo: obterConteudoPop(pop.codigo),
    };
  }, [inlinePopId, data?.pops]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos (POPs)</h1>
          <p className="text-sm text-muted-foreground">
            Procedimentos Operacionais Padrão com governança de elaboração, revisão, aprovação, assinatura eletrônica LGPD e visualização direta em tela.
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Subir POP
          </Button>
        )}
      </div>

      {/* Catálogo Oficial de Documentos (POPs) — Seção 1 da Auditoria Linkmed */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <FileCheck2 className="h-4 w-4" />
          <span>Catálogo Oficial de POPs do Módulo Documentos (Auditoria Linkmed — Seção 1):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENTOS_OFICIAIS_POR_MODULO.documentosPops.map((item) => (
            <button
              key={item.codigo}
              type="button"
              onClick={() => {
                setSearch(item.codigo);
                const popEncontrado = data?.pops.find((p) => p.codigo === item.codigo);
                if (popEncontrado) setInlinePopId(popEncontrado.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-background px-2.5 py-1 text-[11px] font-medium transition hover:border-primary hover:bg-primary/10"
            >
              <span className="font-mono font-bold text-primary">{item.codigo}</span>
              <span className="text-muted-foreground">— {item.titulo}</span>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou código (ex: POP-004, POP-020)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={setor}
            onChange={(e) => setSetor(e.target.value as Setor | '')}
          >
            <option value="">Todos os setores</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {SETOR_LABEL[s]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={status}
            onChange={(e) => setStatus(e.target.value as PopStatus | '')}
          >
            <option value="">Todos os status</option>
            {(
              ['rascunho', 'aguardando_aprovacao', 'publicado', 'obsoleto'] as PopStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {POP_STATUS_LABEL[s]}
              </option>
            ))}
          </SelectNative>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !data?.pops.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhum POP encontrado.</p>
            <p className="text-xs text-muted-foreground">
              Ajuste os filtros ou selecione um dos POPs do catálogo oficial acima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.pops.map((pop) => {
            const total = pop.totalConfirmacoes + pop.totalPendentes;
            const pct = total > 0 ? Math.round((pop.totalConfirmacoes / total) * 100) : 0;
            const elaboradoPor = pop.elaboradoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)';
            const revisadoPor = pop.revisadoPor ?? 'Marina Lopes (Responsável Técnica)';
            const aprovadoPor = pop.aprovadoPorNome ?? 'Pedro Costa (Diretoria)';
            const isSelected = inlinePopId === pop.id;

            return (
              <Card
                key={pop.id}
                className={`cursor-pointer transition-all hover:shadow-card ${
                  isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.02]' : ''
                }`}
                onClick={() => {
                  setInlinePopId(pop.id);
                  // Scroll suave para o visualizador inferior se na tela
                  setTimeout(() => {
                    const el = document.getElementById('leitor-pop-inferior');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 80);
                }}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {pop.codigo}
                        </span>
                        <Badge variant={POP_STATUS_VARIANT[pop.status]}>
                          {POP_STATUS_LABEL[pop.status]}
                        </Badge>
                        <Badge variant="secondary">{SETOR_LABEL[pop.setor] ?? pop.setor}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Rev. {String(pop.versaoAtual).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{pop.titulo}</p>
                      {pop.descricao && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {pop.descricao}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:text-right">
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(pop.id);
                          }}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Painel Completo
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <a href={`/api/pops/${pop.id}/file`} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            Baixar PDF
                          </a>
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end text-[11px] text-muted-foreground pt-1">
                        <span>Leituras:</span>
                        <strong className="text-foreground">{pct}%</strong>
                        <span>({pop.totalConfirmacoes} de {total || '—'})</span>
                      </div>
                      <Progress
                        value={pct}
                        tone={pct >= 90 ? 'success' : pct >= 50 ? 'primary' : 'warning'}
                      />
                    </div>
                  </div>

                  {/* Faixa de Responsáveis: Elaboração, Revisão e Aprovação */}
                  <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-[11px] sm:grid-cols-3">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">Elaboração:</span>
                      <strong className="truncate text-foreground">{elaboradoPor}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="text-muted-foreground">Revisão:</span>
                      <strong className="truncate text-foreground">{revisadoPor}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-muted-foreground">Aprovação:</span>
                      <strong className="truncate text-foreground">{aprovadoPor}</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Visualização do Conteúdo na Parte Inferior da Tela (Exigência Ata Linkmed) */}
      {inlinePop && (
        <div id="leitor-pop-inferior" className="pt-2">
          <Card className="border-2 border-primary/40 shadow-lg">
            <div className="flex flex-wrap items-center justify-between border-b border-border bg-primary/5 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">
                    {inlinePop.pop.codigo}
                  </span>
                  <Badge variant="outline">Rev. {inlinePop.pop.versaoAtual}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Setor: {SETOR_LABEL[inlinePop.pop.setor] ?? inlinePop.pop.setor}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {inlinePop.pop.titulo}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <a href={`/api/pops/${inlinePop.pop.id}/file`} target="_blank" rel="noreferrer">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Baixar Documento em PDF
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedId(inlinePop.pop.id)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Abrir no Painel
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInlinePopId(null)}
                  title="Fechar Leitor Inferior"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <CardContent className="space-y-4 p-5 max-h-[600px] overflow-y-auto">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs grid gap-2 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Elaborado por:</span>
                  <p className="font-semibold text-foreground">
                    {inlinePop.pop.elaboradoPor ?? 'Vanessa Ribeiro (Qualidade)'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Revisado por:</span>
                  <p className="font-semibold text-foreground">
                    {inlinePop.pop.revisadoPor ?? 'Marina Lopes (RT)'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Aprovado por:</span>
                  <p className="font-semibold text-foreground">
                    {inlinePop.pop.aprovadoPorNome ?? 'Pedro Costa (Diretoria)'}
                  </p>
                </div>
              </div>

              {inlinePop.conteudo.secoes.map((sec) => (
                <div
                  key={sec.numero}
                  className="rounded-lg border border-border bg-card p-4 text-xs space-y-1.5"
                >
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                    {sec.titulo}
                  </h3>
                  {sec.paragrafos.map((p, idx) => (
                    <p key={idx} className="leading-relaxed text-muted-foreground text-xs">
                      {p}
                    </p>
                  ))}
                </div>
              ))}

              {inlinePop.conteudo.registros.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-2">
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                    Registros do Sistema da Qualidade Gerados por este POP
                  </h3>
                  <div className="space-y-1.5">
                    {inlinePop.conteudo.registros.map((r, i) => (
                      <div
                        key={i}
                        className="rounded border border-border/70 bg-muted/20 p-2.5 text-[11px]"
                      >
                        <span className="font-semibold text-primary">{r.identificacao}</span>
                        <div className="mt-1 text-muted-foreground grid grid-cols-2 gap-1">
                          <span>Armazenamento: {r.armazenamento}</span>
                          <span>Acesso: {r.acesso}</span>
                          <span>Retenção: {r.retencao}</span>
                          <span>Disposição: {r.disposicao}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <UploadPopDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      {selectedId && (
        <PopDetailDrawer popId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
