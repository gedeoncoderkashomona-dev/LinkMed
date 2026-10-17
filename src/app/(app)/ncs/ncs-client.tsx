'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';

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
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCreateNc, useNcs, useUpdateNcStatus } from '@/hooks/use-operacional';
import { can } from '@/lib/auth/rbac';

export function NcsClient() {
  const { data: user } = useCurrentUser();
  const [origemFiltro, setOrigemFiltro] = React.useState<NcOrigem | ''>('');
  const [statusFiltro, setStatusFiltro] = React.useState<NcStatus | ''>('');
  const [busca, setBusca] = React.useState('');
  const [dialogAberto, setDialogAberto] = React.useState(false);

  // Estado do modal de nova NC
  const [titulo, setTitulo] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [origem, setOrigem] = React.useState<NcOrigem>('assistencia_tecnica');
  const [severidade, setSeveridade] = React.useState<NcSeveridade>('moderada');
  const [erroForm, setErroForm] = React.useState<string | null>(null);

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
        (nc.descricao && nc.descricao.toLowerCase().includes(q))
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
    try {
      await createNc.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        origem,
        severidade,
      });
      setTitulo('');
      setDescricao('');
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
            Registro e acompanhamento de Não Conformidades da Assistência Técnica, Almoxarifado e Qualidade.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Abrir Não Conformidade
          </Button>
        )}
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
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código (NC-2026-...) ou título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value as NcOrigem | '')}
          >
            <option value="">Todas as origens</option>
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
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
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
                    <Badge variant="outline">{NC_ORIGEM_LABEL[nc.origem]}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{nc.titulo}</p>
                  {nc.descricao && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {nc.descricao}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Aberta em {new Date(nc.createdAt).toLocaleDateString('pt-BR')}
                    {nc.concluidaEm
                      ? ` · Concluída em ${new Date(nc.concluidaEm).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Nova NC */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Não Conformidade (RNC / REG-020)</DialogTitle>
            <DialogDescription>
              Registre a ocorrência para acompanhamento, retrabalho e plano de ação.
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
                placeholder="Ex: Equipamento reprovado na verificação de calibração REG-030"
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

            <div className="space-y-1.5">
              <Label htmlFor="nc-descricao">Descrição detalhada / Causa / Ação imediata</Label>
              <Textarea
                id="nc-descricao"
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o desvio identificado, número de série/OS e ações imediatas..."
              />
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
    </div>
  );
}
