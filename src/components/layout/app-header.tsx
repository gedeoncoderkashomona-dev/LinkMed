'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import { PERFIL_COR, PERFIL_LABEL, PERFIL_SHORT_LABEL } from '@/core/domain/enums/user';
import { contarPendenciasOsPorPerfil } from '@/core/domain/forms/os-reg016-sync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOsFlowList } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

interface Props {
  user: PublicUser;
  onOpenMobile?: () => void;
}

export function AppHeader({ user, onOpenMobile }: Props) {
  const { data: osFlowData } = useOsFlowList();
  const pendentesSetor = React.useMemo(
    () => contarPendenciasOsPorPerfil(osFlowData?.ordens ?? [], user.perfil),
    [osFlowData?.ordens, user.perfil],
  );

  const iniciais = React.useMemo(() => {
    const parts = user.nomeCompleto.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return `${first}${last}`.toUpperCase();
  }, [user.nomeCompleto]);

  return (
    <header className="ios-glass sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-border/80 px-3.5 shadow-2xs sm:gap-3 sm:px-6 lg:px-8 dark:border-emerald-500/15">
      {/* Botão menu mobile (smartphones e tablets) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobile}
        className="h-9 w-9 text-foreground hover:bg-accent md:hidden touch-manipulation"
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-[13px] font-medium text-muted-foreground sm:text-sm">
          Olá, <span className="font-semibold text-foreground">{user.nomeCompleto.split(' ')[0]}</span>
        </p>
      </div>

      <Badge
        variant="outline"
        title={PERFIL_LABEL[user.perfil]}
        className={cn(
          'hidden border-border/80 px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs sm:inline-flex',
          PERFIL_COR[user.perfil],
        )}
      >
        {PERFIL_SHORT_LABEL[user.perfil] ?? PERFIL_LABEL[user.perfil]}
      </Badge>

      <ThemeToggle />

      <Link
        href="/notificacoes"
        title={
          pendentesSetor > 0
            ? `Central de Notificações (${pendentesSetor} pendência${pendentesSetor > 1 ? 's' : ''} no setor)`
            : 'Central de Notificações'
        }
      >
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          {pendentesSetor > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
              {pendentesSetor > 9 ? '9+' : pendentesSetor}
            </span>
          )}
        </Button>
      </Link>

      <UserMenu user={user} iniciais={iniciais} />
    </header>
  );
}
