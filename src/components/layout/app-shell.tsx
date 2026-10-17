'use client';

import * as React from 'react';

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
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
        </main>
        <AppFooter />
      </div>
      <IdleGuard />
    </div>
  );
}