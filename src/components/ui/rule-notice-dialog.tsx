'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Building2, Info, Lock } from 'lucide-react';
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

  const iconTone =
    current.severity === 'blocked'
      ? 'bg-red-50 text-red-600 ring-1 ring-red-200/70 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800/50'
      : current.severity === 'info'
        ? 'bg-emerald-50 text-primary ring-1 ring-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800/50'
        : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/70 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-800/50';

  const Icon =
    current.severity === 'blocked'
      ? Lock
      : current.severity === 'info'
        ? Info
        : AlertTriangle;

  return (
    <DialogPrimitive.Root open onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-slate-950/35 backdrop-blur-md transition-opacity data-[state=open]:animate-fade-in dark:bg-black/65"
        />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2',
            'rounded-[24px] border border-border/80 bg-card/95 p-6 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.3)]',
            'backdrop-blur-2xl outline-none data-[state=open]:animate-fade-in',
            'dark:border-emerald-500/25 dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)]',
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl',
                iconTone,
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </div>

            {current.sectorLabel && (
              <div className="mb-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium tracking-tight text-primary dark:text-emerald-300">
                <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">Responsável: {current.sectorLabel}</span>
              </div>
            )}

            <DialogPrimitive.Title className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
              {current.title}
            </DialogPrimitive.Title>

            <DialogPrimitive.Description className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
              {current.message}
            </DialogPrimitive.Description>

            {current.hint && (
              <div className="mt-4 w-full rounded-2xl border border-border/80 bg-muted/50 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  O que fazer para seguir
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-foreground">
                  {current.hint}
                </p>
              </div>
            )}

            <button
              type="button"
              autoFocus
              onClick={dismissCurrentRuleNotice}
              className={cn(
                'mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl',
                'bg-primary px-5 text-[15px] font-medium text-white',
                'shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.985]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
              )}
            >
              Entendi
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
