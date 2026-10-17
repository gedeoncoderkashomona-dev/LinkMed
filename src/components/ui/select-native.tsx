import * as React from 'react';

import { cn } from '@/lib/utils';

export type SelectNativeProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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