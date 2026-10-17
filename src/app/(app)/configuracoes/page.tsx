'use client';

import * as React from 'react';
import {
  Building2,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Thermometer,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DEFAULT_BRANDING,
  STORAGE_KEY_BRANDING,
  type WhiteLabelBranding,
} from '@/components/layout/brand-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';

interface SgqSettings {
  prazoNcBaixaDias: number;
  prazoNcMediaDias: number;
  prazoNcAltaDias: number;
  prazoNcCriticaDias: number;
  revisaoPopMeses: number;
  alertaCalibracaoDias: number;
  tempMaximaC: number;
  umidadeMinPct: number;
  umidadeMaxPct: number;
  diaHigienizacaoBancada: string;
  exigirAprovacaoDiretorNcCritica: boolean;
}

const DEFAULT_SETTINGS: SgqSettings = {
  prazoNcBaixaDias: 30,
  prazoNcMediaDias: 15,
  prazoNcAltaDias: 15,
  prazoNcCriticaDias: 7,
  revisaoPopMeses: 24,
  alertaCalibracaoDias: 60,
  tempMaximaC: 30,
  umidadeMinPct: 40,
  umidadeMaxPct: 70,
  diaHigienizacaoBancada: 'segunda',
  exigirAprovacaoDiretorNcCritica: true,
};

const STORAGE_KEY_SETTINGS = 'regulaon:sgq:settings:v1';

const PRESET_TEMAS_HOSPITALARES = [
  { label: 'Verde LinkMed Oficial (Padrão)', hsl: '148 44% 34%', hex: '#307D54' },
  { label: 'Verde Floresta Médico (#4E6E3A)', hsl: '97 31% 33%', hex: '#4E6E3A' },
  { label: 'Azul Hospitalar Clínico (#1F4E79)', hsl: '210 59% 30%', hex: '#1F4E79' },
  { label: 'Azul Petróleo Cirúrgico (#0F5C6E)', hsl: '191 76% 25%', hex: '#0F5C6E' },
];

export default function ConfiguracoesPage() {
  const [settings, setSettings] = React.useState<SgqSettings>(DEFAULT_SETTINGS);
  const [branding, setBranding] = React.useState<WhiteLabelBranding>(DEFAULT_BRANDING);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<SgqSettings>) });
      }
      const savedBrand = localStorage.getItem(STORAGE_KEY_BRANDING);
      if (savedBrand) {
        setBranding({ ...DEFAULT_BRANDING, ...(JSON.parse(savedBrand) as Partial<WhiteLabelBranding>) });
      }
    } catch {
      // ignora
    }
  }, []);

  function atualizar<K extends keyof SgqSettings>(campo: K, valor: SgqSettings[K]) {
    setSettings((prev) => ({ ...prev, [campo]: valor }));
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(branding));
      document.documentElement.style.setProperty('--primary', branding.corPrimariaHsl);
      window.dispatchEvent(new Event('linkmed:branding-updated'));
      toast.success('Configurações e Identidade Visual salvas com sucesso!', {
        description: `Instituição ativa: ${branding.instituicaoNome} — ${branding.instituicaoSubtitulo}`,
      });
    } catch {
      toast.error('Não foi possível salvar as configurações localmente.');
    }
  }

  function restaurarPadrao() {
    setSettings(DEFAULT_SETTINGS);
    setBranding(DEFAULT_BRANDING);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(DEFAULT_BRANDING));
      document.documentElement.style.setProperty('--primary', DEFAULT_BRANDING.corPrimariaHsl);
      window.dispatchEvent(new Event('linkmed:branding-updated'));
    } catch {
      // ignora
    }
    toast.info('Parâmetros e identidade restaurados para o padrão LINKMED · Soluções Médicas.');
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Configurações do SGQ & Identidade Hospitalar (SaaS White-Label)
          </h1>
          <p className="text-sm text-muted-foreground">
            Personalização multi-instituição para hospitais/clínicas licenciados e parâmetros normativos RDC 665/22.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={restaurarPadrao}>
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão LINKMED
          </Button>
          <Button type="submit" size="sm">
            <Save className="h-4 w-4" />
            Salvar alterações
          </Button>
        </div>
      </div>

      {/* Card Multi-Tenant / White-Label */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Identidade Visual da Instituição Licenciada (Modo Multi-Hospital / SaaS)
          </CardTitle>
          <CardDescription>
            Permite que outras instituições hospitalares ou empresas de engenharia clínica que contratam a assinatura mensal adaptem o nome e a paleta do sistema à sua marca.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="brand-nome">Nome da Instituição Médica *</Label>
            <Input
              id="brand-nome"
              required
              placeholder="Ex.: LINKMED"
              value={branding.instituicaoNome}
              onChange={(e) =>
                setBranding((b) => ({ ...b, instituicaoNome: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-sub">Subtítulo / Especialidade *</Label>
            <Input
              id="brand-sub"
              required
              placeholder="Ex.: Soluções Médicas"
              value={branding.instituicaoSubtitulo}
              onChange={(e) =>
                setBranding((b) => ({ ...b, instituicaoSubtitulo: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-cor" className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Paleta Institucional do Sistema
            </Label>
            <SelectNative
              id="brand-cor"
              value={branding.corPrimariaHsl}
              onChange={(e) =>
                setBranding((b) => ({ ...b, corPrimariaHsl: e.target.value }))
              }
            >
              {PRESET_TEMAS_HOSPITALARES.map((t) => (
                <option key={t.hsl} value={t.hsl}>
                  {t.label}
                </option>
              ))}
            </SelectNative>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prazos de NC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-primary" />
              Prazos de Tratativa de Não Conformidades (POP-012 / REG-020)
            </CardTitle>
            <CardDescription>
              Dias corridos máximos para investigação de causa raiz, ação corretiva e encerramento.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nc-baixa">Severidade Baixa / Leve (dias)</Label>
              <Input
                id="nc-baixa"
                type="number"
                min={1}
                max={180}
                placeholder="Ex.: 30"
                value={settings.prazoNcBaixaDias}
                onChange={(e) => atualizar('prazoNcBaixaDias', Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-media">Severidade Moderada (dias)</Label>
              <Input
                id="nc-media"
                type="number"
                min={1}
                max={180}
                placeholder="Ex.: 15"
                value={settings.prazoNcMediaDias}
                onChange={(e) => atualizar('prazoNcMediaDias', Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nc-critica">Severidade Grave (dias · exige Direção)</Label>
              <Input
                id="nc-critica"
                type="number"
                min={1}
                max={30}
                placeholder="Ex.: 7"
                value={settings.prazoNcCriticaDias}
                onChange={(e) => atualizar('prazoNcCriticaDias', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gestão Documental e Calibração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-4 w-4 text-primary" />
              Ciclos Documentais e Alertas de Metrologia
            </CardTitle>
            <CardDescription>
              Periodicidade padrão de revisão de POPs (POP-001) e antecedência de alerta de calibração.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rev-pop">Ciclo padrão de revisão de POP (meses)</Label>
              <Input
                id="rev-pop"
                type="number"
                min={6}
                max={60}
                placeholder="Ex.: 24"
                value={settings.revisaoPopMeses}
                onChange={(e) => atualizar('revisaoPopMeses', Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Padrão POP-001: 24 meses (2 anos).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alerta-cal">Alerta de validade de calibração (dias antes)</Label>
              <Input
                id="alerta-cal"
                type="number"
                min={15}
                max={180}
                placeholder="Ex.: 60"
                value={settings.alertaCalibracaoDias}
                onChange={(e) => atualizar('alertaCalibracaoDias', Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Dispara alerta preventivo antes do vencimento do certificado.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dia-bancada">Cobrança de Higienização da Bancada (REG-018)</Label>
              <SelectNative
                id="dia-bancada"
                value={settings.diaHigienizacaoBancada}
                onChange={(e) => atualizar('diaHigienizacaoBancada', e.target.value)}
              >
                <option value="segunda">Início da semana (Segunda-feira — 1x/semana)</option>
                <option value="terca">Até Terça-feira</option>
              </SelectNative>
            </div>
          </CardContent>
        </Card>

        {/* Limites Ambientais REG-017 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Thermometer className="h-4 w-4 text-primary" />
              Limites Ambientais — Temperatura e Umidade (REG-017)
            </CardTitle>
            <CardDescription>
              Faixas operacionais aceitas nas 2 medições diárias (manhã e tarde) da Assistência Técnica e Almoxarifado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="temp-max">Temperatura Máxima (°C)</Label>
              <Input
                id="temp-max"
                type="number"
                placeholder="Ex.: 30"
                value={settings.tempMaximaC}
                onChange={(e) => atualizar('tempMaximaC', Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="umid-min">Umidade Mínima (% UR)</Label>
              <Input
                id="umid-min"
                type="number"
                placeholder="Ex.: 40"
                value={settings.umidadeMinPct}
                onChange={(e) => atualizar('umidadeMinPct', Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="umid-max">Umidade Máxima (% UR)</Label>
              <Input
                id="umid-max"
                type="number"
                placeholder="Ex.: 70"
                value={settings.umidadeMaxPct}
                onChange={(e) => atualizar('umidadeMaxPct', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Diretrizes de Segurança e Conformidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Diretrizes de Integridade e Assinatura (RDC 665/22 & LGPD)
            </CardTitle>
            <CardDescription>
              Políticas mandatórias ativas no núcleo de domínio da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>Exclusão lógica obrigatória (Soft Delete em todas as tabelas)</span>
              <Badge variant="success">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>Assinatura eletrônica SHA-256 em aprovações de POP</span>
              <Badge variant="success">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>Timeout automático de sessão por inatividade (45 minutos)</span>
              <Badge variant="success">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>Isolamento de falhas por módulo (Contingência Error Boundary)</span>
              <Badge variant="success">Ativo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
