'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { PublicUser } from '@/core/domain/entities/user';
import { PERFIL_LABEL } from '@/core/domain/enums/user';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  user: PublicUser;
  iniciais: string;
}

export function UserMenu({ user, iniciais }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

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
        <DropdownMenuItem disabled={loading}>
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
  );
}