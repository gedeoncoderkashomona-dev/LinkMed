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
  MessageSquare,
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
import {
  POP_020_REGISTROS_TABLE,
  POP_020_REVISOES,
  POP_020_SECOES,
} from '@/core/domain/pops/pop-020-content';
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
  onClose: () => void;
}

export function PopDetailDrawer({ popId, onClose }: Props) {
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

  const canUpload = user ? can(user.perfil, 'pops:upload') : false;
  const isDiretor = user?.perfil === 'diretor';
  const isGestor = user?.perfil === 'gestor';
  const podeEditarGov = isDiretor || isGestor;

  React.useEffect(() => {
    if (data?.pop) {
      setEditElaborado(data.pop.elaboradoPor || 'Vanessa Ribeiro (Gestão da Qualidade)');
      setEditRevisado(data.pop.revisadoPor || 'Marina Lopes (Responsável Técnica)');
      setEditAprovado(data.pop.aprovadoPorNome || 'Pedro Costa (Diretoria)');
    }
  }, [data?.pop]);

  const handleSalvarGov = async () => {
    if (!editElaborado.trim() || !editRevisado.trim() || !editAprovado.trim()) {
      toast.error('Preencha todos os responsáveis.');
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
        throw new Error(err.message || 'Falha ao salvar responsáveis.');
      }
      toast.success('Responsáveis pelo POP atualizados com sucesso!');
      setEditandoGov(false);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setSalvandoGov(false);
    }
  };

  const handlePublish = async () => {
    try {
      await publish.mutateAsync(popId);
      toast.success('POP enviado para aprovação.');
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro.');
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approve.mutateAsync(popId);
      toast.success('POP aprovado e publicado.');
      toast.message('Assinatura registrada', {
        description: `Hash: ${res.assinatura.slice(0, 16)}...`,
      });
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro.');
    }
  };

  const handleConfirmRead = async () => {
    try {
      await confirmRead.mutateAsync(popId);
      toast.success('Leitura confirmada — evidência registrada na aba Leituras.');
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro.');
    }
  };

  const handleCreateCr = async () => {
    if (crText.trim().length < 10) {
      toast.error('Descreva com pelo menos 10 caracteres.');
      return;
    }
    try {
      await createCr.mutateAsync({ id: popId, descricao: crText });
      setCrText('');
      toast.success('Sugestão enviada ao Gestor/Diretor.');
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro.');
    }
  };

  const handleRespond = async (
    crId: string,
    status: Exclude<ChangeRequestStatus, 'pendente'>,
  ) => {
    const resposta = responseText[crId]?.trim() ?? '';
    if (resposta.length < 3) {
      toast.error('Informe uma resposta.');
      return;
    }
    try {
      await respondCr.mutateAsync({ popId, crId, status, resposta });
      toast.success('Sugestão respondida.');
      setResponseText((s) => ({ ...s, [crId]: '' }));
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro.');
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
              </>
            ) : (
              <>
                <p className="font-mono text-xs text-muted-foreground">{data.pop.codigo}</p>
                <h2 className="truncate text-base font-semibold">{data.pop.titulo}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={POP_STATUS_VARIANT[data.pop.status]}>
                    {POP_STATUS_LABEL[data.pop.status]}
                  </Badge>
                  <Badge variant="secondary">
                    {SETOR_LABEL[data.pop.setor] ?? data.pop.setor}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Rev. {String(data.pop.versaoAtual).padStart(2, '0')} ·{' '}
                    {data.pop.periodicidadeRevisaoMeses}m
                  </span>
                </div>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || !data ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex-1 p-5 space-y-4">
            {/* Quadro Oficial de Governança: Elaboração, Revisão e Aprovação */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Responsáveis pelo Documento (RDC 665/2022)
                </p>
                {podeEditarGov ? (
                  !editandoGov ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditandoGov(true)}
                      className="h-6 gap-1 px-2 text-[10px] text-primary"
                    >
                      <Edit2 className="h-3 w-3" />
                      Alterar Responsáveis
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditandoGov(false)}
                        className="h-6 px-2 text-[10px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSalvarGov}
                        disabled={salvandoGov}
                        className="h-6 gap-1 px-2 text-[10px]"
                      >
                        <Save className="h-3 w-3" />
                        Salvar
                      </Button>
                    </div>
                  )
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Bloqueado · Apenas Qualidade e Diretor
                  </Badge>
                )}
              </div>

              {!editandoGov ? (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/80 bg-background p-2.5">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <UserCheck className="h-3 w-3 text-primary" />
                      Elaborado por
                    </span>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {data.pop.elaboradoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background p-2.5">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <UserCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      Revisado por
                    </span>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {data.pop.revisadoPor ?? 'Marina Lopes (Responsável Técnica)'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background p-2.5">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      Aprovado por
                    </span>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {data.pop.aprovadoPorNome ?? 'Pedro Costa (Diretoria)'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Elaborado por
                    </label>
                    <Input
                      value={editElaborado}
                      onChange={(e) => setEditElaborado(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Revisado por
                    </label>
                    <Input
                      value={editRevisado}
                      onChange={(e) => setEditRevisado(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Aprovado por
                    </label>
                    <Input
                      value={editAprovado}
                      onChange={(e) => setEditAprovado(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ações contextuais */}
            <div className="flex flex-wrap gap-2">
              {data.versaoVigente && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/api/pops/${data.pop.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Abrir PDF Oficial
                  </a>
                </Button>
              )}
              {canUpload && data.pop.status === 'rascunho' && (
                <Button size="sm" onClick={handlePublish} disabled={publish.isPending}>
                  <Send className="h-3.5 w-3.5" />
                  Enviar para aprovação
                </Button>
              )}
              {isDiretor && data.pop.status === 'aguardando_aprovacao' && (
                <Button size="sm" onClick={handleApprove} disabled={approve.isPending}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Aprovar e assinar
                </Button>
              )}
              {data.pop.status === 'publicado' && (
                data.leituraConfirmadaPorMim ? (
                  <Badge variant="success" className="gap-1.5 px-3 py-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Leitura confirmada por você
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleConfirmRead}
                    disabled={confirmRead.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {confirmRead.isPending ? 'Confirmando...' : 'Confirmar leitura'}
                  </Button>
                )
              )}
            </div>

            {data.pop.descricao && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {data.pop.descricao}
              </p>
            )}

            <Tabs defaultValue={data.pop.codigo === 'POP-020' ? 'procedimento' : 'versoes'}>
              <TabsList
                className={cn(
                  'grid w-full',
                  data.pop.codigo === 'POP-020' ? 'grid-cols-4' : 'grid-cols-3',
                )}
              >
                {data.pop.codigo === 'POP-020' && (
                  <TabsTrigger value="procedimento">
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Procedimento
                  </TabsTrigger>
                )}
                <TabsTrigger value="versoes">
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  Versões
                </TabsTrigger>
                <TabsTrigger value="leituras">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Leituras por Setor
                </TabsTrigger>
                <TabsTrigger value="sugestoes">
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Sugestões ({data.changeRequests.length})
                </TabsTrigger>
              </TabsList>

              {/* Procedimento Oficial na Íntegra (POP-020) */}
              {data.pop.codigo === 'POP-020' && (
                <TabsContent value="procedimento" className="space-y-4 pt-1">
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div>
                      <p className="text-xs font-semibold text-primary">
                        POP-020 — Realização de Assistência Técnica de Equipamentos
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Documento oficial da Assistência Técnica em estrita conformidade com a RDC 665/2022.
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <a href={`/api/pops/${data.pop.id}/file`} target="_blank" rel="noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Abrir PDF Oficial
                      </a>
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {POP_020_SECOES.map((sec) => (
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

                    {/* Tabela de Registros da Qualidade */}
                    <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-2">
                      <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                        8. CONTROLE DE REGISTROS DA QUALIDADE
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border border-border">
                          <thead className="bg-muted text-foreground">
                            <tr>
                              <th className="p-2 border border-border">Identificação</th>
                              <th className="p-2 border border-border">Armazenamento</th>
                              <th className="p-2 border border-border">Acesso</th>
                              <th className="p-2 border border-border">Proteção</th>
                              <th className="p-2 border border-border">Recuperação</th>
                              <th className="p-2 border border-border">Retenção</th>
                              <th className="p-2 border border-border">Disposição</th>
                            </tr>
                          </thead>
                          <tbody>
                            {POP_020_REGISTROS_TABLE.map((row, idx) => (
                              <tr key={idx} className="border-t border-border">
                                <td className="p-2 font-mono font-medium border border-border">
                                  {row.identificacao}
                                </td>
                                <td className="p-2 border border-border">{row.armazenamento}</td>
                                <td className="p-2 border border-border">{row.acesso}</td>
                                <td className="p-2 border border-border">{row.protecao}</td>
                                <td className="p-2 border border-border">{row.recuperacao}</td>
                                <td className="p-2 border border-border">{row.retencao}</td>
                                <td className="p-2 border border-border">{row.disposicao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Histórico de Revisões */}
                    <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-2">
                      <h3 className="font-bold text-foreground text-xs uppercase tracking-wide">
                        9. HISTÓRICO DE REVISÕES
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border border-border">
                          <thead className="bg-muted text-foreground">
                            <tr>
                              <th className="p-2 border border-border">Data</th>
                              <th className="p-2 border border-border">Nº Revisão</th>
                              <th className="p-2 border border-border">Histórico das Modificações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {POP_020_REVISOES.map((rev, idx) => (
                              <tr key={idx} className="border-t border-border">
                                <td className="p-2 font-mono border border-border">{rev.data}</td>
                                <td className="p-2 font-semibold border border-border">{rev.numero}</td>
                                <td className="p-2 border border-border">{rev.historico}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Versões */}
              <TabsContent value="versoes" className="space-y-2">
                {data.versoes.map((v) => (
                  <div
                    key={v.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border border-border p-3',
                      v.status === 'vigente' && 'border-primary/30 bg-primary/5',
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold">
                      {String(v.numeroVersao).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{v.arquivoNome}</p>
                        <Badge
                          variant={v.status === 'vigente' ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {v.status === 'vigente' ? 'Vigente' : 'Obsoleta'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        SHA-256: {v.hashArquivo.slice(0, 24)}...
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(v.arquivoTamanho / 1024 / 1024).toFixed(2)} MB · criada em{' '}
                        {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                        {v.publicadoEm &&
                          ` · publicada em ${new Date(v.publicadoEm).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/api/pops/${data.pop.id}/file?versionId=${v.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                ))}
              </TabsContent>

              {/* Leituras */}
              <TabsContent value="leituras">
                <ReadReportPanel popId={data.pop.id} canSeeReport />
              </TabsContent>

              {/* Sugestões */}
              <TabsContent value="sugestoes" className="space-y-4">
                <div className="rounded-lg border border-border p-3">
                  <Textarea
                    placeholder="Descreva a alteração sugerida neste POP..."
                    value={crText}
                    onChange={(e) => setCrText(e.target.value)}
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCreateCr}
                      disabled={createCr.isPending || crText.trim().length < 10}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar sugestão
                    </Button>
                  </div>
                </div>

                <Separator />

                {data.changeRequests.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhuma sugestão registrada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.changeRequests.map((cr) => {
                      const isPendente = cr.status === 'pendente';
                      return (
                        <div key={cr.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant={
                                cr.status === 'aprovada'
                                  ? 'success'
                                  : cr.status === 'rejeitada'
                                    ? 'destructive'
                                    : 'warning'
                              }
                            >
                              {CHANGE_REQUEST_STATUS_LABEL[cr.status]}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(cr.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm">{cr.descricao}</p>

                          {cr.resposta && (
                            <div className="mt-3 rounded-lg bg-muted/50 p-2.5">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Resposta
                              </p>
                              <p className="mt-0.5 whitespace-pre-line text-sm">{cr.resposta}</p>
                            </div>
                          )}

                          {isPendente && (isDiretor || isGestor) && (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                placeholder="Resposta do Gestor/Diretor..."
                                value={responseText[cr.id] ?? ''}
                                onChange={(e) =>
                                  setResponseText((s) => ({ ...s, [cr.id]: e.target.value }))
                                }
                                rows={2}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRespond(cr.id, 'rejeitada')}
                                  disabled={respondCr.isPending}
                                >
                                  Rejeitar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRespond(cr.id, 'aprovada')}
                                  disabled={respondCr.isPending}
                                >
                                  Aprovar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </aside>
    </div>
  );
}
