import { Skeleton } from '@/components/ui/skeleton';

export default function AppSegmentLoading() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Carregando módulo">
      {/* Top Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
            <Skeleton className="h-4 w-28 rounded-sm mb-3" />
            <Skeleton className="h-8 w-20 rounded-md mb-2" />
            <Skeleton className="h-3 w-40 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/40">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

