'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ClipboardList, LayoutDashboard, Menu, Wrench } from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import { contarPendenciasOsPorPerfil } from '@/core/domain/forms/os-reg016-sync';
import { useOsFlowList } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  user: PublicUser;
  onOpenMenu: () => void;
}

export function MobileTabBar({ user, onOpenMenu }: MobileTabBarProps) {
  const pathname = usePathname();
  const { data: osFlowData } = useOsFlowList();
  const pendentesSetor = contarPendenciasOsPorPerfil(osFlowData?.ordens ?? [], user.perfil);

  const tabs = [
    { label: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    { label: 'OS', href: '/equipamentos', icon: Wrench },
    { label: 'Formulários', href: '/formularios', icon: ClipboardList },
    {
      label: 'Avisos',
      href: '/notificacoes',
      icon: Bell,
      badge: pendentesSetor > 0 ? (pendentesSetor > 9 ? '9+' : String(pendentesSetor)) : null,
    },
  ];

  return (
    <nav
      aria-label="Navegação rápida"
      className="ios-glass fixed inset-x-0 bottom-0 z-40 border-t border-border/80 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(16,185,129,0.16)] md:hidden dark:border-emerald-500/20"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'ios-touch relative flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors touch-manipulation',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2 : 1.5} />
                {tab.badge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-white">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="ios-touch flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
          aria-label="Abrir menu completo"
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <Menu className="h-[20px] w-[20px]" strokeWidth={1.5} />
          </span>
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
