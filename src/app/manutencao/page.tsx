'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ManutencaoPage() {
  const router = useRouter();
  const [showBypassInput, setShowBypassInput] = React.useState(false);
  const [bypassKey, setBypassKey] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  function handleBypass(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (
      bypassKey.trim() === 'linkmed2026' ||
      bypassKey.trim() === '2026' ||
      bypassKey.trim() === 'adm' ||
      bypassKey.trim() === 'linkmed'
    ) {
      document.cookie = 'ro_bypass_maintenance=true; path=/; max-age=86400';
      router.push('/login');
    } else {
      setErrorMsg('Código de liberação inválido. Use a credencial da equipe técnica.');
    }
  }

  function liberarAcessoRapido() {
    document.cookie = 'ro_bypass_maintenance=true; path=/; max-age=86400';
    router.push('/login');
  }

  return (
    <div className="relative min-h-screen bg-[#060d09] text-[#e6f4ed] flex flex-col justify-between font-sans selection:bg-[#307D54] selection:text-white">
      {/* Luzes de Fundo 100% Verde Linkmed (Sem nenhum azul ou slate) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full bg-[#307D54]/22 blur-[140px]" />
        <div className="absolute top-1/3 -right-24 h-[400px] w-[400px] rounded-full bg-[#8AB826]/14 blur-[130px]" />
        <div className="absolute bottom-10 -left-20 h-[400px] w-[400px] rounded-full bg-[#1b4332]/30 blur-[130px]" />
      </div>

      {/* Cabeçalho */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-[#14261d]">
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center gap-2.5">
            <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#307D54]/30 bg-white p-1 shadow-sm h-11 w-11">
              <img
                src="/logo-estatico.jpg"
                alt="LINKMED"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-base tracking-tight">
                <span className="text-[#8AB826]">LINK</span>
                <span className="text-[#528a43]">MED</span>
              </p>
              <p className="text-[11px] font-medium text-[#539C6E]">
                Soluções Médicas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#307D54]/18 px-3 py-1 text-[11px] font-bold tracking-wide text-[#A4CE39] border border-[#307D54]/40 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#A4CE39] animate-pulse" />
            Release v2.0
          </span>
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-[11px] px-2.5 py-0.5 hidden sm:flex items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            MANUTENÇÃO ATIVA
          </Badge>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col items-center justify-center text-center">
        {/* LOGO OFICIAL LINKMED EM DESTAQUE CENTRAL (Substituindo o ícone azul anterior) */}
        <div className="relative mb-6 flex flex-col items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#307D54]/30 to-[#8AB826]/25 blur-2xl animate-pulse" />
          
          <div className="relative flex items-center justify-center rounded-2xl border-2 border-[#307D54]/50 bg-white p-4 shadow-2xl shadow-[#307D54]/25 max-w-xs sm:max-w-sm transition-transform hover:scale-[1.02] duration-200">
            <img
              src="/logo-linkmed.jpg"
              alt="LINKMED — Soluções Médicas"
              className="h-20 sm:h-24 w-auto object-contain"
            />
          </div>
        </div>

        {/* Título Oficial */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
          Estamos Atualizando a Plataforma{' '}
          <span className="text-[#A4CE39]">LINKMED</span>
        </h1>

        <p className="mt-3 text-sm text-[#9abfb0] max-w-xl leading-relaxed">
          Nossa equipe está aplicando a homologação da <strong>Versão 2.0 (Auditoria Regulamentar RDC 665/2022)</strong>. O acesso público está temporariamente reservado enquanto as implementações são validadas.
        </p>

        {/* Card de Status Verde Hospitalar Linkmed */}
        <div className="mt-6 w-full max-w-lg rounded-xl border border-[#1b3427] bg-[#0c1812]/95 p-4 shadow-xl text-left backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b3427] pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7ca995] flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-[#A4CE39]" />
              Implementações em Andamento
            </span>
            <span className="text-[11px] font-mono text-[#A4CE39] font-bold">Release v2.0</span>
          </div>

          <ul className="space-y-2.5 text-xs text-[#c9e4d6]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#A4CE39] shrink-0 mt-0.5" />
              <span>
                <strong>Login do Administrativo (ADM):</strong> Perfis criados para envio de propostas e aprovação de orçamentos.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#A4CE39] shrink-0 mt-0.5" />
              <span>
                <strong>Checklist Cardios (REG-009):</strong> Integrado diretamente no catálogo e no Item 5 do REG-016.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#A4CE39] shrink-0 mt-0.5" />
              <span>
                <strong>Assinatura Eletrônica LGPD:</strong> Hash criptográfico SHA-256 e conformidade com a RDC 665/22.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin shrink-0 mt-0.5" />
              <span>
                <strong>Notificações Intersetoriais:</strong> Fluxo em tempo real entre ADM, Almoxarifado e Assistência Técnica.
              </span>
            </li>
          </ul>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#7ca995] border-t border-[#1b3427]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Previsão de Retorno: <strong>Em instantes</strong>
            </span>
            <span className="font-semibold text-emerald-400">Qualidade & Engenharia LINKMED</span>
          </div>
        </div>

        {/* Botão de Acesso para Equipe / Testes */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {!showBypassInput ? (
            <div className="flex flex-wrap items-center gap-2.5 justify-center">
              <Button
                variant="default"
                className="bg-[#307D54] hover:bg-[#256342] text-white font-semibold text-xs h-9 px-5 shadow-md shadow-[#307D54]/25 border border-emerald-500/30"
                onClick={liberarAcessoRapido}
              >
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                Acessar Plataforma (Equipe & Testes)
              </Button>

              <Button
                variant="outline"
                className="border-[#1b3427] bg-[#0c1812]/70 hover:bg-[#13271d] text-[#c9e4d6] text-xs h-9 px-3.5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Atualizar Página
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBypass} className="flex items-center gap-2 w-full max-w-sm">
              <Input
                type="password"
                placeholder="Código de liberação"
                value={bypassKey}
                onChange={(e) => setBypassKey(e.target.value)}
                className="bg-[#0c1812] border-[#1b3427] text-white text-xs h-8 placeholder:text-muted-foreground"
              />
              <Button type="submit" size="sm" className="bg-[#307D54] hover:bg-[#256342] text-white text-xs h-8">
                Entrar
              </Button>
            </form>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMsg}
            </p>
          )}

          <p className="text-[11px] text-[#638b78]">
            Equipe autorizada pode acessar o painel diretamente pelo botão acima.
          </p>
        </div>
      </main>

      {/* Rodapé Oficial Linkmed */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#638b78] border-t border-[#14261d]">
        <div>
          © 2026 LINKMED — Soluções Médicas. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0 font-mono">
          <span>RDC 665/2022</span>
          <span>•</span>
          <span>LGPD 13.709/2018</span>
          <span>•</span>
          <span>Versão 2.0.0</span>
        </div>
      </footer>
    </div>
  );
}
