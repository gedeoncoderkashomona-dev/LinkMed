'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface WhiteLabelBranding {
  instituicaoNome: string;
  instituicaoSubtitulo: string;
  corPrimariaHsl: string; // ex.: "148 44% 34%"
}

export const DEFAULT_BRANDING: WhiteLabelBranding = {
  instituicaoNome: 'LINKMED',
  instituicaoSubtitulo: 'Soluções Médicas',
  corPrimariaHsl: '148 44% 34%',
};

export const STORAGE_KEY_BRANDING = 'linkmed:whitelabel:branding:v1';

export function useWhiteLabelBranding(): WhiteLabelBranding {
  const [branding, setBranding] = React.useState<WhiteLabelBranding>(DEFAULT_BRANDING);

  React.useEffect(() => {
    function carregar() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_BRANDING);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WhiteLabelBranding>;
          const next = { ...DEFAULT_BRANDING, ...parsed };
          setBranding(next);
          if (next.corPrimariaHsl) {
            document.documentElement.style.setProperty('--primary', next.corPrimariaHsl);
          }
        }
      } catch {
        // ignora
      }
    }
    carregar();
    window.addEventListener('linkmed:branding-updated', carregar);
    return () => window.removeEventListener('linkmed:branding-updated', carregar);
  }, []);

  return branding;
}

interface BrandLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  useFullImage?: boolean;
  className?: string;
}

/**
 * Identidade visual oficial LINKMED — Soluções Médicas
 * Suporta modo White-Label caso outra instituição hospitalar personalize o nome.
 */
export function BrandLogo({
  collapsed = false,
  size = 'md',
  useFullImage = false,
  className,
}: BrandLogoProps) {
  const branding = useWhiteLabelBranding();
  const isDefaultLinkmed =
    branding.instituicaoNome.trim().toUpperCase() === 'LINKMED';

  if (useFullImage && isDefaultLinkmed) {
    return (
      <div className={cn('flex flex-col items-center', className)}>
        <img
          src="/logo-linkmed.jpg"
          alt="LINKMED — Soluções Médicas"
          className={cn(
            'rounded-xl object-contain',
            size === 'lg' ? 'h-24 w-auto' : size === 'md' ? 'h-16 w-auto' : 'h-11 w-auto',
          )}
        />
      </div>
    );
  }

  const iconSizes = {
    sm: 'h-9 w-9',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-500/25 bg-white p-1 shadow-sm',
          iconSizes[size],
        )}
      >
        <img
          src="/logo-estatico.jpg"
          alt={branding.instituicaoNome}
          className="h-full w-full object-contain"
        />
      </div>

      {!collapsed && (
        <div className="min-w-0 flex-1 leading-tight">
          {isDefaultLinkmed ? (
            <p
              className={cn(
                'truncate font-extrabold tracking-tight',
                size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm',
              )}
            >
              <span className="text-[#8AB826] dark:text-[#A4CE39]">LINK</span>
              <span className="text-[#4E6E3A] dark:text-[#78A85B]">MED</span>
            </p>
          ) : (
            <p
              className={cn(
                'truncate font-bold tracking-tight text-primary',
                size === 'lg' ? 'text-xl' : 'text-sm',
              )}
            >
              {branding.instituicaoNome}
            </p>
          )}
          <p
            className={cn(
              'truncate font-medium text-[#539C6E] dark:text-emerald-400',
              size === 'lg' ? 'text-xs' : 'text-[11px]',
            )}
          >
            {branding.instituicaoSubtitulo}
          </p>
        </div>
      )}
    </div>
  );
}

interface SplashProps {
  title?: string;
  subtitle?: string;
  fullscreen?: boolean;
}

/**
 * Efeito de carregamento limpo exibindo apenas a imagem da logo pulsando,
 * sem caixa quadrada, textos ou barra de carregamento.
 */
export function BrandSplashLoader({
  fullscreen = true,
}: SplashProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-white p-6',
        fullscreen ? 'fixed inset-0 z-50 min-h-screen' : 'min-h-[320px] w-full',
      )}
    >
      <img
        src="/logo-estatico.jpg"
        alt="LINKMED"
        className="h-28 w-auto animate-pulse object-contain mix-blend-multiply select-none pointer-events-none"
      />
    </div>
  );
}

