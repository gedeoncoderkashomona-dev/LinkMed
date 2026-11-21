'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, FileText, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { PublicUser } from '@/core/domain/entities/user';
import { PERFIL_COR, PERFIL_LABEL } from '@/core/domain/enums/user';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Props {
  user: PublicUser;
  iniciais: string;
}

export function UserMenu({ user, iniciais }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [perfilAberto, setPerfilAberto] = React.useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      toast.success('Sessão encerrada.');
      router.push('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus-ring rounded-full" aria-label="Menu do usuário">
            <Avatar>
              <AvatarFallback>{iniciais}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.nomeCompleto}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {PERFIL_LABEL[user.perfil]}
              {user.nivel ? ` · ${user.nivel}` : ''}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={loading}
            onSelect={() => setPerfilAberto(true)}
          >
            <UserIcon className="h-4 w-4" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void handleLogout();
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Saindo...' : 'Sair'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={perfilAberto} onOpenChange={setPerfilAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Meu Perfil de Acesso (SGQ LinkMed)
            </DialogTitle>
            <DialogDescription>
              Credenciais autenticadas para assinatura eletrônica e trilha de auditoria RDC 665/22.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/25 p-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="text-sm font-bold">{iniciais}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.nomeCompleto}
                </p>
                <p className="truncate text-muted-foreground">{user.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn('shrink-0 border', PERFIL_COR[user.perfil])}
              >
                {PERFIL_LABEL[user.perfil]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-card p-3">
              <div>
                <span className="text-[11px] text-muted-foreground">CPF Cadastrado</span>
                <p className="font-mono font-semibold text-foreground">{user.cpf}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Nível / Cargo</span>
                <p className="font-semibold text-foreground">{user.nivel || 'Operacional'}</p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Status da Conta</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Expediente Operacional</span>
                <p className="font-semibold text-foreground">Seg–Sex 07:30–19:30</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1" onClick={() => setPerfilAberto(false)}>
                <Link href="/pops">
                  <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Meus POPs
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1" onClick={() => setPerfilAberto(false)}>
                <Link href="/notificacoes">
                  <Bell className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Avisos de OS
                </Link>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPerfilAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}