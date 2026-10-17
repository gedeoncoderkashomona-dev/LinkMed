'use client';

import * as React from 'react';

interface Options {
  /** Tempo total em ms antes do logout automático. Padrão: 45 min. */
  timeoutMs?: number;
  /** Quanto antes (ms) avisar o usuário. Padrão: 2 min. */
  warnBeforeMs?: number;
  onWarn: () => void;
  onTimeout: () => void;
}

/**
 * Detecta inatividade do usuário (mouse, teclado, toque, scroll).
 * Chama onWarn quando faltar `warnBeforeMs` e onTimeout ao estourar.
 */
export function useIdleTimeout({
  timeoutMs = 45 * 60 * 1000,
  warnBeforeMs = 2 * 60 * 1000,
  onWarn,
  onTimeout,
}: Options) {
  const lastActivityRef = React.useRef<number>(Date.now());
  const warnedRef = React.useRef<boolean>(false);
  const timeoutFiredRef = React.useRef<boolean>(false);

  const onWarnRef = React.useRef(onWarn);
  const onTimeoutRef = React.useRef(onTimeout);

  React.useEffect(() => {
    onWarnRef.current = onWarn;
    onTimeoutRef.current = onTimeout;
  });

  React.useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        onTimeoutRef.current();
      } else if (elapsed >= timeoutMs - warnBeforeMs && !warnedRef.current) {
        warnedRef.current = true;
        onWarnRef.current();
      }
    }, 5_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(interval);
    };
  }, [timeoutMs, warnBeforeMs]);
}