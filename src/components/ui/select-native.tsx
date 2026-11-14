import * as React from 'react';

import { cn } from '@/lib/utils';

export type SelectNativeProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-black/10 bg-white/90 px-3.5 text-sm shadow-soft transition-all dark:border-white/10 dark:bg-zinc-900/80',
        'focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
SelectNative.displayName = 'SelectNative';

export { SelectNative };