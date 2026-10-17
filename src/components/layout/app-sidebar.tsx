'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  Cog,
  FileText,
  History,
  LayoutDashboard,
  ShieldAlert,
  Users2,
  Wrench,
  GraduationCap,
  X,
} from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import type { Perfil } from '@/core/domain/enums/user';
import { PERFIL_LABEL } from '@/core/domain/enums/user';
import { APP_VERSION_LABEL } from '@/lib/version';
import { cn } from '@/lib/utils';

import { BrandLogo } from './brand-logo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perfis?: Perfil[]; // se ausente, todos veem
  badgeKey?: 'ncs' | 'notifications' | 'popReads';
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Geral',
    items: [
      { label: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Qualidade',
    items: [
      { label: 'Documentos (POPs)', href: '/pops', icon: FileText },
      { label: 'Formulários', href: '/formularios', icon: ClipboardList },
      { label: 'Não Conformidades', href: '/ncs', icon: ShieldAlert, badgeKey: 'ncs' },
      { label: 'Treinamentos', href: '/treinamentos', icon: GraduationCap },
    ],
  },
  {
    group: 'Operação',
    items: [
      { label: 'Equipamentos', href: '/equipamentos', icon: Wrench },
      { label: 'Indicadores', href: '/indicadores', icon: BarChart3, perfis: ['diretor', 'gestor'] },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { label: 'Notificações', href: '/notificacoes', icon: Bell, badgeKey: 'notifications' },
      { label: 'Usuários', href: '/usuarios', icon: Users2, perfis: ['diretor'] },
      { label: 'Auditoria', href: '/auditoria', icon: History, perfis: ['diretor', 'gestor'] },
      { label: 'Configurações', href: '/configuracoes', icon: Cog, perfis: ['diretor', 'gestor'] },
    ],
  },
];

interface Props {
  user: PublicUser;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({ user, collapsed, onToggle, mobileOpen = false, onCloseMobile }: Props) {
  const pathname = usePathname();

  // Fecha o menu mobile automaticamente ao trocar de rota
  React.useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  // Bloqueia rolagem do body quando o drawer mobile está aberto
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const renderNavItems = (isMobile = false) => (
    <nav className={cn('flex-1 overflow-y-auto px-2.5 py-4 scrollbar-thin', isMobile && 'px-3 py-3')}>
      {NAV.map((section) => {
        const items = section.items.filter(
          (it) => !it.perfis || it.perfis.includes(user.perfil),
        );
        if (items.length === 0) return null;

        return (
          <div key={section.group} className="mb-4">
            {(!collapsed || isMobile) && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                {section.group}
              </p>
            )}
            <ul className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={() => isMobile && onCloseMobile?.()}
                      title={collapsed && !isMobile ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 touch-manipulation',
                        active
                          ? 'bg-primary/12 font-semibold text-primary shadow-xs'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                        collapsed && !isMobile && 'justify-center px-2 py-2.5',
                        isMobile && 'py-2.5 text-sm',
                      )}
                    >
                      {active && (!collapsed || isMobile) && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-primary' : 'text-muted-foreground/90 group-hover:text-foreground',
                        )}
                      />
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 1. SIDEBAR DESKTOP / NOTEBOOK */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-border/80 bg-card/90 backdrop-blur-md transition-[width] duration-200 md:flex md:flex-col shadow-xs select-none z-20',
          collapsed ? 'w-[68px]' : 'w-[252px]',
        )}
      >
        {/* Marca LINKMED */}
        <div className="flex h-16 items-center border-b border-border/70 px-4">
          <BrandLogo collapsed={collapsed} size="sm" />
        </div>

        {/* Navegação Desktop */}
        {renderNavItems(false)}

        {/* Rodapé: perfil + versão + colapsar */}
        <div className="border-t border-border/80 p-2.5 bg-card/50 space-y-1.5">
          {!collapsed && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/60 p-2 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {user.nomeCompleto
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{user.nomeCompleto}</p>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[10px] font-medium text-muted-foreground">
                    {PERFIL_LABEL[user.perfil]}
                  </p>
                  <span className="text-[9px] font-mono text-muted-foreground/70">
                    {APP_VERSION_LABEL}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground touch-manipulation',
            )}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* 2. DRAWER MOBILE / TABLET (Slide-over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in" role="dialog" aria-modal="true">
          {/* Backdrop escuro com desfoque */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Painel lateral que desliza */}
          <div className="fixed inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-card border-r border-border/80 shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {/* Cabeçalho do Drawer */}
            <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
              <BrandLogo collapsed={false} size="sm" />
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground touch-manipulation"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Itens de Navegação Mobile */}
            {renderNavItems(true)}

            {/* Rodapé Mobile com Usuário e Versão */}
            <div className="border-t border-border/80 p-3 bg-card/60">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/60 p-2.5 shadow-xs mb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {user.nomeCompleto
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user.nomeCompleto}</p>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {PERFIL_LABEL[user.perfil]}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                <span>Plataforma SGQ RDC 665/22</span>
                <span className="font-mono font-medium text-primary">{APP_VERSION_LABEL}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}