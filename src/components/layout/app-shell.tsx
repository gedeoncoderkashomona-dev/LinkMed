'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, LogOut, ShieldAlert, Unlock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { verificarAcessoHorario } from '@/core/domain/access-schedule';
import type { PublicUser } from '@/core/domain/entities/user';
import { PERFIL_LABEL } from '@/core/domain/enums/user';

import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { IdleGuard } from './idle-guard';

interface Props {
  user: PublicUser;
  children: React.ReactNode;
}

const STORAGE_BYPASS_KEY = 'regulaon:homolog_schedule_bypass:v2';

export function AppShell({ user, children }: Props) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [bypassAtivo, setBypassAtivo] = React.useState(false);
  const [now, setNow] = React.useState<Date>(() => new Date());

  // Hidrata imediatamente o cache do usuário logado para evitar roundtrip extra (/api/auth/me) no mobile e desktop
  React.useMemo(() => {
    queryClient.setQueryData(['auth', 'me'], user);
  }, [queryClient, user]);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_BYPASS_KEY);
      if (saved === '1') setBypassAtivo(true);
    } catch {
      // ignora
    }
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const statusHorario = React.useMemo(
    () => verificarAcessoHorario(user.perfil, now),
    [user.perfil, now],
  );

  function ativarModoTesteHomologacao() {
    setBypassAtivo(true);
    try {
      sessionStorage.setItem(STORAGE_BYPASS_KEY, '1');
    } catch {
      // ignora
    }
  }

  function desativarModoTesteHomologacao() {
    setBypassAtivo(false);
    try {
      sessionStorage.removeItem(STORAGE_BYPASS_KEY);
    } catch {
      // ignora
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  if (!statusHorario.permitido && !bypassAtivo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg border-amber-500/40 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <Badge variant="warning" className="mx-auto w-fit">
              Restrição de Horário de Acesso (Seção 5.1)
            </Badge>
            <CardTitle className="text-xl">
              Plataforma Fora do Horário de Expediente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {statusHorario.mensagem}
              </p>
            </div>

            <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-xs sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Usuário Conectado:</span>
                <p className="font-semibold text-foreground">{user.nomeCompleto}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Setor / Perfil:</span>
                <p className="font-semibold text-foreground">{PERFIL_LABEL[user.perfil]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Horário Atual (Brasília):</span>
                <p className="font-mono font-semibold text-foreground">
                  {statusHorario.diaSemanaLabel}, {statusHorario.horaAtualLabel}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Próxima Abertura & Entrega de Notificações:</span>
                <p className="font-mono font-semibold text-primary">
                  {statusHorario.proximaAberturaLabel}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              As notificações geradas fora do expediente (segunda a sexta, 07:30h às 19:30h) ficam retidas e são entregues automaticamente na abertura do próximo dia útil às 07:30h.
            </p>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={ativarModoTesteHomologacao}
                className="gap-1.5 text-xs"
              >
                <Unlock className="h-3.5 w-3.5" />
                Simular Horário Comercial (Modo Homologação)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {!statusHorario.permitido && bypassAtivo && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Modo de Teste em Homologação ativo (Fora do expediente 07:30h–19:30h · {statusHorario.horaAtualLabel})
            </span>
            <button
              type="button"
              onClick={desativarModoTesteHomologacao}
              className="underline font-semibold hover:opacity-80"
            >
              Voltar ao bloqueio de horário (Testar Caso T14)
            </button>
          </div>
        )}
        <AppHeader user={user} onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
        </main>
        <AppFooter />
      </div>
      <IdleGuard />
    </div>
  );
}
