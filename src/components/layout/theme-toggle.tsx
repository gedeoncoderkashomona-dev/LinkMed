'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Theme = 'light' | 'dark';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const isDark =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('linkmed-theme') === 'dark' ||
      (!('linkmed-theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('linkmed-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('linkmed-theme', 'light');
    }

    window.dispatchEvent(new CustomEvent('linkmed:theme-changed', { detail: nextTheme }));
  }

  // Previne mismatch de hidratação no primeiro render do SSR
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 text-muted-foreground', className)}
        aria-label="Alternar iluminação (Luz do dia / Noturna)"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors touch-manipulation',
        className,
      )}
      title={theme === 'dark' ? 'Ativar Luz do Dia (Modo Claro)' : 'Ativar Luz Noturna (Modo Escuro)'}
      aria-label={theme === 'dark' ? 'Mudar para luz do dia' : 'Mudar para luz noturna'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}

