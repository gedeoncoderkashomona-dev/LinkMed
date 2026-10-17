'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Bug,
  CheckCircle2,
  ClipboardList,
  Eye,
  Layers,
  Loader2,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { FormRecord } from '@/core/domain/entities/operacional';
import { agoraBR } from '@/core/domain/forms/alerts';
import {
  avaliarConformidade,
  campoVisivel,
  DEFAULT_HOJE,
  getCampos,
  getFormDef,
  getSecoes,
  OPCOES_CNC,
  SETOR_FORM_LABEL,
  STATUS_REGISTRO_LABEL,
  type FieldDef,
  type FormDef,
} from '@/core/domain/forms/definitions';
import {
  aggregateServiceOrders,
  hydrateFormFieldsFromOs,
  TAG_SPECS,
  type ServiceOrderContext,
} from '@/core/domain/forms/os-workflow';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  ApiValidationError,
  useCreateFormRecord,
  useCreateNc,
  useFormRecords,
  useFormsOverview,
} from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

const FORMS_COM_OS = new Set([
  'inspecao-recebimento',
  'limpeza-equipamento',
  'etapas-manutencao',
  'checklist-manutencao',
  'verificacao-calibracao',
]);

/**
 * Gera placeholders didáticos para orientar o colaborador em qualquer campo do formulário.
 */
function obterPlaceholderInteligente(campo: FieldDef): string {
  if (campo.placeholder) return campo.placeholder;
  const n = campo.name.toLowerCase();
  if (n.includes('numero_os') || n === 'os') return 'Ex.: OS-2026-0145';
  if (n.includes('cliente')) return 'Ex.: Hospital Santa Casa / Clínica São Lucas';
  if (n.includes('equipamento')) return 'Ex.: Incubadora Neonatal / Monitor Multiparâmetro';
  if (n.includes('marca_modelo')) return 'Ex.: OLIDEF / SCT-8';
  if (n.includes('marca')) return 'Ex.: OLIDEF, TEB, Dixtal, Philips...';
  if (n.includes('modelo')) return 'Ex.: SCT-8 / ECG-12';
  if (n.includes('numero_serie') || n.includes('serie')) return 'Ex.: SN-2026-8849';
  if (n.includes('patrimonio') || n.includes('tag')) return 'Ex.: PAT-00412';
  if (n.includes('nota_fiscal') || n.includes('nf')) return 'Ex.: NF-e 000.148.920';
  if (n.includes('acessorio')) return 'Ex.: Cabo de força, sensor de temperatura de pele, mangueira...';
  if (n.includes('responsavel') || n.includes('tecnico') || n.includes('colaborador'))
    return 'Ex.: Nome completo do responsável técnico';
  if (n.includes('temperatura')) return 'Ex.: 23.5';
  if (n.includes('umidade')) return 'Ex.: 54';
  if (n.includes('certificado')) return 'Ex.: CERT-CAL-2026-098';
  if (n.includes('laboratorio') || n.includes('entidade'))
    return 'Ex.: Laboratório RBC / Metrologia acreditado';
  if (n.includes('bancada') || n.includes('ambiente') || n.includes('setor'))
    return 'Ex.: Bancada Técnica 01 — Laboratório Eletrônico';
  if (campo.type === 'textarea')
    return `Descreva detalhadamente: ${campo.label.toLowerCase()}...`;
  if (campo.type === 'number')
    return campo.unit ? `Informe o valor em ${campo.unit} (ex.: 10.0)` : 'Digite o valor numérico...';
  return `Informe ${campo.label.toLowerCase()}...`;
}

function campoEstaPreenchido(campo: FieldDef, valor: unknown): boolean {
  if (campo.type === 'checkbox') return true;
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

function criarValoresIniciais(
  def: FormDef,
  subtipo: string | null,
  nomeUsuario?: string,
): Record<string, unknown> {
  const hoje = agoraBR().data;
  const valores: Record<string, unknown> = {};
  for (const campo of getCampos(def, subtipo)) {
    if (campo.defaultValue === DEFAULT_HOJE) {
      valores[campo.name] = hoje;
    } else if (campo.defaultValue !== undefined) {
      valores[campo.name] = campo.defaultValue;
    } else if (
      nomeUsuario &&
      (campo.name.includes('responsavel') ||
        campo.name.includes('assinatura_tecnico') ||
        campo.name === 'tecnico')
    ) {
      valores[campo.name] = nomeUsuario;
    }
  }
  return valores;
}

export function FormDetailClient({ tipo }: { tipo: string }) {
  const def = getFormDef(tipo);
  const searchParams = useSearchParams();
  const osParam = searchParams.get('os');

  const { data: user } = useCurrentUser();
  const { data: recordsData, isLoading } = useFormRecords(tipo);
  const { data: overviewData } = useFormsOverview();
  const createRecord = useCreateFormRecord();
  const createNc = useCreateNc();

  const [subtipo, setSubtipo] = React.useState<string | null>(
    def?.subtipos?.[0]?.key ?? null,
  );
  const [dados, setDados] = React.useState<Record<string, unknown>>({});
  const [erros, setErros] = React.useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = React.useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = React.useState<string | null>(null);
  const [osSelecionada, setOsSelecionada] = React.useState<string>('');
  const [registroDetalhe, setRegistroDetalhe] = React.useState<FormRecord | null>(null);
  const [ncSugerida, setNcSugerida] = React.useState<{
    titulo: string;
    descricao: string;
  } | null>(null);

  React.useEffect(() => {
    if (!def) return;
    setDados((prev) => ({
      ...criarValoresIniciais(def, subtipo, user?.nomeCompleto),
      ...prev,
    }));
  }, [def, subtipo, user?.nomeCompleto]);

  const ordensServico = React.useMemo(
    () => aggregateServiceOrders(overviewData?.records ?? []),
    [overviewData?.records],
  );

  const aplicarContextoOs = React.useCallback(
    (osCtx: ServiceOrderContext) => {
      if (!def) return;
      const herdados = hydrateFormFieldsFromOs(def.tipo, osCtx);
      setOsSelecionada(osCtx.chave);
      setDados((prev) => ({ ...prev, ...herdados }));
      if (def.subtipos && osCtx.marca) {
        const m = osCtx.marca.toLowerCase();
        if (m.includes('olidef')) setSubtipo('olidef');
        else if (m.includes('teb')) setSubtipo('teb');
      }
      toast.success(`Contexto da ${osCtx.numeroOs} carregado!`, {
        description: `${osCtx.equipamento || 'Equipamento'} · Cliente: ${osCtx.cliente || '—'}`,
      });
    },
    [def],
  );

  React.useEffect(() => {
    if (!osParam || !ordensServico.length || osSelecionada) return;
    const encontrada = ordensServico.find(
      (o) =>
        o.chave === osParam ||
        o.numeroOs.toLowerCase() === osParam.toLowerCase() ||
        o.numeroSerie.toLowerCase() === osParam.toLowerCase(),
    );
    if (encontrada) aplicarContextoOs(encontrada);
  }, [osParam, ordensServico, osSelecionada, aplicarContextoOs]);

  if (!def) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium">Formulário não encontrado.</p>
          <Link href="/formularios" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Voltar para Formulários
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const secoes = getSecoes(def, subtipo);
  const statusPrevia = avaliarConformidade(def, subtipo, dados);
  const osContextoAtual = ordensServico.find((o) => o.chave === osSelecionada) ?? null;

  // Gamificação: cálculo de progresso dos campos obrigatórios visíveis
  const todosCamposVisiveis = secoes.flatMap((s) =>
    s.campos.filter((c) => campoVisivel(c, dados)),
  );
  const camposObrigatorios = todosCamposVisiveis.filter(
    (c) => c.required && c.type !== 'checkbox',
  );
  const preenchidosCount = camposObrigatorios.filter((c) =>
    campoEstaPreenchido(c, dados[c.name]),
  ).length;
  const totalObrigatorios = camposObrigatorios.length;
  const progressoPct =
    totalObrigatorios > 0 ? Math.round((preenchidosCount / totalObrigatorios) * 100) : 100;
  const faltamCount = Math.max(0, totalObrigatorios - preenchidosCount);

  function atualizarCampo(name: string, value: unknown) {
    setDados((prev) => {
      const next = { ...prev, [name]: value };
      if (def?.tipo === 'verificacao-calibracao') {
        const match = name.match(/^(.+)_(medido|referencia)$/);
        if (match) {
          const prefix = match[1];
          const med = Number(next[`${prefix}_medido`]);
          const ref = Number(next[`${prefix}_referencia`]);
          if (Number.isFinite(med) && Number.isFinite(ref)) {
            next[`${prefix}_erro`] = Number((med - ref).toFixed(4));
          }
        }
      }
      return next;
    });
    if (erros[name]) {
      setErros((prev) => {
        const clone = { ...prev };
        delete clone[name];
        return clone;
      });
    }
  }

  function preencherTodosConformes(secaoCampos: FieldDef[], tituloSecao: string) {
    setDados((prev) => {
      const next = { ...prev };
      for (const c of secaoCampos) {
        if (c.type === 'cnc' && !next[c.name]) {
          next[c.name] = 'C';
        }
      }
      return next;
    });
    toast.success(`Itens de "${tituloSecao}" marcados como Conforme (C)!`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!def) return;
    setErroGeral(null);
    setSucessoMsg(null);
    setErros({});

    try {
      const res = await createRecord.mutateAsync({
        tipo: def.tipo,
        subtipo,
        dados,
      });

      const labelStatus = STATUS_REGISTRO_LABEL[res.record.status];
      const msg = `Registro ${def.reg ?? def.titulo} salvo com sucesso (${labelStatus})!`;
      setSucessoMsg(msg);

      toast.success(msg, {
        description: `Protocolo #${res.record.id.slice(0, 8)} gravado no Supabase e registrado na Trilha de Auditoria.`,
      });

      if (res.record.status === 'nao_conforme') {
        const ident =
          String(dados.equipamento ?? dados.bancada ?? dados.colaborador ?? '') ||
          def.titulo;
        setNcSugerida({
          titulo: `Não conformidade em ${def.reg ?? def.titulo}: ${ident}`,
          descricao: `Detectada automaticamente no preenchimento do formulário ${def.titulo} (${def.reg ?? 'Controle'}) em ${res.record.dataRef}.`,
        });
      } else {
        setNcSugerida(null);
      }

      setDados(criarValoresIniciais(def, subtipo, user?.nomeCompleto));
      setOsSelecionada('');
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const qtdErros = Object.keys(err.fields ?? {}).length;
        setErroGeral(err.message);
        if (err.fields) {
          setErros(err.fields);
          const primeiroCampo = Object.keys(err.fields)[0];
          if (primeiroCampo) {
            const el = document.getElementById(`field-wrap-${primeiroCampo}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        toast.error(`Atenção: ${err.message}`, {
          description:
            qtdErros > 0
              ? `Foram encontrados ${qtdErros} campo(s) pendente(s) ou inválido(s) em ${def.reg ?? def.tipo}.`
              : `Módulo: ${def.tipo} (${def.reg ?? 'S/REG'}).`,
        });
      } else {
        const detalhe = err instanceof Error ? err.message : 'Erro desconhecido';
        setErroGeral(`Falha ao salvar o formulário (${detalhe}).`);
        toast.error('Erro ao registrar formulário', {
          description: `[Módulo: ${def.tipo}] ${detalhe}`,
        });
      }
    }
  }

  async function handleAbrirNcRapida() {
    if (!ncSugerida) return;
    await createNc.mutateAsync({
      titulo: ncSugerida.titulo,
      descricao: ncSugerida.descricao,
      origem: 'assistencia_tecnica',
      severidade: 'moderada',
    });
    setNcSugerida(null);
    setSucessoMsg('Não Conformidade (NC) aberta e vinculada à Assistência Técnica!');
    toast.success('NC (REG-020) aberta com sucesso!');
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/formularios"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Formulários Operacionais
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {def.reg && (
              <Badge variant="default" className="font-mono">
                {def.reg}
              </Badge>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{def.titulo}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{def.descricao}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Avaliação em tempo real:</span>
          <Badge variant={statusPrevia === 'conforme' ? 'success' : 'destructive'}>
            {STATUS_REGISTRO_LABEL[statusPrevia]}
          </Badge>
        </div>
      </div>

      {/* Barra Gamificada de Progresso do Preenchimento */}
      <Card className="sticky top-16 z-20 border-primary/25 bg-card/95 shadow-sm backdrop-blur-md">
        <CardContent className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors',
                progressoPct === 100
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {progressoPct === 100 ? <Award className="h-5 w-5" /> : `${progressoPct}%`}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {progressoPct === 100
                    ? '🎉 Formulário 100% preenchido e pronto para envio!'
                    : progressoPct >= 60
                      ? `⚡ Ótimo ritmo! Faltam apenas ${faltamCount} campo(s) obrigatório(s)`
                      : `📋 Progresso do preenchimento: ${preenchidosCount} de ${totalObrigatorios} obrigatórios`}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Preencha os itens sinalizados com <span className="text-destructive">*</span>. Dica: use os exemplos dentro de cada campo.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-56">
            <Progress value={progressoPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Widget Contexto Mestre da OS (Herança Automática de Dados) */}
      {FORMS_COM_OS.has(def.tipo) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Contexto Mestre da Ordem de Serviço (Autopreenchimento Inteligente)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione uma OS ou equipamento já inspecionado para preencher Cliente, Marca, Modelo, Nº de Série e Diagnóstico com 1 clique.
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-80">
                <SelectNative
                  value={osSelecionada}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setOsSelecionada('');
                      return;
                    }
                    const ctx = ordensServico.find((o) => o.chave === val);
                    if (ctx) aplicarContextoOs(ctx);
                  }}
                >
                  <option value="">
                    {ordensServico.length > 0
                      ? '⚡ Selecionar OS / Equipamento em andamento...'
                      : 'Nenhuma OS anterior registrada ainda'}
                  </option>
                  {ordensServico.map((o) => (
                    <option key={o.chave} value={o.chave}>
                      {o.numeroOs !== 'S/N' ? `OS ${o.numeroOs}` : `S/N ${o.numeroSerie}`} —{' '}
                      {o.equipamento || 'Equipamento'} ({o.cliente || 'Cliente'})
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            {osContextoAtual && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-primary">
                      OS: {osContextoAtual.numeroOs}
                    </span>
                    <span>·</span>
                    <span className="font-medium">{osContextoAtual.cliente || '—'}</span>
                    <span>·</span>
                    <span className="text-muted-foreground">
                      {osContextoAtual.equipamento} {osContextoAtual.marca}{' '}
                      {osContextoAtual.modelo} (S/N: {osContextoAtual.numeroSerie || '—'})
                    </span>
                  </div>
                  {osContextoAtual.relatoCliente && (
                    <p className="text-[11px] text-muted-foreground">
                      <strong>Relato/Defeito:</strong> {osContextoAtual.relatoCliente}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      TAG_SPECS[osContextoAtual.tagColor].badgeClass,
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    Etiqueta {TAG_SPECS[osContextoAtual.tagColor].nomeCor}:{' '}
                    {TAG_SPECS[osContextoAtual.tagColor].labelStatus}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seletor de Submódulo (ex: REG-035 OLIDEF / TEB) */}
      {def.subtipos && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Submódulo por Fabricante / Marca</p>
                <p className="text-xs text-muted-foreground">
                  Selecione a marca do equipamento para carregar os itens específicos do checklist.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {def.subtipos.map((st) => (
                <Button
                  key={st.key}
                  type="button"
                  variant={subtipo === st.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSubtipo(st.key)}
                >
                  Marca {st.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Painel de Diagnóstico de Erros (Usuário + Desenvolvedor) */}
      {erroGeral && (
        <div className="space-y-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{erroGeral}</span>
            </div>
            <Badge variant="outline" className="border-rose-500/40 font-mono text-[10px]">
              <Bug className="mr-1 h-3 w-3" />
              Módulo: {def.tipo} ({def.reg ?? 'S/REG'})
            </Badge>
          </div>

          {Object.keys(erros).length > 0 && (
            <div className="rounded-lg border border-rose-500/25 bg-background/80 p-2.5">
              <p className="mb-1.5 font-medium text-foreground">
                Campos que precisam de correção ({Object.keys(erros).length}):
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {Object.entries(erros).map(([campoKey, msg]) => {
                  const campoDef = todosCamposVisiveis.find((c) => c.name === campoKey);
                  return (
                    <li key={campoKey} className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`field-wrap-${campoKey}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="text-left font-medium underline hover:text-rose-600"
                      >
                        {campoDef?.label ?? campoKey}:
                      </button>
                      <span className="text-muted-foreground">{msg}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Banner de Sucesso e Abertura Rápida de NC */}
      {sucessoMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">{sucessoMsg}</p>
              <p className="text-[11px] opacity-85">
                Os dados foram validados, gravados no banco de dados e indexados para auditoria RDC 665/22.
              </p>
            </div>
          </div>
          {ncSugerida && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleAbrirNcRapida}
              disabled={createNc.isPending}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {createNc.isPending ? 'Abrindo NC...' : 'Abrir Não Conformidade (NC) automática'}
            </Button>
          )}
        </div>
      )}

      {/* Formulário Gamificado por Seções */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {secoes.map((secao, idx) => {
          const camposVisiveis = secao.campos.filter((c) => campoVisivel(c, dados));
          if (camposVisiveis.length === 0) return null;
          const temCnc = camposVisiveis.some((c) => c.type === 'cnc');

          const obrigatoriosSecao = camposVisiveis.filter(
            (c) => c.required && c.type !== 'checkbox',
          );
          const preenchidosSecao = obrigatoriosSecao.filter((c) =>
            campoEstaPreenchido(c, dados[c.name]),
          ).length;
          const secaoCompleta =
            obrigatoriosSecao.length > 0 && preenchidosSecao === obrigatoriosSecao.length;

          return (
            <Card
              key={secao.titulo}
              className={cn(
                'transition-colors',
                secaoCompleta && 'border-emerald-500/35',
              )}
            >
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      secaoCompleta
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary/15 text-primary',
                    )}
                  >
                    {secaoCompleta ? '✓' : idx + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{secao.titulo}</CardTitle>
                      <Badge
                        variant={secaoCompleta ? 'success' : 'outline'}
                        className="text-[10px]"
                      >
                        {secaoCompleta
                          ? 'Etapa completa'
                          : `${preenchidosSecao}/${obrigatoriosSecao.length} preenchidos`}
                      </Badge>
                    </div>
                    {secao.descricao && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {secao.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {temCnc && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => preencherTodosConformes(camposVisiveis, secao.titulo)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Marcar vazios como Conforme (C)
                  </Button>
                )}
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2">
                {camposVisiveis.map((campo) => {
                  const isFullWidth =
                    campo.type === 'textarea' ||
                    campo.type === 'cnc' ||
                    campo.type === 'checkbox';
                  const erroCampo = erros[campo.name];
                  const preenchido = campoEstaPreenchido(campo, dados[campo.name]);
                  const placeholderTexto = obterPlaceholderInteligente(campo);

                  return (
                    <div
                      key={campo.name}
                      id={`field-wrap-${campo.name}`}
                      className={cn(
                        'space-y-1.5',
                        isFullWidth && 'sm:col-span-2',
                      )}
                    >
                      {campo.type === 'cnc' ? (
                        <div
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors',
                            erroCampo
                              ? 'border-rose-500/50 bg-rose-500/5'
                              : preenchido
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-border bg-muted/20',
                          )}
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {campo.label}
                              {campo.required && (
                                <span className="ml-1 text-destructive">*</span>
                              )}
                            </span>
                            {erroCampo && (
                              <p className="text-[11px] font-medium text-destructive">
                                {erroCampo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {OPCOES_CNC.map((op) => {
                              const selecionado = dados[campo.name] === op.value;
                              return (
                                <button
                                  key={op.value}
                                  type="button"
                                  onClick={() => atualizarCampo(campo.name, op.value)}
                                  className={cn(
                                    'rounded-md border px-2.5 py-1 text-xs font-semibold transition-all',
                                    selecionado &&
                                      op.value === 'C' &&
                                      'border-emerald-600 bg-emerald-600 text-white shadow-sm',
                                    selecionado &&
                                      op.value === 'NC' &&
                                      'border-rose-600 bg-rose-600 text-white shadow-sm',
                                    selecionado &&
                                      op.value === 'NA' &&
                                      'border-slate-600 bg-slate-600 text-white shadow-sm',
                                    !selecionado &&
                                      'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                                  )}
                                >
                                  {op.value} · {op.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : campo.type === 'checkbox' ? (
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 p-3.5 transition-colors hover:border-primary/40">
                          <input
                            type="checkbox"
                            checked={Boolean(dados[campo.name])}
                            onChange={(e) => atualizarCampo(campo.name, e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {campo.label}
                            </span>
                            {campo.hint && (
                              <p className="text-[11px] text-muted-foreground">
                                {campo.hint}
                              </p>
                            )}
                          </div>
                        </label>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={campo.name} className="text-xs">
                              {campo.label}
                              {campo.unit ? ` (${campo.unit})` : ''}
                              {campo.required && (
                                <span className="ml-1 text-destructive">*</span>
                              )}
                            </Label>
                            {preenchido && !erroCampo && (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                ✓ Preenchido
                              </span>
                            )}
                          </div>

                          {campo.type === 'textarea' ? (
                            <Textarea
                              id={campo.name}
                              rows={3}
                              value={String(dados[campo.name] ?? '')}
                              placeholder={placeholderTexto}
                              onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                              className={cn(erroCampo && 'border-rose-500')}
                            />
                          ) : campo.type === 'select' ? (
                            <SelectNative
                              id={campo.name}
                              value={String(dados[campo.name] ?? '')}
                              onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                              className={cn(erroCampo && 'border-rose-500')}
                            >
                              <option value="">Selecione uma opção...</option>
                              {(campo.options ?? []).map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </SelectNative>
                          ) : (
                            <Input
                              id={campo.name}
                              type={campo.type}
                              step={campo.step}
                              value={String(dados[campo.name] ?? '')}
                              placeholder={placeholderTexto}
                              onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                              className={cn(erroCampo && 'border-rose-500')}
                            />
                          )}

                          {campo.hint && (
                            <p className="text-[11px] text-muted-foreground">
                              {campo.hint}
                            </p>
                          )}
                          {erroCampo && (
                            <p className="text-[11px] font-medium text-destructive">
                              {erroCampo}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <img
              src="/logo-estatico.jpg"
              alt="LINKMED"
              className="h-7 w-9 rounded border border-border object-contain bg-white p-0.5"
            />
            <span>
              Ao salvar, o registro recebe carimbo de tempo e assinatura de auditoria RDC 665/22.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDados(criarValoresIniciais(def, subtipo, user?.nomeCompleto));
                setErros({});
                setErroGeral(null);
                toast.info('Campos restaurados para o estado inicial.');
              }}
            >
              Limpar campos
            </Button>
            <Button type="submit" disabled={createRecord.isPending} className="min-w-44">
              {createRecord.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando e salvando...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Registrar Formulário
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Histórico de Registros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Registros anteriores ({recordsData?.records.length ?? 0})
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Setores: {def.setores.map((s) => SETOR_FORM_LABEL[s]).join(' · ')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !recordsData?.records.length ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhum registro salvo para este formulário até o momento.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recordsData.records.map((rec) => {
                const d = rec.dados ?? {};
                const resumoPrincipal =
                  String(
                    d.equipamento ??
                      d.bancada ??
                      d.colaborador ??
                      d.termohigrometro ??
                      '',
                  ) || def.titulo;
                const identificacaoExtra = [
                  d.numero_os ? `OS ${d.numero_os}` : null,
                  d.cliente ? String(d.cliente) : null,
                  d.numero_serie ? `S/N ${d.numero_serie}` : null,
                  d.periodo ? `Período: ${d.periodo}` : null,
                  d.temperatura_atual !== undefined
                    ? `${d.temperatura_atual} °C / ${d.umidade_atual}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div
                    key={rec.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {resumoPrincipal}
                        </span>
                        {rec.subtipo && (
                          <Badge variant="outline" className="uppercase">
                            {rec.subtipo}
                          </Badge>
                        )}
                        <Badge
                          variant={rec.status === 'conforme' ? 'success' : 'destructive'}
                        >
                          {STATUS_REGISTRO_LABEL[rec.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Data ref.:{' '}
                        <strong>
                          {rec.dataRef.split('-').reverse().join('/')}
                        </strong>
                        {identificacaoExtra ? ` · ${identificacaoExtra}` : ''}
                        {rec.criadoPorNome ? ` · por ${rec.criadoPorNome}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRegistroDetalhe(rec)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver detalhes
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização de Registro */}
      <Dialog
        open={Boolean(registroDetalhe)}
        onOpenChange={(open) => !open && setRegistroDetalhe(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {registroDetalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {def.reg && <Badge className="font-mono">{def.reg}</Badge>}
                  {def.titulo}
                </DialogTitle>
                <DialogDescription>
                  Registrado em{' '}
                  {registroDetalhe.dataRef.split('-').reverse().join('/')} por{' '}
                  {registroDetalhe.criadoPorNome ?? 'Usuário'} ·{' '}
                  {STATUS_REGISTRO_LABEL[registroDetalhe.status]}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2 sm:grid-cols-2">
                {Object.entries(registroDetalhe.dados).map(([k, v]) => {
                  const campoDef = getCampos(def, registroDetalhe.subtipo).find(
                    (c) => c.name === k,
                  );
                  return (
                    <div
                      key={k}
                      className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs"
                    >
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {campoDef?.label ?? k}
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v)}
                        {campoDef?.unit ? ` ${campoDef.unit}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRegistroDetalhe(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
