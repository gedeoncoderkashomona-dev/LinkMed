'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HardHat,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ManutencaoPage() {
  const router = useRouter();
  const [showBypassInput, setShowBypassInput] = React.useState(false);
  const [bypassKey, setBypassKey] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  function handleBypass(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    // Chave de acesso direto ou sem senha caso queira liberar para a equipe
    if (bypassKey.trim() === 'linkmed2026' || bypassKey.trim() === '2026' || bypassKey.trim() === 'adm') {
      document.cookie = 'ro_bypass_maintenance=true; path=/; max-age=86400';
      router.push('/login');
    } else {
      setErrorMsg('Código de liberação inválido. Use a senha de desenvolvedor/administrador.');
    }
  }

  function liberarAcessoRapido() {
    document.cookie = 'ro_bypass_maintenance=true; path=/; max-age=86400';
    router.push('/login');
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[650px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-10 -left-20 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <img
            src="/logo-linkmed.jpg"
            alt="LINKMED — Soluções Médicas"
            className="h-12 w-auto object-contain rounded-md bg-white/95 p-1 shadow-md shadow-cyan-950/40"
          />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
              LINKMED · SGQ Hospitalar
            </p>
            <p className="text-[11px] text-slate-400">
              Sistema de Gestão da Qualidade RDC 665/2022
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-xs px-3 py-1 flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            MANUTENÇÃO PROGRAMADA
          </Badge>
          <Badge
            variant="secondary"
            className="bg-slate-800/80 text-slate-300 font-mono text-xs border border-slate-700/60"
          >
            Release v2.0
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Modern Medical Engineering SVG Illustration */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 blur-2xl animate-pulse" />
          
          <svg
            className="relative h-48 w-48 sm:h-56 sm:w-56 drop-shadow-2xl"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Rotating Gear Effect */}
            <circle
              cx="120"
              cy="120"
              r="105"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeDasharray="10 14"
              strokeOpacity="0.4"
              className="animate-spin"
              style={{ animationDuration: '35s' }}
            />
            <circle
              cx="120"
              cy="120"
              r="90"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              strokeOpacity="0.6"
              className="animate-spin"
              style={{ animationDuration: '20s', animationDirection: 'reverse' }}
            />

            {/* Central Hexagon Shield Backdrop */}
            <polygon
              points="120,35 185,72 185,148 120,185 55,148 55,72"
              fill="url(#paint0_linear)"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />

            {/* Cross / Medical Device Core */}
            <path
              d="M110 80H130V105H155V125H130V150H110V125H85V105H110V80Z"
              fill="url(#paint1_linear)"
              stroke="#e0f2fe"
              strokeWidth="2"
            />

            {/* Calibration Wave / Pulse across center */}
            <path
              d="M60 115 H90 L102 95 L114 135 L126 100 L138 125 L150 115 H180"
              stroke="#22d3ee"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />

            {/* Floating Tech Dots */}
            <circle cx="120" cy="35" r="4.5" fill="#38bdf8" />
            <circle cx="185" cy="72" r="4.5" fill="#38bdf8" />
            <circle cx="185" cy="148" r="4.5" fill="#38bdf8" />
            <circle cx="120" cy="185" r="4.5" fill="#38bdf8" />
            <circle cx="55" cy="148" r="4.5" fill="#38bdf8" />
            <circle cx="55" cy="72" r="4.5" fill="#38bdf8" />

            <defs>
              <linearGradient
                id="paint0_linear"
                x1="55"
                y1="35"
                x2="185"
                y2="185"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#0f172a" stopOpacity="0.95" />
                <stop offset="0.5" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="1" stopColor="#0369a1" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient
                id="paint1_linear"
                x1="85"
                y1="80"
                x2="155"
                y2="150"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#0284c7" />
                <stop offset="1" stopColor="#0369a1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Estamos Atualizando a Plataforma <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">LINKMED</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Nossa equipe está aplicando a implantação da <strong>Versão 2.0 (Auditoria Regulamentar RDC 665/2022)</strong>. O acesso está temporariamente reservado para a homologação dos novos módulos.
        </p>

        {/* Deployment Status Checklist Card */}
        <Card className="mt-8 w-full max-w-xl border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-2xl text-left">
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                Status das Implementações em Andamento
              </span>
              <span className="text-xs font-mono text-cyan-400">95% Concluído</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Assinatura Eletrônica & LGPD:</strong> Hash SHA-256 e selo de autenticidade (Art. 7º Lei 13.709/18).
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Perfil Administrativo (ADM):</strong> Credenciais ativas para abertura de OS e aprovação de orçamentos.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Formulário REG-009 (Cardios):</strong> Integrado diretamente no catálogo e no Item 5 do REG-016.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                <span>
                  <strong>Central de Notificações Intersetoriais:</strong> Sincronização em tempo real entre ADM, Almoxarifado e Assistência Técnica.
                </span>
              </li>
            </ul>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Previsão de reabertura pública: <strong>Hoje</strong>
              </span>
              <span>Engenharia & Qualidade LINKMED</span>
            </div>
          </CardContent>
        </Card>

        {/* Bypass / Equipe Autorizada */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {!showBypassInput ? (
            <div className="flex flex-wrap items-center gap-3 justify-center">
              <Button
                variant="default"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-900/30"
                onClick={liberarAcessoRapido}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Acessar Plataforma (Equipe & Testes)
              </Button>

              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Disponibilidade
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBypass} className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md">
              <Input
                type="password"
                placeholder="Código de liberação administrativa"
                value={bypassKey}
                onChange={(e) => setBypassKey(e.target.value)}
                className="bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-500 text-xs"
              />
              <Button type="submit" size="sm" className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white">
                Entrar
              </Button>
            </form>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorMsg}
            </p>
          )}

          <p className="text-[11px] text-slate-500">
            Dúvidas ou urgências técnicas? Contate o Responsável Técnico ou Diretoria Operacional.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60">
        <div>
          © 2026 LINKMED — Soluções Médicas. Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono">
          <span>RDC 665/2022</span>
          <span>•</span>
          <span>LGPD 13.709/2018</span>
          <span>•</span>
          <span>Build Seguro #2.0.0</span>
        </div>
      </footer>
    </div>
  );
}

