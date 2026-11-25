'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowRight,
  BarChart3,
  Bell,
  ClipboardList,
  Cog,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Plus,
  Search,
  ShieldAlert,
  Users2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { PublicUser } from '@/core/domain/entities/user';
import { FORM_DEFS } from '@/core/domain/forms/definitions';
import { TAG_SPECS } from '@/core/domain/forms/os-workflow';
import { etiquetaV4ParaTagColor } from '@/core/domain/os-v4/adapter';
import { useOsFlowList } from '@/hooks/use-operacional';
import { usePops } from '@/hooks/use-pops';
import { cn, formatarCodigoOs } from '@/lib/utils';

interface CommandItem {
  id: string;
  group: 'Ações Rápidas' | 'Ordens de Serviço' | 'Formulários (REGs)' | 'POPs' | 'Navegação';
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  badgeClass?: string;
  icon: LucideIcon;
  keywords: string;
}

interface Props {
  user: PublicUser;
}

export function CommandPalette({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: osData } = useOsFlowList();
  const { data: popsData } = usePops();

  // Atalho global Ctrl+K / Cmd+K
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const allItems = React.useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. Ações rápidas principais
    if (['adm', 'diretor', 'gestor'].includes(user.perfil)) {
      items.push({
        id: 'act-new-os',
        group: 'Ações Rápidas',
        title: 'Abrir Nova Ordem de Serviço (REG-022)',
        subtitle: 'Iniciar inspeção de recebimento de equipamento',
        href: '/formularios/inspecao-recebimento',
        badge: 'ADM',
        icon: Plus,
        keywords: 'nova os abrir recebimento reg-022 criar equipamento',
      });
    }

    items.push({
      id: 'act-equip',
      group: 'Ações Rápidas',
      title: 'Painel de Equipamentos & Fila de OS',
      subtitle: 'Executar etapas, etiquetas e dossiê POP-020',
      href: '/equipamentos',
      icon: Wrench,
      keywords: 'equipamentos bancada os fila etiquetas pop-020',
    });

    // 2. Ordens de Serviço ativas/recentes
    for (const os of (osData?.ordens ?? []).slice(0, 12)) {
      const tagColor =
        etiquetaV4ParaTagColor(os.v4Estado?.etiqueta ?? null) ?? os.etiquetaAtual ?? null;
      const spec = tagColor ? TAG_SPECS[tagColor] : null;
      items.push({
        id: `os-${os.numeroOsNormalizado}`,
        group: 'Ordens de Serviço',
        title: `${formatarCodigoOs(os.numeroOs)} · ${os.identificacao.equipamento}`,
        subtitle: `${os.identificacao.cliente} · ${os.identificacao.marca} ${os.identificacao.modelo}`,
        href: `/equipamentos?os=${encodeURIComponent(os.numeroOs)}`,
        badge: spec ? spec.nomeCor : 'Em aberto',
        badgeClass: spec?.badgeClass,
        icon: Wrench,
        keywords: `${os.numeroOs} ${os.identificacao.cliente} ${os.identificacao.equipamento} ${os.identificacao.marca} ${os.identificacao.numeroSerie} os`,
      });
    }

    // 3. Formulários permitidos para o perfil
    for (const def of FORM_DEFS) {
      if (user.perfil === 'adm' && def.tipo !== 'inspecao-recebimento' && def.tipo !== 'etapas-manutencao') {
        continue;
      }
      if (user.perfil === 'estoquista' && def.tipo !== 'temperatura-umidade') {
        continue;
      }
      if (user.perfil === 'tecnico' && def.tipo === 'inspecao-recebimento') {
        continue;
      }
      items.push({
        id: `form-${def.tipo}`,
        group: 'Formulários (REGs)',
        title: `${def.reg ? `${def.reg} · ` : ''}${def.titulo}`,
        subtitle: def.descricao,
        href: `/formularios/${def.tipo}`,
        badge: def.reg ?? 'REG',
        icon: ClipboardList,
        keywords: `${def.reg ?? ''} ${def.titulo} ${def.pastaPop ?? ''} formulario reg`,
      });
    }

    // 4. POPs cadastrados
    for (const pop of (popsData?.pops ?? []).slice(0, 15)) {
      items.push({
        id: `pop-${pop.id}`,
        group: 'POPs',
        title: `${pop.codigo} — ${pop.titulo}`,
        subtitle: `Versão v${pop.versaoAtual || 1} · ${pop.status}`,
        href: `/pops?codigo=${encodeURIComponent(pop.codigo)}`,
        badge: pop.codigo,
        icon: FileText,
        keywords: `${pop.codigo} ${pop.titulo} pop documento procedimento`,
      });
    }

    // 5. Navegação
    const navItems: Array<CommandItem & { perfis?: string[] }> = [
      {
        id: 'nav-dashboard',
        group: 'Navegação',
        title: 'Painel Principal',
        subtitle: 'Visão geral de pendências e indicadores',
        href: '/dashboard',
        icon: LayoutDashboard,
        keywords: 'dashboard painel inicio home',
      },
      {
        id: 'nav-pops',
        group: 'Navegação',
        title: 'Documentos (POPs)',
        subtitle: 'Biblioteca controlada e confirmações de leitura',
        href: '/pops',
        icon: FileText,
        keywords: 'pops documentos biblioteca pdf',
      },
      {
        id: 'nav-ncs',
        group: 'Navegação',
        title: 'Não Conformidades (NCs)',
        subtitle: 'Registro e tratamento de desvios (REG-038 / REG-047)',
        href: '/ncs',
        icon: ShieldAlert,
        keywords: 'nc nao conformidades desvio qualidade',
      },
      {
        id: 'nav-treinamentos',
        group: 'Navegação',
        title: 'Treinamentos (REG-008)',
        subtitle: 'Capacitações e avaliação de eficácia',
        href: '/treinamentos',
        icon: GraduationCap,
        keywords: 'treinamentos reg-008 eficacia capacitacao',
      },
      {
        id: 'nav-notificacoes',
        group: 'Navegação',
        title: 'Central de Notificações',
        subtitle: 'Avisos intersetoriais e atividades diárias',
        href: '/notificacoes',
        icon: Bell,
        keywords: 'notificacoes avisos alertas pendencias',
      },
      {
        id: 'nav-indicadores',
        group: 'Navegação',
        title: 'Indicadores de Qualidade',
        subtitle: 'Métricas gerenciais e metas RDC 665/22',
        href: '/indicadores',
        icon: BarChart3,
        perfis: ['diretor', 'gestor'],
        keywords: 'indicadores kpi graficos qualidade',
      },
      {
        id: 'nav-auditoria',
        group: 'Navegação',
        title: 'Trilha de Auditoria',
        subtitle: 'Log imutável de ações e registros',
        href: '/auditoria',
        icon: History,
        perfis: ['diretor', 'gestor'],
        keywords: 'auditoria log rastreabilidade rdc',
      },
      {
        id: 'nav-usuarios',
        group: 'Navegação',
        title: 'Gestão de Colaboradores',
        subtitle: 'Usuários ativos e controle de acesso por setor',
        href: '/usuarios',
        icon: Users2,
        perfis: ['diretor'],
        keywords: 'usuarios colaboradores acessos perfis',
      },
      {
        id: 'nav-config',
        group: 'Navegação',
        title: 'Configurações & Feriados',
        subtitle: 'Parâmetros SGQ e janela operacional',
        href: '/configuracoes',
        icon: Cog,
        perfis: ['diretor', 'gestor'],
        keywords: 'configuracoes feriados parametros',
      },
    ];

    for (const nav of navItems) {
      if (nav.perfis && !nav.perfis.includes(user.perfil)) continue;
      items.push(nav);
    }

    return items;
  }, [osData?.ordens, popsData?.pops, user.perfil]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    return allItems
      .filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
          it.keywords.toLowerCase().includes(q),
      )
      .slice(0, 14);
  }, [allItems, query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectItem(item: CommandItem) {
    setOpen(false);
    router.push(item.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      selectItem(filtered[activeIndex]);
    }
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, Array<{ item: CommandItem; flatIdx: number }>>();
    filtered.forEach((item, flatIdx) => {
      const list = map.get(item.group) ?? [];
      list.push({ item, flatIdx });
      map.set(item.group, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-56 items-center justify-between gap-2 rounded-lg border border-border/75 bg-muted/35 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:bg-muted/60 hover:text-foreground lg:inline-flex"
        title="Busca rápida (Ctrl+K)"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
          <span className="truncate">Buscar OS, POP ou REG...</span>
        </span>
        <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Busca rápida"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-[5px] data-[state=open]:animate-fade-in dark:bg-black/60" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-[91] w-[calc(100vw-2rem)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 overflow-hidden',
              'rounded-2xl border border-border/80 bg-card/98 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.24)]',
              'backdrop-blur-2xl outline-none data-[state=open]:animate-modal-in',
              'dark:border-emerald-500/20',
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Busca rápida na plataforma LINKMED
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Pesquise ordens de serviço, formulários REG, POPs e páginas do sistema.
            </DialogPrimitive.Description>

            <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nº da OS, código REG, POP ou módulo..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none"
              />
              <kbd className="hidden rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {grouped.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
                </div>
              ) : (
                grouped.map(([groupName, entries]) => (
                  <div key={groupName} className="mb-2 last:mb-0">
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {groupName}
                    </p>
                    <div className="space-y-0.5">
                      {entries.map(({ item, flatIdx }) => {
                        const Icon = item.icon;
                        const active = flatIdx === activeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => selectItem(item)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                              active
                                ? 'bg-primary/10 text-foreground'
                                : 'text-foreground/90 hover:bg-muted/60',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                  active
                                    ? 'bg-primary text-white'
                                    : 'bg-muted/70 text-muted-foreground',
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium">{item.title}</p>
                                {item.subtitle && (
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {item.badge && (
                                <span
                                  className={cn(
                                    'rounded-md border border-border/75 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground',
                                    item.badgeClass,
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                              {active && (
                                <ArrowRight className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 bg-muted/25 px-4 py-2 text-[11px] text-muted-foreground">
              <span>Use ↑ ↓ para navegar e Enter para abrir</span>
              <span className="font-medium text-foreground/80">LINKMED · Acesso Rápido</span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
