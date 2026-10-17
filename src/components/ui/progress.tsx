import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0..100
  className?: string;
  tone?: 'primary' | 'success' | 'warning' | 'destructive';
}

const TONE_BG = {
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-destructive',
} as const;

export function Progress({ value, className, tone = 'primary' }: ProgressProps) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full transition-all', TONE_BG[tone])}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}