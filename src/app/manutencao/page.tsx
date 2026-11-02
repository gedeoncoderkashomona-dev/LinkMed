'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HardHat,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="relative min-h-screen bg-[#07100c] text-[#e6f4ed] flex flex-col justify-between font-sans selection:bg-[#307D54] selection:text-white">
      {/* Background Radial Glow com as cores da Linkmed (Verde Hospitalar e Lima) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-[#307D54]/18 blur-[130px]" />
        <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full bg-[#8AB826]/12 blur-[120px]" />
        <div className="absolute bottom-10 -left-20 h-[380px] w-[380px] rounded-full bg-[#1b4332]/25 blur-[120px]" />
      </div>

      {/* Header oficial com a Logo e Estilo exato da Linkmed */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-[#162a21]">
        <div className="flex items-center gap-3 select-none">
          {/* Logo container idêntico ao AppSidebar */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-500/25 bg-white p-1 shadow-sm h-11 w-11">
              <img
                src="/logo-estatico.jpg"
                alt="LINKMED"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-base tracking-tight">
                <span className="text-[#8AB826] dark:text-[#A4CE39]">LINK</span>
                <span className="text-[#4E6E3A] dark:text-[#78A85B]">MED</span>
              </p>
              <p className="text-[11px] font-medium text-[#539C6E]">
                Soluções Médicas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300 border border-emerald-500/30 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
      <main className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Ilustração Técnica Médica Linkmed */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#307D54]/25 to-[#A4CE39]/20 blur-2xl animate-pulse" />
          
          <svg
            className="relative h-40 w-40 sm:h-48 sm:w-48 drop-shadow-2xl"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Engrenagem Externa em Verde Hospitalar */}
            <circle
              cx="120"
              cy="120"
              r="105"
              stroke="#307D54"
              strokeWidth="2"
              strokeDasharray="10 14"
              strokeOpacity="0.5"
              className="animate-spin"
              style={{ animationDuration: '35s' }}
            />
            <circle
              cx="120"
              cy="120"
              r="90"
              stroke="#A4CE39"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              strokeOpacity="0.7"
              className="animate-spin"
              style={{ animationDuration: '20s', animationDirection: 'reverse' }}
            />

            {/* Escudo Hexagonal Central com Fundo Hospitalar */}
            <polygon
              points="120,35 185,72 185,148 120,185 55,148 55,72"
              fill="url(#shield_grad)"
              stroke="#307D54"
              strokeWidth="2.5"
            />

            {/* Cruz Médica Linkmed */}
            <path
              d="M110 80H130V105H155V125H130V150H110V125H85V105H110V80Z"
              fill="url(#cross_grad)"
              stroke="#A4CE39"
              strokeWidth="2"
            />

            {/* Pulso Cardíaco / Traçado de Calibração (ECG) */}
            <path
              d="M60 115 H90 L102 95 L114 135 L126 100 L138 125 L150 115 H180"
              stroke="#A4CE39"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(164,206,57,0.8)]"
            />

            {/* Pontos de Ancoragem */}
            <circle cx="120" cy="35" r="4.5" fill="#A4CE39" />
            <circle cx="185" cy="72" r="4.5" fill="#307D54" />
            <circle cx="185" cy="148" r="4.5" fill="#A4CE39" />
            <circle cx="120" cy="185" r="4.5" fill="#307D54" />
            <circle cx="55" cy="148" r="4.5" fill="#A4CE39" />
            <circle cx="55" cy="72" r="4.5" fill="#307D54" />

            <defs>
              <linearGradient id="shield_grad" x1="55" y1="35" x2="185" y2="185" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0a1410" stopOpacity="0.95" />
                <stop offset="0.6" stopColor="#13271d" stopOpacity="0.9" />
                <stop offset="1" stopColor="#1e3a2b" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="cross_grad" x1="85" y1="80" x2="155" y2="150" gradientUnits="userSpaceOnUse">
                <stop stopColor="#307D54" />
                <stop offset="1" stopColor="#1e5237" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Título com a tipografia do Painel Operacional */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
          Estamos Atualizando a Plataforma{' '}
          <span className="text-[#A4CE39]">LINKMED</span>
        </h1>

        <p className="mt-3 text-sm text-[#9abfb0] max-w-xl leading-relaxed">
          O sistema está em processo de sincronização e homologação da <strong>Versão 2.0 (Auditoria RDC 665/2022)</strong>. O acesso público está temporariamente em manutenção enquanto o código é atualizado.
        </p>

        {/* Card de Status no mesmo estilo escuro dos cards do Painel Operacional */}
        <div className="mt-6 w-full max-w-lg rounded-xl border border-[#1b3427] bg-[#0d1a14]/90 p-4 shadow-xl text-left backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b3427] pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7ca995] flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-[#A4CE39]" />
              Implementações & Melhorias em Andamento
            </span>
            <span className="text-[11px] font-mono text-[#A4CE39] font-bold">Release v2.0</span>
          </div>

          <ul className="space-y-2 text-xs text-[#c9e4d6]">
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

        {/* Botão de Bypass / Acesso Técnico */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {!showBypassInput ? (
            <div className="flex flex-wrap items-center gap-2.5 justify-center">
              <Button
                variant="default"
                className="bg-[#307D54] hover:bg-[#256342] text-white font-semibold text-xs h-9 px-4 shadow-md shadow-[#307D54]/20 border border-emerald-500/30"
                onClick={liberarAcessoRapido}
              >
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                Acessar Plataforma (Equipe & Testes)
              </Button>

              <Button
                variant="outline"
                className="border-[#1b3427] bg-[#0d1a14]/60 hover:bg-[#13271d] text-[#c9e4d6] text-xs h-9 px-3.5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Verificar Atualizações
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBypass} className="flex items-center gap-2 w-full max-w-sm">
              <Input
                type="password"
                placeholder="Código de liberação"
                value={bypassKey}
                onChange={(e) => setBypassKey(e.target.value)}
                className="bg-[#0d1a14] border-[#1b3427] text-white text-xs h-8 placeholder:text-muted-foreground"
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
            Equipe técnica autorizada pode acessar normalmente com o botão acima.
          </p>
        </div>
      </main>

      {/* Footer com o padrão do sistema */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#638b78] border-t border-[#162a21]">
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
