'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Building2, Info, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  dismissCurrentRuleNotice,
  subscribeRuleNotices,
  type ResolvedRuleNotice,
} from '@/lib/rule-notice';
import { cn } from '@/lib/utils';

export function RuleNoticeHost() {
  const [queue, setQueue] = useState<ResolvedRuleNotice[]>([]);

  useEffect(() => {
    return subscribeRuleNotices(setQueue);
  }, []);

  const current = queue[0] ?? null;

  if (!current) {
    return null;
  }

  const isBlocked = current.severity === 'blocked';
  const isInfo = current.severity === 'info';

  const topAccent = isBlocked
    ? 'bg-rose-500'
    : isInfo
      ? 'bg-primary'
      : 'bg-amber-500';

  const iconTone = isBlocked
    ? 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400'
    : isInfo
      ? 'bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:text-emerald-400'
      : 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400';

  const hintAccent = isBlocked
    ? 'border-l-rose-500/60'
    : isInfo
      ? 'border-l-primary/60'
      : 'border-l-amber-500/60';

  const Icon = isBlocked ? ShieldAlert : isInfo ? Info : AlertTriangle;

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) dismissCurrentRuleNotice();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-[6px] transition-opacity data-[state=open]:animate-fade-in dark:bg-black/60" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden',
            'rounded-2xl border border-border/80 bg-card/98 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.24)]',
            'backdrop-blur-2xl outline-none data-[state=open]:animate-modal-in',
            'dark:border-emerald-500/20 dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.75)]',
          )}
        >
          {/* Barra superior fina de severidade */}
          <div className={cn('h-[3px] w-full', topAccent)} />

          <div className="p-5 sm:p-6">
            {/* Cabeçalho horizontal compacto e elegante */}
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  iconTone,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </div>

              <div className="min-w-0 flex-1 pr-6">
                {current.sectorLabel && (
                  <div className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[11px] font-medium text-primary dark:text-emerald-300">
                    <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.6} />
                    <span className="truncate">{current.sectorLabel}</span>
                  </div>
                )}

                <DialogPrimitive.Title className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {current.title}
                </DialogPrimitive.Title>

                <DialogPrimitive.Description className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {current.message}
                </DialogPrimitive.Description>
              </div>

              <button
                type="button"
                onClick={dismissCurrentRuleNotice}
                aria-label="Fechar aviso"
                className="absolute right-4 top-5 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>

            {current.hint && (
              <div
                className={cn(
                  'mt-4 rounded-xl border border-border/70 border-l-[3px] bg-muted/40 px-3.5 py-2.5 text-left',
                  hintAccent,
                )}
              >
                <p className="text-[11px] font-semibold tracking-tight text-foreground/85">
                  Como prosseguir
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {current.hint}
                </p>
              </div>
            )}

            {/* Rodapé limpo com ação principal */}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              {queue.length > 1 ? (
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  Aviso 1 de {queue.length}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/80">
                  Controle Operacional · LINKMED
                </span>
              )}

              <button
                type="button"
                autoFocus
                onClick={dismissCurrentRuleNotice}
                className={cn(
                  'inline-flex h-9 min-w-[112px] items-center justify-center rounded-lg',
                  'bg-primary px-5 text-[13px] font-medium text-white',
                  'shadow-soft transition-all hover:bg-primary/90 active:scale-[0.985]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2',
                )}
              >
                Entendi
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
