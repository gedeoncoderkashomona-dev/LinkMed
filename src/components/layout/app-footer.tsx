'use client';

import * as React from 'react';

import { APP_VERSION_LABEL } from '@/lib/version';
import { useWhiteLabelBranding } from './brand-logo';

export function AppFooter() {
  const branding = useWhiteLabelBranding();
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-auto hidden border-t border-border/80 bg-card/70 px-4 py-3 text-xs text-muted-foreground backdrop-blur-md dark:border-emerald-500/15 md:block sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center sm:justify-start sm:text-left">
          <span className="font-medium text-foreground">{branding.instituicaoNome}</span>
          <span>— {branding.instituicaoSubtitulo}</span>
          <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            {APP_VERSION_LABEL}
          </span>
          <span className="hidden text-muted-foreground/60 sm:inline">·</span>
          <span className="text-[11px]">
            SGQ & Assistência Técnica Hospitalar (ANVISA RDC 665/22) · © {ano}
          </span>
        </div>

        <a
          href="https://www.okapicodeforge.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          title="Visitar o site oficial da Okapi Code Forge (abre em nova aba)"
          className="group inline-flex items-center text-xs font-medium text-muted-foreground no-underline transition-colors duration-200 hover:text-primary"
        >
          <span>
            Desenvolvido por{' '}
            <strong className="font-semibold text-foreground transition-colors group-hover:text-primary">
              Okapi Code Forge
            </strong>
          </span>
        </a>
      </div>
    </footer>
  );
}
