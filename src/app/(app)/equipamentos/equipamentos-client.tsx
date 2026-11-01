'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  History,
  PlayCircle,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Tag,
  Wrench,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EquipmentLabelPrintDialog,
  type DadosEtiquetaEquipamento,
} from '@/components/operacional/equipment-label-print-dialog';
import { OsDossierDialog } from '@/components/operacional/os-dossier-dialog';
import {
  aggregateServiceOrders,
  admMarcarEtiquetaAmarelaOrcamento,
  admMarcarEtiquetaBrancaNoReg016,
  admResponderOrcamentoAprovado,
  almoxarifadoDecidirPecas,
  almoxarifadoRetomarOsDeAguardandoPecas,
  atFinalizarServicoComEtiquetaVerde,
  atMarcarEtiquetaCinzaAnaliseCompleta,
  atMarcarEtiquetaVioleta,
  atPreencherItem5Reg016,
  atRegistrarReg034,
  atResponderEquipamentoEnviadoFabrica,
  atResponderPerguntaEnvioFabrica,
  atResponderPerguntaGarantia,
  cancelarOs,
  confirmarNotificacaoSetor,
  criarOsViaReg022,
  OPCOES_TRANSPORTE_FABRICA,
  reabrirOs,
  TAG_SPECS,
  TAG_SPECS_LIST,
  type OrdemServicoFluxoState,
  type TagColor,
  type TipoTransporteFabrica,
} from '@/core/domain/forms/os-workflow';
import { useFormsOverview } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

const ATOR_ADM = {
  usuarioId: 'usr-adm-01',
  usuarioNome: 'Setor Administrativo (ADM)',
  perfil: 'adm' as const,
};

const ATOR_AT = {
  usuarioId: 'usr-at-01',
  usuarioNome: 'Assistência Técnica (AT)',
  perfil: 'tecnico' as const,
};

const ATOR_ALMOX = {
  usuarioId: 'usr-almox-01',
  usuarioNome: 'Setor Almoxarifado',
  perfil: 'estoquista' as const,
};

export function EquipamentosClient() {
  const { data, isLoading } = useFormsOverview();
  const [busca, setBusca] = React.useState('');
  const [filtroCor, setFiltroCor] = React.useState<TagColor | ''>('');
  const [dossierOs, setDossierOs] = React.useState<string | null>(null);
  const [etiquetaPrint, setEtiquetaPrint] = React.useState<DadosEtiquetaEquipamento | null>(null);

  // Estado interativo da Máquina de Estados v2 (Seções 4 a 7 da Auditoria Linkmed)
  const [mostrarPainelFluxoV2, setMostrarPainelFluxoV2] = React.useState(false);
  const [marcaSimulacao, setMarcaSimulacao] = React.useState<'Cardios' | 'TEB' | 'OLIDEF'>('Cardios');
  const [transporteSelecionado, setTransporteSelecionado] =
    React.useState<TipoTransporteFabrica>('transportadora_linkmed');
  const [justificativaNaoEnviado, setJustificativaNaoEnviado] = React.useState(
    'Cliente optou por reparo em bancada local',
  );
  const [motivoCancelamento, setMotivoCancelamento] = React.useState(
    'Solicitação temporária do cliente para revisão de contrato',
  );
  const [fluxoV2, setFluxoV2] = React.useState<OrdemServicoFluxoState>(() =>
    criarOsViaReg022({
      numeroOs: 'OS-2026-V2',
      identificacao: {
        cliente: 'Hospital Santa Clara',
        equipamento: 'Gravador Holter Digital',
        marca: 'Cardios',
        modelo: 'CardioLight',
        numeroSerie: 'SN-CRD-9921',
      },
      ator: ATOR_ADM,
    }),
  );

  const ordensServico = React.useMemo(
    () => aggregateServiceOrders(data?.records ?? []),
    [data?.records],
  );

  const osFiltradas = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordensServico.filter((os) => {
      if (filtroCor && os.tagColor !== filtroCor) return false;
      if (!q) return true;
      return (
        os.numeroOs.toLowerCase().includes(q) ||
        os.cliente.toLowerCase().includes(q) ||
        os.equipamento.toLowerCase().includes(q) ||
        os.numeroSerie.toLowerCase().includes(q) ||
        os.marca.toLowerCase().includes(q)
      );
    });
  }, [ordensServico, filtroCor, busca]);

  function executarTransicao(fn: (s: OrdemServicoFluxoState) => OrdemServicoFluxoState, msg: string) {
    try {
      setFluxoV2((atual) => fn(atual));
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transição inválida no fluxo da OS.');
    }
  }

  function reiniciarFluxoV2(marca: 'Cardios' | 'TEB' | 'OLIDEF') {
    setMarcaSimulacao(marca);
    const nova = criarOsViaReg022({
      numeroOs: `OS-2026-${marca.toUpperCase()}`,
      identificacao: {
        cliente: 'Hospital Santa Clara',
        equipamento:
          marca === 'Cardios'
            ? 'Gravador Holter Digital'
            : marca === 'TEB'
              ? 'Eletrocardiógrafo Digital'
              : 'Incubadora Neonatal',
        marca,
        modelo: marca === 'Cardios' ? 'CardioLight' : marca === 'TEB' ? 'ECGPC' : 'RN-2000',
        numeroSerie: `SN-${marca.slice(0, 3).toUpperCase()}-2026`,
      },
      ator: ATOR_ADM,
    });
    setFluxoV2(nova);
    toast.info(`Fluxo v2 reiniciado para equipamento da marca ${marca}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipamentos & Ordens de Serviço
          </h1>
          <p className="text-sm text-muted-foreground">
            Rastreabilidade de equipamentos por etiqueta de status (REG-016 / POP-020), fluxo intersetorial ADM · AT · Almoxarifado e emissão de etiqueta de identificação.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={mostrarPainelFluxoV2 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMostrarPainelFluxoV2((v) => !v)}
            className="gap-1.5"
          >
            <PlayCircle className="h-4 w-4" />
            {mostrarPainelFluxoV2
              ? 'Ocultar Painel do Fluxo Oficial v2'
              : 'Painel Interativo do Fluxo da OS (v2)'}
          </Button>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            Fila de Bancada / Ordens de Serviço ({ordensServico.length})
          </Badge>
        </div>
      </div>

      {/* Painel Interativo da Máquina de Estados Oficial v2 (Auditoria Linkmed Seções 4 a 7) */}
      {mostrarPainelFluxoV2 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Motor do Fluxo Oficial da OS (v2 — ADM · Assistência Técnica · Almoxarifado)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Execute passo a passo as ramificações 1 (Garantia), 2 (Envio à Fábrica) e 3 (Reparo Direto), Bloco O (Orçamento), Bloco P (Peças), Item 5 por marca e Cancelamento/Reabertura com histórico imutável.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['Cardios', 'TEB', 'OLIDEF'] as const).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={marcaSimulacao === m ? 'default' : 'outline'}
                    onClick={() => reiniciarFluxoV2(m)}
                    className="h-7 text-xs"
                  >
                    Nova OS ({m})
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra de Status da OS no Motor v2 */}
            <div className="grid gap-3 rounded-xl border border-border bg-card p-3.5 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  OS / Marca
                </p>
                <p className="font-mono text-sm font-bold">
                  {fluxoV2.numeroOs} · {fluxoV2.identificacao.marca}
                </p>
                <p className="text-xs text-muted-foreground">
                  Item 5: {fluxoV2.item5FormularioTipo} (
                  {fluxoV2.item5Liberado ? 'Liberado' : 'Bloqueado por Etiqueta Vermelha'})
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Etiqueta Atual (REG 016)
                </p>
                {fluxoV2.etiquetaAtual ? (
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                      TAG_SPECS[fluxoV2.etiquetaAtual].badgeClass,
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {TAG_SPECS[fluxoV2.etiquetaAtual].nomeCor} —{' '}
                    {TAG_SPECS[fluxoV2.etiquetaAtual].labelStatus}
                  </span>
                ) : (
                  <Badge variant="outline" className="mt-1">
                    Sem etiqueta (OS recém-criada no REG 022)
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Estado Geral / Setor Pendente
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="uppercase">
                    {fluxoV2.estadoGeral}
                  </Badge>
                  <Badge variant="outline">Setor: {fluxoV2.setorPendente}</Badge>
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Etiqueta Física (Seção 5.4)
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={fluxoV2.etiquetaIdentificacaoLiberada ? 'default' : 'outline'}
                  disabled={!fluxoV2.etiquetaIdentificacaoLiberada}
                  onClick={() =>
                    setEtiquetaPrint({
                      numeroOs: fluxoV2.numeroOs,
                      cliente: fluxoV2.identificacao.cliente,
                      equipamento: fluxoV2.identificacao.equipamento,
                      marca: fluxoV2.identificacao.marca,
                      modelo: fluxoV2.identificacao.modelo,
                      numeroSerie: fluxoV2.identificacao.numeroSerie,
                      statusEtiqueta: fluxoV2.etiquetaAtual
                        ? `${TAG_SPECS[fluxoV2.etiquetaAtual].nomeCor} — ${TAG_SPECS[fluxoV2.etiquetaAtual].labelStatus}`
                        : 'CINZA — Análise Completa',
                    })
                  }
                  className="mt-1 h-8 gap-1.5 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {fluxoV2.etiquetaIdentificacaoLiberada
                    ? 'Imprimir Etiqueta (Item 1 REG 022)'
                    : 'Aguardando Análise (CINZA)'}
                </Button>
              </div>
            </div>

            {fluxoV2.mensagemTelaAtual && (
              <div className="rounded-lg border border-primary/30 bg-background px-3.5 py-2.5 text-xs">
                <strong>Orientação / Pergunta em Tela:</strong> {fluxoV2.mensagemTelaAtual}
              </div>
            )}

            {/* Botões de Ação conforme o Passo Atual da Máquina de Estados */}
            <div className="flex flex-wrap items-center gap-2">
              {fluxoV2.passoAtual === 'A1_CRIADA_NO_REG022' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => admMarcarEtiquetaBrancaNoReg016(s, ATOR_ADM),
                      'Etiqueta BRANCA marcada pelo ADM no REG 016. Notificação enviada à AT!',
                    )
                  }
                >
                  [ADM] A2: Marcar Etiqueta BRANCA no REG 016
                </Button>
              )}

              {fluxoV2.passoAtual === 'A2_BRANCA_NOTIFICA_AT' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => confirmarNotificacaoSetor(s, ATOR_AT),
                      'AT confirmou recebimento da OS!',
                    )
                  }
                >
                  [AT] A3: Confirmar Notificação e Iniciar Limpeza
                </Button>
              )}

              {fluxoV2.passoAtual === 'A3_AT_CONFIRMOU_PREENCHER_REG034' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => atRegistrarReg034(s, ATOR_AT),
                      'REG 034 (Limpeza com Álcool 70%) registrado pela AT!',
                    )
                  }
                >
                  [AT] A4: Registrar Limpeza no REG 034
                </Button>
              )}

              {fluxoV2.passoAtual === 'A4_REG034_PREENCHIDO' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => atMarcarEtiquetaVioleta(s, ATOR_AT),
                      'Etiqueta VIOLETA (Higienizado) aplicada pela AT!',
                    )
                  }
                >
                  [AT] A5: Marcar Etiqueta VIOLETA (Higienizado)
                </Button>
              )}

              {fluxoV2.passoAtual === 'A5_VIOLETA_HIGIENIZADO' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => atMarcarEtiquetaCinzaAnaliseCompleta(s, ATOR_AT),
                      'Etiqueta CINZA marcada! Impressão da etiqueta física liberada.',
                    )
                  }
                >
                  [AT] A6: Marcar Etiqueta CINZA (Análise Completa)
                </Button>
              )}

              {fluxoV2.passoAtual === 'A6_CINZA_ANALISE_CONCLUIDA' && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      executarTransicao(
                        (s) => atResponderPerguntaGarantia(s, true, ATOR_AT),
                        'Ramificação 1 (Garantia): Etiqueta LARANJA automática + Almoxarifado notificado!',
                      )
                    }
                  >
                    [AT] Trata-se de Garantia? SIM (Etiqueta LARANJA)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      executarTransicao(
                        (s) => atResponderPerguntaGarantia(s, false, ATOR_AT),
                        'Garantia = NÃO. Próxima pergunta: Envio à fábrica?',
                      )
                    }
                  >
                    [AT] Trata-se de Garantia? NÃO
                  </Button>
                </>
              )}

              {fluxoV2.passoAtual === 'B2_PERGUNTA_ENVIO_FABRICA' && (
                <div className="flex flex-wrap items-center gap-2">
                  <SelectNative
                    value={transporteSelecionado}
                    onChange={(e) =>
                      setTransporteSelecionado(e.target.value as TipoTransporteFabrica)
                    }
                    className="h-9 w-64 text-xs"
                  >
                    {OPCOES_TRANSPORTE_FABRICA.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </SelectNative>
                  <Button
                    size="sm"
                    onClick={() =>
                      executarTransicao(
                        (s) =>
                          atResponderPerguntaEnvioFabrica(
                            s,
                            { trataSeEnvioFabrica: true, tipoTransporte: transporteSelecionado },
                            ATOR_AT,
                          ),
                        'Ramificação 2: OS em Stand-by aguardando envio à fábrica.',
                      )
                    }
                  >
                    [AT] Envio à Fábrica? SIM
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      executarTransicao(
                        (s) =>
                          atResponderPerguntaEnvioFabrica(
                            s,
                            { trataSeEnvioFabrica: false },
                            ATOR_AT,
                          ),
                        'Ramificação 3 (Reparo Direto): ADM notificado para orçamento!',
                      )
                    }
                  >
                    [AT] Envio à Fábrica? NÃO (Reparo Direto → Orçamento)
                  </Button>
                </div>
              )}

              {fluxoV2.passoAtual === 'B4_STAND_BY_AGUARDANDO_ENVIO_FABRICA' && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      executarTransicao(
                        (s) =>
                          atResponderEquipamentoEnviadoFabrica(
                            s,
                            { foiEnviado: true },
                            ATOR_AT,
                          ),
                        'Equipamento enviado! Etiqueta MARROM aplicada + ADM notificado para orçamento.',
                      )
                    }
                  >
                    [AT] Equipamento foi enviado? SIM (Etiqueta MARROM)
                  </Button>
                  <Input
                    value={justificativaNaoEnviado}
                    onChange={(e) => setJustificativaNaoEnviado(e.target.value)}
                    placeholder="Justificativa obrigatória se NÃO enviado..."
                    className="h-9 w-64 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      executarTransicao(
                        (s) =>
                          atResponderEquipamentoEnviadoFabrica(
                            s,
                            {
                              foiEnviado: false,
                              justificativaNaoEnviado,
                              etiquetaEscolhidaSeNaoEnviado: 'GREEN',
                            },
                            ATOR_AT,
                          ),
                        'Não enviado (justificado) → Etiqueta VERDE (Serviço Finalizado).',
                      )
                    }
                  >
                    [AT] NÃO Enviado → Etiqueta VERDE
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      executarTransicao(
                        (s) =>
                          atResponderEquipamentoEnviadoFabrica(
                            s,
                            {
                              foiEnviado: false,
                              justificativaNaoEnviado,
                              etiquetaEscolhidaSeNaoEnviado: 'RED',
                            },
                            ATOR_AT,
                          ),
                        'Etiqueta VERMELHA aplicada (Item 5 bloqueado e OS finalizada).',
                      )
                    }
                  >
                    [AT] NÃO Enviado → Etiqueta VERMELHA
                  </Button>
                </div>
              )}

              {fluxoV2.passoAtual === 'C_AGUARDANDO_ORCAMENTO_ADM' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => {
                        const c = confirmarNotificacaoSetor(s, ATOR_ADM);
                        return admMarcarEtiquetaAmarelaOrcamento(c, ATOR_ADM);
                      },
                      'ADM confirmou e marcou Etiqueta AMARELA (Aguardando aprovação do orçamento).',
                    )
                  }
                >
                  [ADM] C1: Confirmar e Marcar Etiqueta AMARELA (Orçamento Enviado)
                </Button>
              )}

              {fluxoV2.passoAtual === 'C1_AMARELA_AGUARDANDO_RESPOSTA_CLIENTE' && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      executarTransicao(
                        (s) => admResponderOrcamentoAprovado(s, true, ATOR_ADM),
                        'Orçamento APROVADO! Etiqueta AZUL automática + Almoxarifado notificado.',
                      )
                    }
                  >
                    [ADM] C2: Orçamento Aprovado? SIM (Etiqueta AZUL)
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      executarTransicao(
                        (s) => admResponderOrcamentoAprovado(s, false, ATOR_ADM),
                        'Orçamento REPROVADO pelo cliente. AT notificada para confirmar devolução.',
                      )
                    }
                  >
                    [ADM] C3: Orçamento Aprovado? NÃO
                  </Button>
                </>
              )}

              {fluxoV2.passoAtual === 'C3_AMARELA_AGUARDANDO_CONFIRMACAO_REPROVACAO_AT' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    executarTransicao(
                      (s) => confirmarNotificacaoSetor(s, ATOR_AT),
                      'AT confirmou reprovação: Etiqueta VERMELHA automática, Item 5 bloqueado e OS finalizada!',
                    )
                  }
                >
                  [AT] C4: Confirmar Ciência da Reprovação (Aplica Etiqueta VERMELHA)
                </Button>
              )}

              {(fluxoV2.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX' ||
                fluxoV2.passoAtual === 'D1_ALMOX_DECIDINDO_PECAS') && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      executarTransicao(
                        (s) => {
                          const c =
                            s.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX'
                              ? confirmarNotificacaoSetor(s, ATOR_ALMOX)
                              : s;
                          return almoxarifadoDecidirPecas(c, 'pecas_disponiveis', ATOR_ALMOX);
                        },
                        'Almoxarifado separou as peças! AT notificada para execução.',
                      )
                    }
                  >
                    [Almoxarifado] D4: Peças Disponíveis
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      executarTransicao(
                        (s) => {
                          const c =
                            s.passoAtual === 'D_AGUARDANDO_CONFIRMACAO_ALMOX'
                              ? confirmarNotificacaoSetor(s, ATOR_ALMOX)
                              : s;
                          return almoxarifadoDecidirPecas(c, 'aguardando_pecas', ATOR_ALMOX);
                        },
                        'Etiqueta PRETA aplicada automaticamente (OS em stand-by aguardando peças).',
                      )
                    }
                  >
                    [Almoxarifado] D2: Aguardando Peças (Etiqueta PRETA / Stand-by)
                  </Button>
                </>
              )}

              {fluxoV2.passoAtual === 'D2_PRETA_STAND_BY_AGUARDANDO_PECAS' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => almoxarifadoRetomarOsDeAguardandoPecas(s, ATOR_ALMOX),
                      'Peças chegaram! Etiqueta anterior (LARANJA/AZUL) restaurada e AT notificada.',
                    )
                  }
                >
                  [Almoxarifado] D3: Peças Chegaram (Restaurar Etiqueta e Notificar AT)
                </Button>
              )}

              {fluxoV2.passoAtual === 'D4_PECAS_DISPONIVEIS_AGUARDANDO_CONFIRMACAO_AT' && (
                <Button
                  size="sm"
                  onClick={() =>
                    executarTransicao(
                      (s) => confirmarNotificacaoSetor(s, ATOR_AT),
                      'AT confirmou recebimento das peças e liberou o Item 5 do REG 016!',
                    )
                  }
                >
                  [AT] D5: Confirmar Peças e Liberar Item 5 ({fluxoV2.item5FormularioTipo})
                </Button>
              )}

              {fluxoV2.passoAtual === 'D5_AT_PRONTO_PARA_FINALIZAR' && (
                <>
                  {!fluxoV2.item5Preenchido ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) =>
                            atPreencherItem5Reg016(
                              s,
                              s.identificacao.marca,
                              ATOR_AT,
                            ),
                          `Item 5 (${fluxoV2.item5FormularioTipo}) preenchido para a marca ${fluxoV2.identificacao.marca}!`,
                        )
                      }
                    >
                      [AT] Preencher Item 5 do REG 016 ({fluxoV2.item5FormularioTipo})
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        executarTransicao(
                          (s) => atFinalizarServicoComEtiquetaVerde(s, ATOR_AT),
                          'Etiqueta VERDE aplicada! Serviço finalizado com sucesso.',
                        )
                      }
                    >
                      [AT] D6: Marcar Etiqueta VERDE (Serviço Finalizado)
                    </Button>
                  )}
                </>
              )}

              {/* Controles de Cancelamento e Reabertura (Seção 7.3) */}
              {fluxoV2.estadoGeral !== 'cancelada' && fluxoV2.estadoGeral !== 'finalizada' && (
                <div className="ml-auto flex items-center gap-1.5">
                  <Input
                    value={motivoCancelamento}
                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                    placeholder="Justificativa p/ cancelar OS..."
                    className="h-8 w-52 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      executarTransicao(
                        (s) => cancelarOs(s, motivoCancelamento, ATOR_ADM),
                        'OS cancelada com justificativa registrada no histórico.',
                      )
                    }
                    className="h-8 gap-1 text-xs text-rose-600"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancelar OS
                  </Button>
                </div>
              )}

              {fluxoV2.estadoGeral === 'cancelada' && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() =>
                    executarTransicao(
                      (s) =>
                        reabrirOs(
                          s,
                          'Cliente autorizou prosseguimento da manutenção',
                          ATOR_ADM,
                        ),
                      'OS reaberta exatamente na etapa em que estava antes do cancelamento!',
                    )
                  }
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir OS (Restaurar Etapa Anterior)
                </Button>
              )}
            </div>

            {/* Histórico Imutável da OS (Seção 4.3 / 7.2) */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <History className="h-3.5 w-3.5 text-primary" />
                Histórico Imutável de Eventos da OS ({fluxoV2.historico.length})
              </p>
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1 text-[11px]">
                {fluxoV2.historico.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-muted/20 px-2.5 py-1"
                  >
                    <span>
                      <strong>[{ev.codigoPasso}]</strong> {ev.tipo}:{' '}
                      <span className="font-medium text-primary">{ev.valorNovo}</span>
                      {ev.observacao ? ` — ${ev.observacao}` : ''}
                    </span>
                    <span className="text-muted-foreground">
                      {ev.usuarioNome} ({ev.usuarioPerfil})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* Filtros de OS e Etiquetas */}
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_260px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por Nº da OS, cliente, equipamento, marca ou nº de série..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <SelectNative
              value={filtroCor}
              onChange={(e) => setFiltroCor(e.target.value as TagColor | '')}
            >
              <option value="">Todas as etiquetas (REG-016)</option>
              {TAG_SPECS_LIST.map((t) => (
                <option key={t.color} value={t.color}>
                  Etiqueta {t.nomeCor} — {t.labelStatus}
                </option>
              ))}
            </SelectNative>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : osFiltradas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                Nenhuma Ordem de Serviço ou equipamento encontrado.
              </p>
              <p className="text-xs text-muted-foreground">
                Inicie pelo formulário de Inspeção de Recebimento (REG-022) pelo setor Administrativo (ADM).
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {osFiltradas.map((os) => {
              const tag = TAG_SPECS[os.tagColor];
              const analiseJaConcluida =
                os.tagColor !== 'WHITE' && os.tagColor !== 'VIOLET';
              const etapas = [
                {
                  label: '1. Recebimento ADM (REG-022)',
                  done: os.etapasConcluidas.reg022Recebimento,
                  href: `/formularios/inspecao-recebimento?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '2. Higienização AT (REG-034)',
                  done: os.etapasConcluidas.reg034Limpeza,
                  href: `/formularios/limpeza-equipamento?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '3. Diagnóstico AT (REG-035)',
                  done: os.etapasConcluidas.reg035Manutencao,
                  href: `/formularios/checklist-manutencao?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '4. Etapas / Etiquetas (REG-016)',
                  done: os.etapasConcluidas.reg016Etapas,
                  href: `/formularios/etapas-manutencao?os=${encodeURIComponent(os.chave)}`,
                },
                {
                  label: '5. Calibração / CQ (REG-030)',
                  done: os.etapasConcluidas.reg030Calibracao,
                  href: `/formularios/verificacao-calibracao?os=${encodeURIComponent(os.chave)}`,
                },
              ];

              return (
                <Card key={os.chave}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierOs(os.numeroOs)}
                            className="cursor-pointer transition-transform active:scale-95 text-left"
                            title="Clique para abrir o Dossiê completo com tudo o que já foi preenchido desta OS"
                          >
                            <Badge variant="default" className="font-mono hover:bg-primary/90 underline">
                              OS: {os.numeroOs}
                            </Badge>
                          </button>
                          <span className="text-sm font-semibold">
                            {os.equipamento || 'Equipamento'}
                          </span>
                          {(os.marca || os.modelo) && (
                            <span className="text-xs text-muted-foreground">
                              ({[os.marca, os.modelo].filter(Boolean).join(' · ')})
                            </span>
                          )}
                          {os.numeroSerie && (
                            <Badge variant="outline" className="font-mono">
                              S/N: {os.numeroSerie}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <strong>Cliente:</strong> {os.cliente || '—'} ·{' '}
                          <strong>Última movimentação:</strong>{' '}
                          {os.ultimaAtualizacao.split('-').reverse().join('/')}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {analiseJaConcluida && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEtiquetaPrint({
                                numeroOs: os.numeroOs,
                                cliente: os.cliente,
                                equipamento: os.equipamento,
                                marca: os.marca,
                                modelo: os.modelo,
                                numeroSerie: os.numeroSerie,
                                dataAnalise: os.ultimaAtualizacao,
                                statusEtiqueta: `${tag.nomeCor} — ${tag.labelStatus}`,
                              })
                            }
                            className="h-7 gap-1.5 text-xs"
                          >
                            <Printer className="h-3.5 w-3.5 text-primary" />
                            Imprimir Etiqueta (Item 1 REG 022)
                          </Button>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                            tag.badgeClass,
                          )}
                        >
                          <Tag className="h-3.5 w-3.5" />
                          Etiqueta {tag.nomeCor}: {tag.labelStatus}
                        </span>
                      </div>
                    </div>

                    {/* Trilha de Etapas com Autopreenchimento */}
                    <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-5">
                      {etapas.map((etapa) => (
                        <Link
                          key={etapa.label}
                          href={etapa.href}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors',
                            etapa.done
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground',
                          )}
                        >
                          <span className="truncate">{etapa.label}</span>
                          {etapa.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          )}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dossiê completo ao clicar na OS */}
      <OsDossierDialog
        osChaveOuNumero={dossierOs}
        open={Boolean(dossierOs)}
        onOpenChange={(open) => !open && setDossierOs(null)}
      />

      {/* Impressão da Etiqueta Física de Identificação (Seção 5.4) */}
      <EquipmentLabelPrintDialog
        open={Boolean(etiquetaPrint)}
        onOpenChange={(open) => !open && setEtiquetaPrint(null)}
        dados={etiquetaPrint}
      />
    </div>
  );
}
