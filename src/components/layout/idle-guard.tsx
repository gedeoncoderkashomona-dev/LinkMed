'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Guarda de inatividade: 45 min sem interação → logout automático.
 * Aviso 2 min antes, com opção de continuar.
 */
export function IdleGuard() {
  const router = useRouter();
  const [warnOpen, setWarnOpen] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }, [router]);

  useIdleTimeout({
    timeoutMs: 45 * 60 * 1000,
    warnBeforeMs: 2 * 60 * 1000,
    onWarn: () => {
      setWarnOpen(true);
      toast.warning('Sua sessão vai expirar em 2 minutos por inatividade.');
    },
    onTimeout: () => {
      toast.error('Sessão encerrada por inatividade.');
      void handleLogout();
    },
  });

  return (
    <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sessão quase expirando</DialogTitle>
          <DialogDescription>
            Você ficou 43 minutos sem interagir. A sessão será encerrada em 2 minutos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => void handleLogout()}>
            Sair agora
          </Button>
          <Button onClick={() => setWarnOpen(false)}>Continuar conectado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}