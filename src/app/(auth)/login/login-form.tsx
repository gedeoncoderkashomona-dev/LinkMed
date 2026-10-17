'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { BrandSplashLoader } from '@/components/layout/brand-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/lib/validation/auth-schemas';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const [authConfirmed, setAuthConfirmed] = React.useState(false);
  const [authErrorDetail, setAuthErrorDetail] = React.useState<string | null>(null);
  const nextRoute = searchParams.get('next') ?? '/dashboard';

  React.useEffect(() => {
    router.prefetch(nextRoute);
  }, [router, nextRoute]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  });

  async function onSubmit(data: LoginInput) {
    setSubmitting(true);
    setAuthErrorDetail(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        const msg = body.message ?? 'E-mail ou senha inválidos.';
        setAuthErrorDetail(msg);
        toast.error('Falha na autenticação', {
          description: msg,
        });
        setSubmitting(false);
        return;
      }

      setAuthConfirmed(true);
      window.location.href = nextRoute;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão com o servidor.';
      setAuthErrorDetail(msg);
      toast.error('Falha de conexão', {
        description: msg,
      });
      setSubmitting(false);
    }
  }

  if (authConfirmed) {
    return <BrandSplashLoader fullscreen />;
  }

  return (
    <Card className="border-border/60 bg-white shadow-lg dark:bg-card">
      <CardHeader className="items-center pb-4 pt-8 text-center">
        <img
          src="/logo-linkmed.jpg"
          alt="LINKMED — Soluções Médicas"
          className="h-28 w-auto object-contain"
        />
      </CardHeader>

      <CardContent className="px-7 pb-8 pt-2">
        {authErrorDetail && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{authErrorDetail}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com.br"
                autoComplete="email"
                className="pl-9"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-9"
                {...register('senha')}
              />
            </div>
            {errors.senha && (
              <p className="text-xs font-medium text-destructive">{errors.senha.message}</p>
            )}
          </div>

          <Button type="submit" className="mt-2 w-full font-semibold" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}