'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck2,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';

import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  NC_ORIGEM_LABEL,
  NC_ORIGENS,
  NC_SEVERIDADE_LABEL,
  NC_SEVERIDADES,
  NC_STATUS,
  NC_STATUS_LABEL,
  type NcOrigem,
  type NcSeveridade,
  type NcStatus,
} from '@/core/domain/entities/operacional';
import { canEditGovernance, RESPONSAVEIS_PADRAO_AT } from '@/core/domain/forms/definitions';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCreateNc, useNcs, useUpdateNcStatus } from '@/hooks/use-operacional';
import { can } from '@/lib/auth/rbac';

export function NcsClient() {
  const { data: user } = useCurrentUser();
  const [origemFiltro, setOrigemFiltro] = React.useState<NcOrigem | ''>('');
  const [statusFiltro, setStatusFiltro] = React.useState<NcStatus | ''>('');
  const [busca, setBusca] = React.useState('');
  const [dialogAberto, setDialogAberto] = React.useState(false);

  // Estado do modal de nova NC (REG-020)
  const [titulo, setTitulo] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [causa, setCausa] = React.useState('');
  const [acaoImediata, setAcaoImediata] = React.useState('');
  const [identificacaoEquipamento, setIdentificacaoEquipamento] = React.useState('');
  const [equipamentoNaoSeAplica, setEquipamentoNaoSeAplica] = React.useState(false);
  const [origem, setOrigem] = React.useState<NcOrigem>('assistencia_tecnica');
  const [severidade, setSeveridade] = React.useState<NcSeveridade>('moderada');
  const [elaboradoPor, setElaboradoPor] = React.useState('Gestão da Qualidade');
  const [revisadoPor, setRevisadoPor] = React.useState('Responsável Técnico');
  const [aprovadoPor, setAprovadoPor] = React.useState('Pedro Costa (Diretoria Operacional)');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);
  const [erroForm, setErroForm] = React.useState<string | null>(null);

  const podeEditarGovernanca = canEditGovernance(user?.perfil);

  React.useEffect(() => {
    if (podeEditarGovernanca && user?.nomeCompleto && elaboradoPor === 'Gestão da Qualidade') {
      setElaboradoPor(user.nomeCompleto);
    }
  }, [podeEditarGovernanca, user?.nomeCompleto, elaboradoPor]);

  const { data, isLoading } = useNcs(origemFiltro || undefined);
  const createNc = useCreateNc();
  const updateStatus = useUpdateNcStatus();

  const canCreate = user ? can(user.perfil, 'ncs:create') : false;
  const canAdvance = user ? can(user.perfil, 'ncs:advance') : false;

  const ncsFiltradas = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (data?.ncs ?? []).filter((nc) => {
      if (statusFiltro && nc.status !== statusFiltro) return false;
      if (!q) return true;
      return (
        nc.codigo.toLowerCase().includes(q) ||
        nc.titulo.toLowerCase().includes(q) ||
        (nc.descricao && nc.descricao.toLowerCase().includes(q)) ||
        (nc.causa && nc.causa.toLowerCase().includes(q)) ||
        (nc.acaoImediata && nc.acaoImediata.toLowerCase().includes(q)) ||
        (nc.identificacaoEquipamento && nc.identificacaoEquipamento.toLowerCase().includes(q))
      );
    });
  }, [data?.ncs, statusFiltro, busca]);

  async function handleCriarNc(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);
    if (titulo.trim().length < 3) {
      setErroForm('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    if (!equipamentoNaoSeAplica && !identificacaoEquipamento.trim()) {
      setErroForm(
        'Informe a identificação do equipamento ou marque a opção "Não se aplica".',
      );
      return;
    }
    try {
      await createNc.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        causa: causa.trim() || null,
        acaoImediata: acaoImediata.trim() || null,
        identificacaoEquipamento: equipamentoNaoSeAplica
          ? 'Não se aplica'
          : identificacaoEquipamento.trim(),
        equipamentoNaoSeAplica,
        origem,
        severidade,
        elaboradoPor: elaboradoPor.trim() || 'Gestão da Qualidade',
        revisadoPor: revisadoPor.trim() || 'Responsável Técnico',
        aprovadoPor: aprovadoPor.trim() || 'Diretoria Operacional',
      });
      setTitulo('');
      setDescricao('');
      setCausa('');
      setAcaoImediata('');
      setIdentificacaoEquipamento('');
      setEquipamentoNaoSeAplica(false);
      setDialogAberto(false);
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao registrar NC.');
    }
  }

  const resumo = data?.resumo ?? {
    abertas: 0,
    emAndamento: 0,
    concluidas: 0,
    total: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Não Conformidades (POP-012 / REG-020)
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro e acompanhamento de Não Conformidades por setor (Assistência Técnica, Almoxarifado, Vendas, Diretoria, Qualidade e Financeiro).
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Abrir Não Conformidade
          </Button>
        )}
      </div>

      {/* Cabeçalho de Governança Documental REG-020 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <FileCheck2 className="h-4 w-4" />
          <span>REG-020 — Controle de Não Conformidade (RDC 665/22)</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span>
            <strong className="text-foreground">Elaborado por:</strong> Gestão da Qualidade
          </span>
          <span>
            <strong className="text-foreground">Revisado por:</strong> Responsável Técnico
          </span>
          <span>
            <strong className="text-foreground">Aprovado por:</strong> Diretoria Operacional
          </span>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {resumo.abertas}
            </p>
            <p className="text-xs text-muted-foreground">Aguardando tratativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Em andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {resumo.emAndamento}
            </p>
            <p className="text-xs text-muted-foreground">Em análise / retrabalho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {resumo.concluidas}
            </p>
            <p className="text-xs text-muted-foreground">Tratadas e encerradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{resumo.total}</p>
            <p className="text-xs text-muted-foreground">Histórico geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código (NC-2026-...), título, equipamento ou causa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value as NcOrigem | '')}
          >
            <option value="">Todos os setores de origem</option>
            {NC_ORIGENS.map((o) => (
              <option key={o} value={o}>
                {NC_ORIGEM_LABEL[o]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as NcStatus | '')}
          >
            <option value="">Todos os status</option>
            {NC_STATUS.map((s) => (
              <option key={s} value={s}>
                {NC_STATUS_LABEL[s]}
              </option>
            ))}
          </SelectNative>
        </CardContent>
      </Card>

      {/* Lista de NCs */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : ncsFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhuma Não Conformidade encontrada.</p>
            <p className="text-xs text-muted-foreground">
              Ajuste os filtros ou clique em &ldquo;Abrir Não Conformidade&rdquo;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {ncsFiltradas.map((nc) => (
            <Card key={nc.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="font-mono">
                        {nc.codigo}
                      </Badge>
                      <Badge
                        variant={
                          nc.status === 'concluida'
                            ? 'success'
                            : nc.status === 'em_andamento'
                              ? 'warning'
                              : 'destructive'
                        }
                      >
                        {NC_STATUS_LABEL[nc.status]}
                      </Badge>
                      <Badge
                        variant={
                          nc.severidade === 'grave'
                            ? 'destructive'
                            : nc.severidade === 'moderada'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        Severidade: {NC_SEVERIDADE_LABEL[nc.severidade]}
                      </Badge>
                      <Badge variant="outline">
                        Setor: {NC_ORIGEM_LABEL[nc.origem] ?? nc.origem}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Cpu className="h-3 w-3" />
                        Equipamento:{' '}
                        {nc.equipamentoNaoSeAplica || !nc.identificacaoEquipamento
                          ? 'Não se aplica (Documental / Processo)'
                          : nc.identificacaoEquipamento}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{nc.titulo}</p>
                  </div>

                  {canAdvance && (
                    <div className="flex flex-wrap items-center gap-2">
                      {nc.status === 'aberta' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: nc.id, status: 'em_andamento' })
                          }
                        >
                          <Play className="h-3.5 w-3.5" />
                          Iniciar tratativa
                        </Button>
                      )}
                      {nc.status !== 'concluida' && (
                        <Button
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: nc.id, status: 'concluida' })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluir NC
                        </Button>
                      )}
                      {nc.status === 'concluida' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: nc.id, status: 'em_andamento' })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Campos separados: Descrição Detalhada, Causa e Ação Imediata */}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      1. Descrição Detalhada
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {nc.descricao || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      2. Causa (Análise de Causa)
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {nc.causa || 'Em análise pela área responsável'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      3. Ação Imediata
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {nc.acaoImediata || 'Isolamento/segregação e notificação imediata'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      <strong>Elaborado por:</strong> {nc.elaboradoPor || 'Gestão da Qualidade'}
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Revisado por:</strong> {nc.revisadoPor || 'Responsável Técnico'}
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Aprovado por:</strong> {nc.aprovadoPor || 'Diretoria Operacional'}
                    </span>
                  </div>
                  <span>
                    Aberta em {new Date(nc.createdAt).toLocaleDateString('pt-BR')}
                    {nc.concluidaEm
                      ? ` · Concluída em ${new Date(nc.concluidaEm).toLocaleDateString('pt-BR')}`
                      : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Nova NC */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abrir Não Conformidade (RNC / REG-020)</DialogTitle>
            <DialogDescription>
              Registre a ocorrência separando Descrição Detalhada, Causa e Ação Imediata, além da identificação do equipamento (ou Não se aplica).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarNc} className="space-y-4">
            {erroForm && (
              <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600">
                {erroForm}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nc-titulo">Título da ocorrência *</Label>
              <Input
                id="nc-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Desvio de calibração ou falha documental identificada"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nc-origem">Setor de origem *</Label>
                <SelectNative
                  id="nc-origem"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value as NcOrigem)}
                >
                  {NC_ORIGENS.map((o) => (
                    <option key={o} value={o}>
                      {NC_ORIGEM_LABEL[o]}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nc-severidade">Severidade *</Label>
                <SelectNative
                  id="nc-severidade"
                  value={severidade}
                  onChange={(e) => setSeveridade(e.target.value as NcSeveridade)}
                >
                  {NC_SEVERIDADES.map((s) => (
                    <option key={s} value={s}>
                      {NC_SEVERIDADE_LABEL[s]}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            {/* Identificação do Equipamento + Opção Não se aplica */}
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="nc-equipamento" className="font-semibold">
                  Identificação do equipamento *
                </Label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary"
                    checked={equipamentoNaoSeAplica}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEquipamentoNaoSeAplica(checked);
                      if (checked) {
                        setIdentificacaoEquipamento('Não se aplica');
                      } else if (identificacaoEquipamento === 'Não se aplica') {
                        setIdentificacaoEquipamento('');
                      }
                    }}
                  />
                  Não se aplica (NC Documental / Processo Administrativo)
                </label>
              </div>
              <Input
                id="nc-equipamento"
                disabled={equipamentoNaoSeAplica}
                value={
                  equipamentoNaoSeAplica
                    ? 'Não se aplica (Não Conformidade Documental / Processo)'
                    : identificacaoEquipamento
                }
                onChange={(e) => setIdentificacaoEquipamento(e.target.value)}
                placeholder="Informe Modelo, Nº de Série, TAG ou Nº da OS (Ex: Incubadora Olidef · NS: OLD-8841)"
              />
            </div>

            {/* Campos separados: Descrição detalhada, Causa e Ação imediata */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-descricao">1. Descrição detalhada *</Label>
              <Textarea
                id="nc-descricao"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva detalhadamente a Não Conformidade evidenciada..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-causa">2. Causa *</Label>
              <Textarea
                id="nc-causa"
                rows={2}
                value={causa}
                onChange={(e) => setCausa(e.target.value)}
                placeholder="Informe a causa identificada ou hipótese de causa raiz do desvio..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-acao-imediata">3. Ação imediata *</Label>
              <Textarea
                id="nc-acao-imediata"
                rows={2}
                value={acaoImediata}
                onChange={(e) => setAcaoImediata(e.target.value)}
                placeholder="Descreva a ação imediata ou contenção adotada (segregação, correção documental, etc.)..."
                required
              />
            </div>

            {/* Governança Documental: Elaborado / Revisado / Aprovado */}
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Governança Documental (REG-020)
                </span>
                {podeEditarGovernanca ? (
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary text-[10px]">
                    Edição permitida (Qualidade / Diretor)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Bloqueado · Apenas Qualidade e Diretor
                  </Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="nc-elab" className="text-xs">
                    Elaborado por *
                  </Label>
                  <Input
                    id="nc-elab"
                    value={elaboradoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setElaboradoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nc-rev" className="text-xs">
                    Revisado por *
                  </Label>
                  <Input
                    id="nc-rev"
                    value={revisadoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setRevisadoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nc-aprov" className="text-xs">
                    Aprovado por *
                  </Label>
                  <Input
                    id="nc-aprov"
                    value={aprovadoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setAprovadoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
              </div>
              {!podeEditarGovernanca && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Tabela bloqueada para usuários operacionais conforme governança documental LinkMed (RDC 665/22).
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createNc.isPending}>
                <Clock className="h-4 w-4" />
                {createNc.isPending ? 'Registrando...' : 'Registrar NC'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dossiê da OS */}
      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />
    </div>
  );
}
