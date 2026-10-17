'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertOctagon, Home, RefreshCw, Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Isolamento de falhas por módulo (Contingência Operacional):
 * Se uma rota interna sofrer qualquer exceção inesperada, o AppShell (menu lateral,
 * cabeçalho e demais módulos do sistema) permanece 100% funcional e exibe
 * diagnóstico técnico claro para o desenvolvedor corrigir rapidamente.
 */
export default function AppModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto my-8 max-w-2xl border-rose-500/40 bg-rose-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base text-rose-700 dark:text-rose-300">
          <AlertOctagon className="h-5 w-5 shrink-0" />
          Isolamento de Contingência Ativado — Falha Localizada no Módulo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-sm text-foreground/90">
          Ocorreu um erro inesperado apenas nesta tela. <strong>Todos os demais módulos do LINKMED continuam operando normalmente.</strong>
        </p>

        <div className="rounded-xl border border-rose-500/30 bg-background p-3.5 font-mono">
          <p className="mb-1 flex items-center gap-1.5 font-sans text-xs font-semibold text-rose-600 dark:text-rose-400">
            <Terminal className="h-3.5 w-3.5" />
            Diagnóstico para o Desenvolvedor:
          </p>
          <p className="break-words text-xs text-foreground">
            <strong>Mensagem:</strong> {error.message || 'Erro não especificado.'}
          </p>
          {error.digest && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <strong>Digest ID:</strong> {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Recarregar este módulo
          </Button>
          <Link href="/dashboard">
            <Button size="sm" variant="outline">
              <Home className="h-3.5 w-3.5" />
              Voltar ao Painel Principal
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
