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
} from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import type { Perfil } from '@/core/domain/enums/user';
import { PERFIL_LABEL } from '@/core/domain/enums/user';
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
}

export function AppSidebar({ user, collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-border/80 bg-card/90 backdrop-blur-md transition-[width] duration-200 md:flex md:flex-col shadow-xs select-none z-20',
        collapsed ? 'w-[68px]' : 'w-[252px]',
      )}
    >
      {/* Marca LINKMED · Soluções Médicas */}
      <div className="flex h-16 items-center border-b border-border/70 px-4">
        <BrandLogo collapsed={collapsed} size="sm" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 scrollbar-thin">
        {NAV.map((section) => {
          const items = section.items.filter(
            (it) => !it.perfis || it.perfis.includes(user.perfil),
          );
          if (items.length === 0) return null;

          return (
            <div key={section.group} className="mb-4">
              {!collapsed && (
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
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                          active
                            ? 'bg-primary/12 font-semibold text-primary shadow-xs'
                            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                          collapsed && 'justify-center px-2 py-2.5',
                        )}
                      >
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            active ? 'text-primary' : 'text-muted-foreground/90 group-hover:text-foreground',
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Rodapé: perfil + colapsar */}
      <div className="border-t border-border/80 p-2.5 bg-card/50">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/60 p-2 shadow-xs">
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
              <p className="truncate text-[10px] font-medium text-muted-foreground">
                {PERFIL_LABEL[user.perfil]}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}