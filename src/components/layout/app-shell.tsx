'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { PublicUser } from '@/core/domain/entities/user';

import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { IdleGuard } from './idle-guard';

interface Props {
  user: PublicUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: Props) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Hidrata imediatamente o cache do usuário logado para evitar roundtrip extra (/api/auth/me) no mobile e desktop
  React.useMemo(() => {
    queryClient.setQueryData(['auth', 'me'], user);
  }, [queryClient, user]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
        </main>
        <AppFooter />
      </div>
      <IdleGuard />
    </div>
  );
}
