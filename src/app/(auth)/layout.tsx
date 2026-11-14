import { AppFooter } from '@/components/layout/app-footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary)/0.07),transparent)]"
      />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>

      <div className="relative z-10">
        <AppFooter />
      </div>
    </div>
  );
}