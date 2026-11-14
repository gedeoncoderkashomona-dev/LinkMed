import { AppFooter } from '@/components/layout/app-footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-[#F2F9F4] via-white to-[#E6F4EC] dark:from-[#07160F] dark:via-[#0A1E15] dark:to-emerald-950/50">
      {/* Fundo decorativo hospitalar nos tons da logo LinkMed */}
      <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-45">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A4CE39]/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#539C6E]/25 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="relative z-10">
        <AppFooter />
      </div>
    </div>
  );
}