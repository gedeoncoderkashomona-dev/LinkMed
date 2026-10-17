'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import { PERFIL_COR, PERFIL_LABEL, PERFIL_SHORT_LABEL } from '@/core/domain/enums/user';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { APP_VERSION_LABEL } from '@/lib/version';

import { UserMenu } from './user-menu';

interface Props {
  user: PublicUser;
  onOpenMobile?: () => void;
}

export function AppHeader({ user, onOpenMobile }: Props) {
  const iniciais = React.useMemo(() => {
    const parts = user.nomeCompleto.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return `${first}${last}`.toUpperCase();
  }, [user.nomeCompleto]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 sm:gap-3 border-b border-border/80 bg-background/90 px-3 sm:px-6 lg:px-8 backdrop-blur-md shadow-2xs">
      {/* Botão menu mobile (smartphones e tablets) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobile}
        className="md:hidden touch-manipulation h-9 w-9 text-foreground hover:bg-accent"
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1 flex items-center gap-2">
        <p className="truncate text-xs sm:text-sm font-medium text-muted-foreground">
          Bem-vindo(a), <span className="font-semibold text-foreground">{user.nomeCompleto.split(' ')[0]}</span>
        </p>
        <span className="hidden xl:inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
          {APP_VERSION_LABEL}
        </span>
      </div>

      <Badge
        variant="outline"
        title={PERFIL_LABEL[user.perfil]}
        className={cn('hidden sm:inline-flex text-xs font-semibold px-2.5 py-0.5 border shadow-2xs', PERFIL_COR[user.perfil])}
      >
        {PERFIL_SHORT_LABEL[user.perfil] ?? PERFIL_LABEL[user.perfil]}
      </Badge>

      <Link href="/notificacoes" title="Central de Notificações">
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
      </Link>

      <UserMenu user={user} iniciais={iniciais} />
    </header>
  );
}