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
  FileText,
  Layers,
  Loader2,
  Lock,
  PenTool,
  Plus,
  PlusCircle,
  Printer,
  ShieldAlert,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  EquipmentLabelPrintDialog,
  type DadosEtiquetaEquipamento,
} from '@/components/operacional/equipment-label-print-dialog';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
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
import { SignaturePadDialog } from '@/components/ui/signature-pad-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { FormRecord } from '@/core/domain/entities/operacional';
import { agoraBR, diffDias } from '@/core/domain/forms/alerts';
import {
  ALERTA_CALIBRACAO_DIAS,
  avaliarConformidade,
  calcularProximaCalibracao,
  campoVisivel,
  canEditGovernance,
  DEFAULT_HOJE,
  getCampos,
  getFormDef,
  getSecoes,
  INSTRUMENTOS_PADRAO_REG015,
  obterFormularioItem5PorMarca,
  OPCOES_CNC,
  SETOR_FORM_LABEL,
  STATUS_REGISTRO_LABEL,
  verificarBloqueioItem5Reg016,
  type FieldDef,
  type FormDef,
  type InstrumentoMedicaoReg015,
} from '@/core/domain/forms/definitions';
import {
  aggregateServiceOrders,
  hydrateFormFieldsFromOs,
  normalizarNumeroOs,
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

const CAMPOS_COM_ASSINATURA = new Set([
  'assinatura_tecnico',
  'responsavel',
  'responsavel_liberacao',
  'responsavel_monitoramento',
  'supervisor',
  'supervisor_tecnico',
  'tecnico',
  'tecnico_responsavel',
  'elaborado_por',
  'revisado_por',
  'aprovado_por',
]);

function obterPlaceholderInteligente(campo: FieldDef): string {
  if (campo.placeholder) return campo.placeholder;
  const n = campo.name.toLowerCase();
  if (n.includes('numero_os') || n === 'os') return 'Ex.: OS-2026-0145';
  if (n.includes('cliente')) return 'Ex.: Hospital Santa Casa / Clínica São Lucas';
  if (n.includes('equipamento')) return 'Ex.: Incubadora Neonatal / Monitor Multiparâmetro';
  if (n.includes('marca_modelo')) return 'Ex.: OLIDEF / SCT-8';
  if (n.includes('marca')) return 'Ex.: Cardios, TEB, OLIDEF...';
  if (n.includes('modelo')) return 'Ex.: SCT-8 / ECG-12';
  if (n.includes('numero_serie') || n.includes('serie')) return 'Ex.: SN-2026-8849';
  if (n.includes('patrimonio') || n.includes('tag')) return 'Ex.: PAT-00412';
  if (n.includes('nota_fiscal') || n.includes('nf')) return 'Ex.: NF-e 000.148.920';
  if (n.includes('acessorio')) return 'Ex.: Cabo de força, sensor de temperatura de pele, mangueira...';
  if (n.includes('responsavel') || n.includes('tecnico') || n.includes('colaborador'))
    return 'Ex.: Nome completo do responsável ou assinatura LGPD';
  if (n.includes('temperatura')) return 'Ex.: 23.5';
  if (n.includes('umidade')) return 'Ex.: 54';
  if (n.includes('certificado')) return 'Ex.: 12405/2025';
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
  if (def.tipo === 'validade-calibracao' && valores.data_calibracao) {
    valores.validade = calcularProximaCalibracao(String(valores.data_calibracao), 12);
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
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);
  const [etiquetaPrintDados, setEtiquetaPrintDados] =
    React.useState<DadosEtiquetaEquipamento | null>(null);
  const [ncSugerida, setNcSugerida] = React.useState<{
    titulo: string;
    descricao: string;
  } | null>(null);

  // Estado local para certificados anexados na tabela REG-015
  const [certificadosReg015, setCertificadosReg015] = React.useState<
    Record<string, { nome: string; dataUrl: string }>
  >({});

  // Estado do modal de Assinatura Eletrônica LGPD na tela
  const [assinaturaAlvo, setAssinaturaAlvo] = React.useState<{
    open: boolean;
    campoName: string;
    titulo: string;
    nomePadrao: string;
    funcaoPadrao: string;
  }>({
    open: false,
    campoName: '',
    titulo: '',
    nomePadrao: '',
    funcaoPadrao: '',
  });

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

  // Lista consolidada de instrumentos do REG-015 (17 da planilha LinkMed + novos incluídos)
  const instrumentosReg015 = React.useMemo<InstrumentoMedicaoReg015[]>(() => {
    if (def?.tipo !== 'validade-calibracao') return [];
    const base = [...INSTRUMENTOS_PADRAO_REG015];
    const extras = (recordsData?.records ?? []).map((rec, i): InstrumentoMedicaoReg015 => {
      const d = rec.dados ?? {};
      const marcaModelo = String(d.marca_modelo ?? '').split('/');
      return {
        id: rec.id,
        numeroItem: base.length + i + 1,
        equipamento: String(d.equipamento ?? 'Instrumento'),
        localizacao:
          d.localizacao === 'Almoxarifado' ? 'Almoxarifado' : 'Assistência Técnica',
        marca: (marcaModelo[0] ?? String(d.marca_modelo ?? '—')).trim(),
        modelo: (marcaModelo[1] ?? '—').trim(),
        numeroSerie: String(d.numero_serie ?? '—'),
        certificado: String(d.certificado ?? '—'),
        laboratorio: String(d.laboratorio ?? 'Laboratório RBC'),
        dataCalibracao: String(d.data_calibracao ?? rec.dataRef),
        frequenciaMeses: Number(d.frequencia_meses ?? 12),
        validade: String(d.validade ?? ''),
        certificadoPdfNome: d.certificado_pdf_nome
          ? String(d.certificado_pdf_nome)
          : null,
      };
    });
    return [...base, ...extras];
  }, [def?.tipo, recordsData?.records]);

  const aplicarContextoOs = React.useCallback(
    (osCtx: ServiceOrderContext) => {
      if (!def) return;
      const herdados = hydrateFormFieldsFromOs(def.tipo, osCtx);
      setOsSelecionada(osCtx.chave);
      setDados((prev) => {
        const next: Record<string, unknown> = {
          ...prev,
          ...herdados,
          marca: osCtx.marca || prev.marca,
          modelo: osCtx.modelo || prev.modelo,
          etiqueta_atual: osCtx.tagColor,
        };
        if (def.tipo === 'etapas-manutencao' && osCtx.marca) {
          const m = osCtx.marca.toUpperCase();
          if (m.includes('CARDIOS')) next.item5_marca = 'Cardios';
          else if (m.includes('TEB')) next.item5_marca = 'TEB';
          else if (m.includes('OLIDEF')) next.item5_marca = 'OLIDEF';
        }
        return next;
      });
      if (def.subtipos && osCtx.marca) {
        const m = osCtx.marca.toLowerCase();
        if (m.includes('olidef')) setSubtipo('olidef');
        else if (m.includes('teb')) setSubtipo('teb');
        else if (m.includes('cardios')) setSubtipo('cardios');
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

  const osContextoAtual = ordensServico.find((o) => o.chave === osSelecionada) ?? null;

  // Verificação em tempo real de OS duplicada no REG-022 (Seção 7.4 / T11)
  const osDuplicadaNoReg022 = React.useMemo(() => {
    if (def?.tipo !== 'inspecao-recebimento') return null;
    const digitado = normalizarNumeroOs(String(dados.numero_os ?? ''));
    if (!digitado) return null;
    return (
      ordensServico.find(
        (o) => normalizarNumeroOs(o.numeroOs) === digitado && o.numeroOs !== 'S/N',
      ) ?? null
    );
  }, [def?.tipo, dados.numero_os, ordensServico]);

  // Verificação de bloqueio do Item 5 no REG-016 (Seção 3.2)
  const bloqueioItem5 = React.useMemo(() => {
    if (def?.tipo !== 'etapas-manutencao') return { bloqueado: false, motivo: null };
    return verificarBloqueioItem5Reg016({
      etiquetaAtual: osContextoAtual?.tagColor ?? String(dados.etiqueta_atual ?? ''),
      orcamentoReprovado: dados.orcamento_reprovado,
    });
  }, [def?.tipo, osContextoAtual?.tagColor, dados.etiqueta_atual, dados.orcamento_reprovado]);

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
  const podeEditarGovernanca = canEditGovernance(user?.perfil);

  // Verifica se a análise do equipamento está concluída (Etiqueta CINZA) para liberar impressão da Etiqueta Física (Seção 5.4)
  const analiseConcluidaParaEtiqueta =
    def.tipo === 'etapas-manutencao' &&
    (dados.etiqueta_cinza === 'C' ||
      Boolean(
        osContextoAtual &&
          ['GRAY', 'ORANGE', 'BROWN', 'YELLOW', 'BLUE', 'BLACK', 'RED', 'GREEN'].includes(
            osContextoAtual.tagColor,
          ),
      ));

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
    const campoDef = def ? getCampos(def, subtipo).find((c) => c.name === name) : undefined;
    if (campoDef?.governanceOnly && !podeEditarGovernanca) {
      toast.error('Acesso restrito', {
        description:
          'Apenas a Qualidade e o Diretor podem alterar quem elaborou, revisou e aprovou os documentos.',
      });
      return;
    }

    if (def?.tipo === 'etapas-manutencao' && name.startsWith('item5_') && bloqueioItem5.bloqueado) {
      toast.error('Item 5 Bloqueado (Etiqueta VERMELHA)', {
        description:
          bloqueioItem5.motivo ??
          'Não é permitido preencher o Item 5 quando o orçamento foi reprovado.',
      });
      return;
    }

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
      if (
        def?.tipo === 'validade-calibracao' &&
        (name === 'data_calibracao' || name === 'frequencia_meses')
      ) {
        const dtCal = String(next.data_calibracao ?? '');
        const freq = Number(next.frequencia_meses ?? 12);
        const prox = calcularProximaCalibracao(dtCal, freq > 0 ? freq : 12);
        if (prox) next.validade = prox;
      }
      if (def?.tipo === 'etapas-manutencao' && name === 'orcamento_reprovado' && value === 'C') {
        // Se marcar orçamento reprovado (VERMELHA), limpa o Item 5
        delete next.item5_marca;
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
          // No REG 016, não marca automaticamente "orcamento_reprovado" nem "falta_itens_estoque"
          if (c.name === 'orcamento_reprovado' || c.name === 'falta_itens_estoque') continue;
          next[c.name] = 'C';
        }
      }
      return next;
    });
    toast.success(`Itens de "${tituloSecao}" marcados como Conforme (C)!`);
  }

  function handleUploadCertificadoReg015(
    inst: InstrumentoMedicaoReg015,
    file: File | undefined,
  ) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setCertificadosReg015((prev) => ({
        ...prev,
        [inst.id]: { nome: file.name, dataUrl },
      }));
      toast.success(`Certificado "${file.name}" anexado ao equipamento ${inst.equipamento}!`);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!def) return;
    setErroGeral(null);
    setSucessoMsg(null);
    setErros({});

    if (osDuplicadaNoReg022) {
      const msgDup = `Já existe uma OS com este número (${osDuplicadaNoReg022.numeroOs}). Não são permitidas OS duplicadas.`;
      setErroGeral(msgDup);
      setErros({ numero_os: msgDup });
      toast.error('Número de OS duplicado (Seção 7.4)', {
        description: msgDup,
      });
      return;
    }

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
        description: `Protocolo #${res.record.id.slice(0, 8)} registrado com sucesso e vinculado à Trilha de Auditoria.`,
      });

      // Seção 5.4: se no REG 016 concluiu a análise (etiqueta cinza), abre opção de imprimir etiqueta física
      if (def.tipo === 'etapas-manutencao' && dados.etiqueta_cinza === 'C') {
        setEtiquetaPrintDados({
          numeroOs: String(dados.numero_os ?? osContextoAtual?.numeroOs ?? 'S/N'),
          cliente: String(dados.cliente ?? osContextoAtual?.cliente ?? '—'),
          equipamento: String(dados.equipamento ?? osContextoAtual?.equipamento ?? '—'),
          marca: String(dados.marca ?? osContextoAtual?.marca ?? '—'),
          modelo: String(dados.modelo ?? osContextoAtual?.modelo ?? '—'),
          numeroSerie: String(dados.numero_serie ?? osContextoAtual?.numeroSerie ?? '—'),
          dataAnalise: agoraBR().data,
          statusEtiqueta: 'CINZA — Análise Completa',
        });
      }

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
    toast.success('NC (REG-038 / REG-047) aberta com sucesso!');
  }

  const hojeIso = agoraBR().data;

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
            {def.pastaPop && (
              <Badge variant="outline" className="font-mono text-xs">
                Pasta {def.pastaPop}
              </Badge>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{def.titulo}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{def.descricao}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {analiseConcluidaParaEtiqueta && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setEtiquetaPrintDados({
                  numeroOs: String(dados.numero_os || osContextoAtual?.numeroOs || 'OS-ATUAL'),
                  cliente: String(dados.cliente || osContextoAtual?.cliente || '—'),
                  equipamento: String(dados.equipamento || osContextoAtual?.equipamento || '—'),
                  marca: String(dados.marca || osContextoAtual?.marca || '—'),
                  modelo: String(dados.modelo || osContextoAtual?.modelo || '—'),
                  numeroSerie: String(
                    dados.numero_serie || osContextoAtual?.numeroSerie || '—',
                  ),
                  dataAnalise: hojeIso,
                  statusEtiqueta: 'CINZA — Análise Completa',
                })
              }
              className="gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Etiqueta de Identificação (Seção 5.4)
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Avaliação em tempo real:</span>
          <Badge variant={statusPrevia === 'conforme' ? 'success' : 'destructive'}>
            {STATUS_REGISTRO_LABEL[statusPrevia]}
          </Badge>
        </div>
      </div>

      {/* Cabeçalho Oficial de Governança: Elaboração, Revisão e Aprovação (Seção 5.3) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
            Governança Documental e Assinaturas (Seção 5.3 · RDC 665/22)
          </span>
          {podeEditarGovernanca ? (
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary text-[10px]">
              <UserCheck className="h-3 w-3" />
              Edição e Assinatura permitidas (Qualidade / Diretor)
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              Bloqueado para edição · Apenas Qualidade e Diretor
            </Badge>
          )}
        </div>
        <div className="grid gap-2.5 rounded-xl border border-border/80 bg-card p-3.5 text-xs shadow-2xs sm:grid-cols-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Elaborado por
                </p>
                <p className="truncate font-semibold text-foreground">
                  {String(dados.elaborado_por || def.responsaveis.elaboradoPor)}
                </p>
              </div>
            </div>
            {podeEditarGovernanca && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setAssinaturaAlvo({
                    open: true,
                    campoName: 'elaborado_por',
                    titulo: `Assinatura de Elaboração (${def.reg ?? def.titulo})`,
                    nomePadrao: String(dados.elaborado_por || def.responsaveis.elaboradoPor),
                    funcaoPadrao: 'Elaborador',
                  })
                }
                className="h-7 gap-1 px-2 text-[10px] text-primary"
              >
                <PenTool className="h-3 w-3" />
                Assinar
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Revisado por
                </p>
                <p className="truncate font-semibold text-foreground">
                  {String(dados.revisado_por || def.responsaveis.revisadoPor)}
                </p>
              </div>
            </div>
            {podeEditarGovernanca && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setAssinaturaAlvo({
                    open: true,
                    campoName: 'revisado_por',
                    titulo: `Assinatura de Revisão (${def.reg ?? def.titulo})`,
                    nomePadrao: String(dados.revisado_por || def.responsaveis.revisadoPor),
                    funcaoPadrao: 'Revisor Técnico',
                  })
                }
                className="h-7 gap-1 px-2 text-[10px] text-primary"
              >
                <PenTool className="h-3 w-3" />
                Assinar
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Aprovado por
                </p>
                <p className="truncate font-semibold text-foreground">
                  {String(dados.aprovado_por || def.responsaveis.aprovadoPor)}
                </p>
              </div>
            </div>
            {podeEditarGovernanca && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setAssinaturaAlvo({
                    open: true,
                    campoName: 'aprovado_por',
                    titulo: `Assinatura de Aprovação (${def.reg ?? def.titulo})`,
                    nomePadrao: String(dados.aprovado_por || def.responsaveis.aprovadoPor),
                    funcaoPadrao: 'Aprovador / Diretoria',
                  })
                }
                className="h-7 gap-1 px-2 text-[10px] text-primary"
              >
                <PenTool className="h-3 w-3" />
                Assinar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SEÇÃO 3.1: PLANILHA DE INSTRUMENTOS DE MEDIÇÃO CADASTRADOS (REG-015)   */}
      {/* ===================================================================== */}
      {def.tipo === 'validade-calibracao' && (
        <Card className="border-primary/30 bg-card shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono">
                  REG-015 · Pasta POP 011
                </Badge>
                <CardTitle className="text-base">
                  Equipamentos e Instrumentos de Medição Cadastrados ({instrumentosReg015.length})
                </CardTitle>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Seção 3.1: Ao abrir o REG 015, todos os instrumentos da LinkMed e suas validades já ficam visíveis. Faça upload do Certificado de Calibração (PDF) de cada instrumento ou inclua novos equipamentos abaixo.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const el = document.getElementById('form-novo-equipamento-reg015');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Incluir Novo Equipamento
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/60 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5 font-semibold">Nº</th>
                    <th className="p-2.5 font-semibold">Instrumento / Equipamento</th>
                    <th className="p-2.5 font-semibold">Localização</th>
                    <th className="p-2.5 font-semibold">Marca / Modelo</th>
                    <th className="p-2.5 font-semibold">Nº Série</th>
                    <th className="p-2.5 font-semibold">Nº Certificado</th>
                    <th className="p-2.5 font-semibold">Data Calibração</th>
                    <th className="p-2.5 font-semibold">Freq.</th>
                    <th className="p-2.5 font-semibold">Próxima Calibração</th>
                    <th className="p-2.5 font-semibold">Status (60d)</th>
                    <th className="p-2.5 font-semibold">Certificado PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {instrumentosReg015.map((inst) => {
                    const diasRestantes = inst.validade
                      ? diffDias(hojeIso, inst.validade)
                      : 999;
                    const vencida = diasRestantes < 0;
                    const venceEm60d =
                      !vencida && diasRestantes <= ALERTA_CALIBRACAO_DIAS;
                    const certUpload = certificadosReg015[inst.id];
                    const nomeCertificado =
                      certUpload?.nome ?? inst.certificadoPdfNome ?? null;

                    return (
                      <tr key={inst.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-mono font-bold">{inst.numeroItem}</td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {inst.equipamento}
                        </td>
                        <td className="p-2.5">{inst.localizacao}</td>
                        <td className="p-2.5">
                          {inst.marca} · <span className="font-mono">{inst.modelo}</span>
                        </td>
                        <td className="p-2.5 font-mono">{inst.numeroSerie}</td>
                        <td className="p-2.5 font-mono font-semibold text-primary">
                          {inst.certificado}
                        </td>
                        <td className="p-2.5 font-mono">
                          {inst.dataCalibracao.split('-').reverse().join('/')}
                        </td>
                        <td className="p-2.5 text-center">{inst.frequenciaMeses}m</td>
                        <td className="p-2.5 font-mono font-bold">
                          {inst.validade ? inst.validade.split('-').reverse().join('/') : '—'}
                        </td>
                        <td className="p-2.5">
                          {vencida ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Vencida ({Math.abs(diasRestantes)}d)
                            </Badge>
                          ) : venceEm60d ? (
                            <Badge variant="warning" className="text-[10px]">
                              Alerta: {diasRestantes}d
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              Vigente ({diasRestantes}d)
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/15">
                              <Upload className="h-3 w-3" />
                              {nomeCertificado ? 'Trocar PDF' : 'Upload PDF'}
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleUploadCertificadoReg015(
                                    inst,
                                    e.target.files?.[0],
                                  )
                                }
                              />
                            </label>
                            {nomeCertificado && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (certUpload?.dataUrl) {
                                    const w = window.open();
                                    if (w) {
                                      w.document.write(
                                        `<iframe src="${certUpload.dataUrl}" style="width:100%;height:100vh;border:0;"></iframe>`,
                                      );
                                    }
                                  } else {
                                    toast.info(`Certificado: ${nomeCertificado}`, {
                                      description: `Certificado nº ${inst.certificado} (${inst.laboratorio}) vinculado ao instrumento ${inst.equipamento}.`,
                                    });
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                                title={nomeCertificado}
                              >
                                <FileText className="h-3 w-3" />
                                Ver PDF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra Gamificada de Progresso do Preenchimento */}
      <Card
        id="form-novo-equipamento-reg015"
        className="sticky top-16 z-20 border-primary/25 bg-card/95 shadow-sm backdrop-blur-md"
      >
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
                Preencha os itens sinalizados com <span className="text-destructive">*</span>.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-56">
            <Progress value={progressoPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Alerta em Tempo Real de OS Duplicada no REG-022 (Seção 7.4 / T11) */}
      {osDuplicadaNoReg022 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">
                Já existe uma OS com este número ({osDuplicadaNoReg022.numeroOs})!
              </p>
              <p className="text-[11px]">
                Seção 7.4: Não é permitido cadastrar mais de uma OS com o mesmo número (inclusive canceladas ou finalizadas).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDossierOs(osDuplicadaNoReg022.numeroOs)}
              className="border-rose-500/40 bg-background text-rose-700"
            >
              Abrir Dossiê da OS {osDuplicadaNoReg022.numeroOs}
            </Button>
            <Link href={`/equipamentos?os=${encodeURIComponent(osDuplicadaNoReg022.numeroOs)}`}>
              <Button type="button" size="sm" variant="destructive">
                Ir para OS Existente
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Widget Contexto Mestre da OS (Herança Automática de Dados do REG 022 para REG 016 / REG 034) */}
      {FORMS_COM_OS.has(def.tipo) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Reaproveitamento Automático de Dados do REG 022 (Seção 3.3)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione uma OS cadastrada pelo ADM no REG 022 para preencher Cliente, Equipamento, Marca, Modelo e Nº de Série sem redigitação.
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
                    <button
                      type="button"
                      onClick={() => setDossierOs(osContextoAtual.numeroOs)}
                      className="font-mono font-semibold text-primary underline hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      OS: {osContextoAtual.numeroOs}
                    </button>
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
                <div className="flex flex-wrap items-center gap-2">
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

      {/* Seletor de Submódulo (ex: REG-035 OLIDEF / TEB / Cardios) */}
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
            <div className="flex flex-wrap items-center gap-2">
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

      {/* Painel de Diagnóstico de Erros */}
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

      {/* Banner de Sucesso */}
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
          const isSecaoItem5Reg016 =
            def.tipo === 'etapas-manutencao' && secao.titulo.startsWith('5. Item 5');
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

          const formItem5Ativo = isSecaoItem5Reg016
            ? obterFormularioItem5PorMarca(String(dados.item5_marca ?? ''))
            : null;

          return (
            <Card
              key={secao.titulo}
              className={cn(
                'transition-colors',
                secaoCompleta && 'border-emerald-500/35',
                isSecaoItem5Reg016 && bloqueioItem5.bloqueado && 'border-rose-500/40 bg-rose-500/5',
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
                      {formItem5Ativo && !bloqueioItem5.bloqueado && (
                        <Badge variant="default" className="font-mono text-[10px]">
                          Ativo: {formItem5Ativo}
                        </Badge>
                      )}
                      {isSecaoItem5Reg016 && bloqueioItem5.bloqueado ? (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <Lock className="h-3 w-3" />
                          BLOQUEADO (Etiqueta VERMELHA)
                        </Badge>
                      ) : (
                        <Badge
                          variant={secaoCompleta ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {secaoCompleta
                            ? 'Etapa completa'
                            : `${preenchidosSecao}/${obrigatoriosSecao.length} preenchidos`}
                        </Badge>
                      )}
                    </div>
                    {secao.descricao && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {secao.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {temCnc && !(isSecaoItem5Reg016 && bloqueioItem5.bloqueado) && (
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

              {isSecaoItem5Reg016 && bloqueioItem5.bloqueado ? (
                <CardContent>
                  <div className="flex items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-800 dark:text-rose-200">
                    <Lock className="h-5 w-5 shrink-0 text-rose-600" />
                    <div>
                      <p className="font-bold">
                        Item 5 (REG 009 / REG 035) Bloqueado — Regra da Seção 3.2
                      </p>
                      <p className="mt-0.5 text-[11px]">
                        {bloqueioItem5.motivo}
                      </p>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {camposVisiveis.map((campo) => {
                    const isFullWidth =
                      campo.type === 'textarea' ||
                      campo.type === 'cnc' ||
                      campo.type === 'checkbox';
                    const erroCampo = erros[campo.name];
                    const preenchido = campoEstaPreenchido(campo, dados[campo.name]);
                    const placeholderTexto = obterPlaceholderInteligente(campo);
                    const suportaAssinatura =
                      CAMPOS_COM_ASSINATURA.has(campo.name) &&
                      (!campo.governanceOnly || podeEditarGovernanca);

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
                              <div className="flex items-center gap-2">
                                {suportaAssinatura && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAssinaturaAlvo({
                                        open: true,
                                        campoName: campo.name,
                                        titulo: `${campo.label} (${def.reg ?? def.titulo})`,
                                        nomePadrao: String(
                                          dados[campo.name] || user?.nomeCompleto || '',
                                        ),
                                        funcaoPadrao:
                                          user?.perfil.toUpperCase() || 'Colaborador',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                  >
                                    <PenTool className="h-3 w-3" />
                                    Assinar na tela (LGPD)
                                  </button>
                                )}
                                {preenchido && !erroCampo && (
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    ✓ Preenchido
                                  </span>
                                )}
                              </div>
                            </div>

                            {campo.type === 'textarea' ? (
                              <Textarea
                                id={campo.name}
                                rows={3}
                                value={String(dados[campo.name] ?? '')}
                                placeholder={placeholderTexto}
                                disabled={campo.governanceOnly && !podeEditarGovernanca}
                                readOnly={campo.governanceOnly && !podeEditarGovernanca}
                                onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                                className={cn(
                                  erroCampo && 'border-rose-500',
                                  campo.governanceOnly &&
                                    !podeEditarGovernanca &&
                                    'bg-muted/60 cursor-not-allowed text-muted-foreground font-medium',
                                )}
                              />
                            ) : campo.type === 'select' ? (
                              <SelectNative
                                id={campo.name}
                                value={String(dados[campo.name] ?? '')}
                                disabled={campo.governanceOnly && !podeEditarGovernanca}
                                onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                                className={cn(
                                  erroCampo && 'border-rose-500',
                                  campo.governanceOnly &&
                                    !podeEditarGovernanca &&
                                    'bg-muted/60 cursor-not-allowed text-muted-foreground font-medium',
                                )}
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
                                disabled={campo.governanceOnly && !podeEditarGovernanca}
                                readOnly={campo.governanceOnly && !podeEditarGovernanca}
                                onChange={(e) => atualizarCampo(campo.name, e.target.value)}
                                className={cn(
                                  erroCampo && 'border-rose-500',
                                  campo.governanceOnly &&
                                    !podeEditarGovernanca &&
                                    'bg-muted/60 cursor-not-allowed text-muted-foreground font-medium',
                                )}
                              />
                            )}

                            {campo.governanceOnly && !podeEditarGovernanca && (
                              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Bloqueado: Apenas a Qualidade e o Diretor podem alterar este responsável.
                              </p>
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
              )}
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
              Ao salvar, o registro recebe carimbo de tempo e assinatura de auditoria RDC 665/22 & LGPD.
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

      {/* Dossiê Completo da OS */}
      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />

      {/* Modal de Impressão da Etiqueta Física do Equipamento (Seção 5.4) */}
      <EquipmentLabelPrintDialog
        open={Boolean(etiquetaPrintDados)}
        onOpenChange={(open) => !open && setEtiquetaPrintDados(null)}
        dados={etiquetaPrintDados}
      />

      {/* Modal de Assinatura Eletrônica LGPD na Tela (Seção 5.3) */}
      <SignaturePadDialog
        open={assinaturaAlvo.open}
        onOpenChange={(open) => setAssinaturaAlvo((prev) => ({ ...prev, open }))}
        documentoCodigo={def.reg ?? def.tipo}
        documentoTitulo={assinaturaAlvo.titulo}
        signatarioNomePadrao={assinaturaAlvo.nomePadrao}
        signatarioIdPadrao={user?.id}
        funcaoPadrao={assinaturaAlvo.funcaoPadrao}
        onConfirm={(reg) => atualizarCampo(assinaturaAlvo.campoName, reg.resumoFormatado)}
      />
    </div>
  );
}
