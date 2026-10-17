export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <span className="text-xs font-medium text-muted-foreground">Carregando ambiente seguro...</span>
      </div>
    </div>
  );
}
