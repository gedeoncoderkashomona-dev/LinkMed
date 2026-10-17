'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { PublicUser } from '@/core/domain/entities/user';
import {
  PERFIL_COR,
  PERFIL_LABEL,
  PERFIL_SHORT_LABEL,
  type Perfil,
} from '@/core/domain/enums/user';
import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';

async function fetchUsers(): Promise<PublicUser[]> {
  const res = await fetch('/api/users', { credentials: 'include' });
  if (!res.ok) throw new Error('Não autorizado ou erro ao listar usuários.');
  const data = (await res.json()) as { users: PublicUser[] };
  return data.users;
}

function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9)
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: fetchUsers,
  });

  const podeCriar = currentUser ? can(currentUser.perfil, 'users:create') : false;

  const [busca, setBusca] = React.useState('');
  const [perfilFiltro, setPerfilFiltro] = React.useState<string>('todos');
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table');
  const [dialogAberto, setDialogAberto] = React.useState(false);

  const [nomeCompleto, setNomeCompleto] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [cpf, setCpf] = React.useState('');
  const [senha, setSenha] = React.useState('');
  const [perfil, setPerfil] = React.useState<Perfil>('tecnico');
  const [nivel, setNivel] = React.useState<string>('Pleno');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCompleto,
          email,
          cpf,
          senha,
          perfil,
          nivel: perfil === 'tecnico' || perfil === 'gestor' ? nivel || null : null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Falha ao cadastrar colaborador.');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Colaborador cadastrado com sucesso!');
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
      setDialogAberto(false);
      setNomeCompleto('');
      setEmail('');
      setCpf('');
      setSenha('');
      setPerfil('tecnico');
      setNivel('Pleno');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (perfilFiltro !== 'todos' && u.perfil !== perfilFiltro) return false;
      if (!q) return true;
      return (
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cpf.includes(q)
      );
    });
  }, [users, busca, perfilFiltro]);

  return (
    <div className="space-y-6 pt-1">
      {/* Cabeçalho da Página */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestão de Colaboradores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usuários cadastrados e seus respectivos perfis regulatórios da RDC 665/22 (RN-01).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground sm:flex shadow-2xs">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Controle de Acesso RBAC Ativo
          </div>
          {podeCriar && (
            <Button
              size="sm"
              onClick={() => setDialogAberto(true)}
              className="gap-2 shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Alternância de Visualização */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-14 bg-card shadow-xs"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          <SelectNative
            value={perfilFiltro}
            onChange={(e) => setPerfilFiltro(e.target.value)}
            className="w-full sm:w-56 bg-card shadow-xs"
          >
            <option value="todos">Todos os perfis ({users?.length ?? 0})</option>
            <option value="diretor">Diretor</option>
            <option value="gestor">Gestor da Qualidade / RT</option>
            <option value="tecnico">Técnico de Assistência</option>
            <option value="estoquista">Estoquista / Almoxarifado</option>
          </SelectNative>
        </div>

        {/* Alternância Tabela vs Cards */}
        <div className="flex items-center gap-1 self-end sm:self-auto rounded-lg border border-border/70 bg-card p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Visualização em Tabela"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>Tabela</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Visualização em Grade de Cards"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'cards'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {isLoading ? (
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            Apenas usuários com perfil Diretor ou Gestor têm permissão para visualizar esta lista.
          </p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-semibold">Nenhum colaborador encontrado</p>
          <p className="text-xs text-muted-foreground">
            Tente ajustar os termos de busca ou o filtro de perfil.
          </p>
        </Card>
      ) : viewMode === 'table' ? (
        /* VISUALIZAÇÃO EM TABELA CORPORATIVA LIMPA */
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Colaborador</th>
                  <th className="px-3 py-3.5">Perfil Regulatório</th>
                  <th className="px-3 py-3.5">Nível</th>
                  <th className="px-3 py-3.5">CPF</th>
                  <th className="px-3 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtrados.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-accent/40"
                  >
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/20">
                          {u.nomeCompleto
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{u.nomeCompleto}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        title={PERFIL_LABEL[u.perfil]}
                        className={cn('text-xs font-medium border px-2.5 py-0.5 shadow-2xs', PERFIL_COR[u.perfil])}
                      >
                        {PERFIL_SHORT_LABEL[u.perfil] ?? PERFIL_LABEL[u.perfil]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {u.nivel ? (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {u.nivel}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {u.cpf}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {u.status === 'ativo' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Inativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
            <span>Mostrando {filtrados.length} colaborador(es)</span>
            <span>RDC 665/2022 ANVISA</span>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM GRADE DE CARDS REDESENHADA (Sem quebras nem sobreposições) */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((u) => (
            <Card
              key={u.id}
              className="flex flex-col justify-between border-border/80 bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <CardContent className="p-4 space-y-3.5">
                {/* Linha superior: Avatar + Nome + Badge de Perfil */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/20">
                      {u.nomeCompleto
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.nomeCompleto}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    title={PERFIL_LABEL[u.perfil]}
                    className={cn(
                      'shrink-0 text-[11px] font-medium border px-2 py-0.5 shadow-2xs',
                      PERFIL_COR[u.perfil],
                    )}
                  >
                    {PERFIL_SHORT_LABEL[u.perfil]}
                  </Badge>
                </div>

                {/* Divisor sutil */}
                <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">CPF: {u.cpf}</span>
                  <div className="flex items-center gap-2">
                    {u.nivel && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        {u.nivel}
                      </span>
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
                        u.status === 'ativo'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          u.status === 'ativo' ? 'bg-emerald-500' : 'bg-muted-foreground',
                        )}
                      />
                      {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação de Usuário (Exclusivo Diretor) */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Cadastrar Novo Colaborador
            </DialogTitle>
            <DialogDescription>
              Cadastro restrito à Direção (RN-01). O acesso é liberado imediatamente com o perfil atribuído.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="u-nome">Nome completo *</Label>
              <Input
                id="u-nome"
                required
                minLength={3}
                placeholder="Ex.: Mariana Ferreira"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-email">E-mail corporativo *</Label>
                <Input
                  id="u-email"
                  type="email"
                  required
                  placeholder="nome@regulaon.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-cpf">CPF (000.000.000-00) *</Label>
                <Input
                  id="u-cpf"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-perfil">Perfil de acesso *</Label>
                <SelectNative
                  id="u-perfil"
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value as Perfil)}
                >
                  <option value="tecnico">Técnico</option>
                  <option value="estoquista">Estoquista / Almoxarife</option>
                  <option value="gestor">Gestor da Qualidade / RT</option>
                  <option value="diretor">Diretor</option>
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-nivel">Nível informativo</Label>
                <SelectNative
                  id="u-nivel"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                >
                  <option value="Júnior">Júnior</option>
                  <option value="Pleno">Pleno</option>
                  <option value="Sênior">Sênior</option>
                  <option value="">Não aplicável</option>
                </SelectNative>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-senha">Senha inicial (mín. 8 caracteres) *</Label>
              <Input
                id="u-senha"
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Cadastrando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
