import * as React from 'react';

import { cn } from '@/lib/utils';

export type SelectNativeProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-input bg-background/90 px-3.5 text-sm shadow-soft transition-all',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
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