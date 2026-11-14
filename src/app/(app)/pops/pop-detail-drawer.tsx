'use client';

import * as React from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  Edit2,
  FileText,
  History,
  Lock,
  Mail,
  MessageSquare,
  PenTool,
  Save,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SignaturePadDialog } from '@/components/ui/signature-pad-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  CHANGE_REQUEST_STATUS_LABEL,
  POP_STATUS_LABEL,
  POP_STATUS_VARIANT,
  SETOR_LABEL,
  type ChangeRequestStatus,
} from '@/core/domain/enums/pop';
import { obterConteudoPop } from '@/core/domain/pops/pop-catalog-content';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useApprovePop,
  useConfirmRead,
  useCreateChangeRequest,
  usePop,
  usePublishPop,
  useRespondChangeRequest,
} from '@/hooks/use-pops';
import { can } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';

import { ReadReportPanel } from './read-report-panel';

interface Props {
  popId: string;
  initialTab?: 'procedimento' | 'versoes' | 'leituras' | 'sugestoes';
  onClose: () => void;
}

export function PopDetailDrawer({ popId, initialTab = 'procedimento', onClose }: Props) {
  const { data: user } = useCurrentUser();
  const { data, isLoading, refetch } = usePop(popId);
  const publish = usePublishPop();
  const approve = useApprovePop();
  const confirmRead = useConfirmRead();
  const createCr = useCreateChangeRequest();
  const respondCr = useRespondChangeRequest();

  const [crText, setCrText] = React.useState('');
  const [responseText, setResponseText] = React.useState<Record<string, string>>({});
  const [editandoGov, setEditandoGov] = React.useState(false);
  const [editElaborado, setEditElaborado] = React.useState('');
  const [editRevisado, setEditRevisado] = React.useState('');
  const [editAprovado, setEditAprovado] = React.useState('');
  const [salvandoGov, setSalvandoGov] = React.useState(false);

  const [assinandoTipo, setAssinandoTipo] = React.useState<
    'elaborado' | 'revisado' | 'aprovado' | null
  >(null);

  React.useEffect(() => {
    if (data?.pop) {
      setEditElaborado(data.pop.elaboradoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)');
      setEditRevisado(data.pop.revisadoPor ?? 'Marina Lopes (Responsável Técnica)');
      setEditAprovado(data.pop.aprovadoPorNome ?? 'Pedro Costa (Diretoria)');
    }
  }, [data?.pop]);

  const [activeTab, setActiveTab] = React.useState(initialTab);
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, popId]);

  const canApprove = user ? can(user.perfil, 'pops:approve') : false;
  const canPublish = user ? can(user.perfil, 'pops:upload') : false;
  const canRespondCr = user ? can(user.perfil, 'pops:upload') : false;
  const podeEditarGov = user?.perfil === 'gestor' || user?.perfil === 'diretor';

  async function handleSalvarGovernanca() {
    if (!editElaborado.trim() || !editRevisado.trim() || !editAprovado.trim()) {
      toast.error('Preencha os responsáveis pela elaboração, revisão e aprovação.');
      return;
    }
    setSalvandoGov(true);
    try {
      const res = await fetch(`/api/pops/${popId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elaboradoPor: editElaborado.trim(),
          revisadoPor: editRevisado.trim(),
          aprovadoPorNome: editAprovado.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao salvar governança.');
      }
      toast.success('Responsáveis de governança atualizados com sucesso!');
      setEditandoGov(false);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar governança.');
    } finally {
      setSalvandoGov(false);
    }
  }

  async function handleCreateCr(e: React.FormEvent) {
    e.preventDefault();
    if (!crText.trim()) return;
    try {
      const res = await createCr.mutateAsync({ id: popId, descricao: crText });
      const delivery = res.emailDelivery;
      if (delivery?.delivered) {
        toast.success('Sugestão enviada e notificada por e-mail!', {
          description: `Registrada no POP e encaminhada para ${delivery.recipient}.`,
        });
      } else if (delivery && !delivery.configured) {
        toast.warning('Sugestão registrada no sistema', {
          description: `Salva no histórico do POP e em Notificações/Auditoria. Para disparar e-mail real para ${delivery.recipient}, configure RESEND_API_KEY ou SMTP_PASS na Vercel.`,
        });
      } else if (delivery && delivery.error) {
        toast.warning('Sugestão salva no sistema (falha no e-mail)', {
          description: `A sugestão foi gravada no POP, mas o envio para ${delivery.recipient} falhou: ${delivery.error}`,
        });
      } else {
        toast.success('Sugestão enviada com sucesso!');
      }
      setCrText('');
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar sugestão.');
    }
  }

  async function handleRespondCr(crId: string, status: 'aprovada' | 'rejeitada') {
    const resposta = responseText[crId]?.trim();
    if (!resposta) {
      toast.error('Informe a justificativa da resposta.');
      return;
    }
    try {
      await respondCr.mutateAsync({ popId, crId, status, resposta });
      toast.success('Sugestão respondida.');
      setResponseText((prev) => ({ ...prev, [crId]: '' }));
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao responder sugestão.');
    }
  }

  const docCompleto = data?.pop ? obterConteudoPop(data.pop.codigo) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">
              {data?.pop.codigo ?? <Skeleton className="h-4 w-20" />}
            </span>
            {data && (
              <Badge variant={POP_STATUS_VARIANT[data.pop.status]}>
                {POP_STATUS_LABEL[data.pop.status]}
              </Badge>
            )}
            {data && (
              <Badge variant="secondary">
                {SETOR_LABEL[data.pop.setor] ?? data.pop.setor}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/pops/${data.pop.id}/file`} target="_blank" rel="noreferrer">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Baixar POP em PDF
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div>
              <h2 className="text-xl font-bold">{data.pop.titulo}</h2>
              <p className="text-xs text-muted-foreground">
                Versão {String(data.pop.versaoAtual).padStart(2, '0')} · Periodicidade de revisão:{' '}
                {data.pop.periodicidadeRevisaoMeses} meses
              </p>
            </div>

            {/* Governança Documental */}
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                  Governança Documental (RDC 665/2022 — Seção 5.3)
                </span>
                {podeEditarGov && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditandoGov((v) => !v)}
                    className="h-7 gap-1 text-[11px] text-primary"
                  >
                    <Edit2 className="h-3 w-3" />
                    {editandoGov ? 'Cancelar Edição' : 'Editar Responsáveis'}
                  </Button>
                )}
              </div>

              {editandoGov ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Elaborado por:
                    </label>
                    <Input
                      value={editElaborado}
                      onChange={(e) => setEditElaborado(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Revisado por:
                    </label>
                    <Input
                      value={editRevisado}
                      onChange={(e) => setEditRevisado(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Aprovado por:
                    </label>
                    <Input
                      value={editAprovado}
                      onChange={(e) => setEditAprovado(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleSalvarGovernanca}
                      disabled={salvandoGov}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {salvandoGov ? 'Salvando...' : 'Salvar Responsáveis'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="space-y-0.5 rounded-lg border border-border/60 bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                      <span>Elaboração:</span>
                    </div>
                    <strong className="block truncate text-foreground font-semibold">
                      {data.pop.elaboradoPor ?? 'Vanessa Ribeiro (Qualidade)'}
                    </strong>
                  </div>
                  <div className="space-y-0.5 rounded-lg border border-border/60 bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Revisão:</span>
                    </div>
                    <strong className="block truncate text-foreground font-semibold">
                      {data.pop.revisadoPor ?? 'Marina Lopes (RT)'}
                    </strong>
                  </div>
                  <div className="space-y-0.5 rounded-lg border border-border/60 bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Aprovação:</span>
                    </div>
                    <strong className="block truncate text-foreground font-semibold">
                      {data.pop.aprovadoPorNome ?? 'Pedro Costa (Diretor)'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as 'procedimento' | 'versoes' | 'leituras' | 'sugestoes')
              }
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="procedimento">
                  <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Procedimento
                </TabsTrigger>
                <TabsTrigger value="versoes">
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  Versões
                </TabsTrigger>
                <TabsTrigger value="leituras">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Leituras
                </TabsTrigger>
                <TabsTrigger value="sugestoes">
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Sugestões ({data.changeRequests.length})
                </TabsTrigger>
              </TabsList>

              {/* Procedimento Oficial na Íntegra */}
              <TabsContent value="procedimento" className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {docCompleto?.codigo} — {docCompleto?.titulo}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Documento oficial do Sistema de Gestão da Qualidade LinkMed (RDC 665/2022).
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <a href={`/api/pops/${data.pop.id}/file`} target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Baixar POP em PDF
                    </a>
                  </Button>
                </div>

                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {docCompleto?.secoes.map((sec) => (
                    <div
                      key={sec.numero}
                      className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-1.5"
                    >
                      <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                        {sec.titulo}
                      </h3>
                      {sec.paragrafos.map((p, idx) => (
                        <p key={idx} className="leading-relaxed text-muted-foreground">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}

                  {docCompleto && docCompleto.registros.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-2">
                      <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                        Registros Aplicáveis (REGs)
                      </h3>
                      <div className="space-y-1.5">
                        {docCompleto.registros.map((r, i) => (
                          <div
                            key={i}
                            className="rounded border border-border/70 bg-muted/20 p-2 text-[11px]"
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

                  {docCompleto && docCompleto.revisoes.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-2">
                      <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                        Histórico de Revisões
                      </h3>
                      <div className="space-y-1">
                        {docCompleto.revisoes.map((rev, i) => (
                          <p key={i} className="text-muted-foreground text-[11px]">
                            <strong>Rev. {rev.numero} ({rev.data}):</strong> {rev.historico}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="versoes" className="space-y-2">
                {data.versoes.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium">
                        Versão {v.numeroVersao} · {v.arquivoNome}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        SHA-256: {v.hashArquivo.slice(0, 16)}...
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`/api/pops/${data.pop.id}/file?versionId=${v.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Baixar PDF
                      </a>
                    </Button>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="leituras">
                <ReadReportPanel popId={data.pop.id} canSeeReport={Boolean(user && can(user.perfil, 'pops:read:report'))} />
              </TabsContent>

              <TabsContent value="sugestoes" className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-muted/25 p-3 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      Destino das sugestões deste POP
                    </span>
                    <Badge variant={data.suggestionEmail?.configured ? 'success' : 'warning'}>
                      {data.suggestionEmail?.configured
                        ? 'Envio por e-mail ativo'
                        : 'E-mail aguardando chave SMTP/Resend'}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    As sugestões são gravadas no histórico deste POP (banco de dados + Trilha de Auditoria para a{' '}
                    <strong className="text-foreground">Qualidade / Diretoria</strong>) e enviadas por e-mail para{' '}
                    <span className="font-mono text-foreground">
                      {data.suggestionEmail?.recipient ?? 'gedeoncoderkashomona@gmail.com'}
                    </span>
                    .
                  </p>
                </div>

                <form onSubmit={handleCreateCr} className="space-y-2">
                  <Textarea
                    placeholder="Descreva a sugestão de melhoria ou alteração para este POP..."
                    value={crText}
                    onChange={(e) => setCrText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={createCr.isPending || crText.trim().length < 5}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {createCr.isPending ? 'Enviando...' : 'Enviar Sugestão'}
                    </Button>
                  </div>
                </form>

                <Separator />

                <div className="space-y-3">
                  {data.changeRequests.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Nenhuma sugestão registrada para este POP até o momento.
                    </p>
                  ) : (
                    data.changeRequests.map((cr) => (
                      <div
                        key={cr.id}
                        className="rounded-lg border border-border bg-card p-3 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-foreground">
                              Sugestão #{cr.id.slice(0, 8)}
                            </span>
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              por {cr.solicitanteNome ?? 'Colaborador'} ·{' '}
                              {new Date(cr.createdAt).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <Badge
                            variant={
                              cr.status === 'aprovada'
                                ? 'success'
                                : cr.status === 'rejeitada'
                                ? 'destructive'
                                : 'warning'
                            }
                          >
                            {CHANGE_REQUEST_STATUS_LABEL[cr.status] ?? cr.status}
                          </Badge>
                        </div>

                        <p className="whitespace-pre-wrap text-muted-foreground">{cr.descricao}</p>

                        {cr.resposta && (
                          <div className="rounded-md border border-border/70 bg-muted/25 p-2.5 text-[11px] space-y-0.5">
                            <p className="font-semibold text-foreground">
                              Parecer{cr.respondidoPorNome ? ` (${cr.respondidoPorNome})` : ''}:
                            </p>
                            <p className="text-muted-foreground">{cr.resposta}</p>
                          </div>
                        )}

                        {canRespondCr && cr.status === 'pendente' && (
                          <div className="space-y-2 border-t border-border/60 pt-2">
                            <Input
                              placeholder="Justificativa da Qualidade / Diretoria..."
                              value={responseText[cr.id] ?? ''}
                              onChange={(e) =>
                                setResponseText((prev) => ({ ...prev, [cr.id]: e.target.value }))
                              }
                              className="h-8 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={respondCr.isPending}
                                onClick={() => handleRespondCr(cr.id, 'rejeitada')}
                              >
                                Rejeitar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={respondCr.isPending}
                                onClick={() => handleRespondCr(cr.id, 'aprovada')}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Aprovar Sugestão
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
