'use client';

import * as React from 'react';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  Lock,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
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
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  type AvaliacaoEficaciaParticipante,
  HISTORICO_REVISAO_REG008,
  LEGENDA_EFICACIA_REG008,
  type NotaEficacia,
  type ParticipanteReg008,
  QUESITOS_EFICACIA_REG008,
  type Treinamento,
  TREINAMENTO_TIPO_LABEL,
  TREINAMENTO_TIPOS,
  type TreinamentoTipo,
} from '@/core/domain/entities/operacional';
import { canEditGovernance } from '@/core/domain/forms/definitions';
import { agoraBR } from '@/core/domain/forms/alerts';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useCreateTreinamento,
  useTreinamentos,
  useUpdateTreinamentoEficacia,
} from '@/hooks/use-operacional';

function criarAvaliacaoDefault(
  participante = '',
): AvaliacaoEficaciaParticipante {
  return {
    participante,
    assimilacaoConteudo: 5,
    aplicabilidadeAtividade: 5,
    desempenhoQualidadeProdutividade: 5,
    interesseNovosConceitos: 5,
    execucaoConformeProcedimentos: 5,
    observacoes: '',
  };
}

function calcularMediaEficacia(avaliacoes?: AvaliacaoEficaciaParticipante[]): number | null {
  if (!avaliacoes || avaliacoes.length === 0) return null;
  let soma = 0;
  let totalNotas = 0;
  for (const a of avaliacoes) {
    soma +=
      a.assimilacaoConteudo +
      a.aplicabilidadeAtividade +
      a.desempenhoQualidadeProdutividade +
      a.interesseNovosConceitos +
      a.execucaoConformeProcedimentos;
    totalNotas += 5;
  }
  return totalNotas > 0 ? Number((soma / totalNotas).toFixed(1)) : null;
}

export function TreinamentosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useTreinamentos();
  const createTreinamento = useCreateTreinamento();
  const avaliarEficacia = useUpdateTreinamentoEficacia();

  const [tipoFiltro, setTipoFiltro] = React.useState<TreinamentoTipo | ''>('');
  const [busca, setBusca] = React.useState('');
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [treinamentoSelecionado, setTreinamentoSelecionado] =
    React.useState<Treinamento | null>(null);

  // Estado do formulário REG-008 (Novo Treinamento)
  const [titulo, setTitulo] = React.useState('');
  const [conteudo, setConteudo] = React.useState('');
  const [tipo, setTipo] = React.useState<TreinamentoTipo>('interno');
  const [instrutor, setInstrutor] = React.useState('');
  const [localTreinamento, setLocalTreinamento] = React.useState(
    'Sala de Treinamento LinkMed',
  );
  const [entidade, setEntidade] = React.useState('');
  const [cargaHoraria, setCargaHoraria] = React.useState('4');
  const [horarioInicial, setHorarioInicial] = React.useState('08:30');
  const [horarioFinal, setHorarioFinal] = React.useState('12:30');
  const [dataRealizacao, setDataRealizacao] = React.useState(() => agoraBR().data);
  const [validadeAte, setValidadeAte] = React.useState('');
  const [observacoes, setObservacoes] = React.useState('');
  const [elaboradoPor, setElaboradoPor] = React.useState('Gestão da Qualidade');
  const [revisadoPor, setRevisadoPor] = React.useState('Responsável Técnico');
  const [aprovadoPor, setAprovadoPor] = React.useState('Diretoria Operacional');

  // Lista de presença estruturada (REG-008)
  const [participantesDetalhe, setParticipantesDetalhe] = React.useState<
    ParticipanteReg008[]
  >([
    {
      nome: 'Carlos Menezes',
      funcao: 'Técnico em Equipamentos Biomédicos',
      assinatura: 'Carlos Menezes (Assinado Digitalmente)',
    },
    {
      nome: 'Rafael Souza',
      funcao: 'Técnico Júnior',
      assinatura: 'Rafael Souza (Assinado Digitalmente)',
    },
  ]);

  // Avaliação da eficácia no momento do cadastro (opcional/imediata)
  const [incluirAvaliacaoImediata, setIncluirAvaliacaoImediata] = React.useState(true);
  const [avaliacoesForm, setAvaliacoesForm] = React.useState<
    AvaliacaoEficaciaParticipante[]
  >([
    criarAvaliacaoDefault('Carlos Menezes'),
    criarAvaliacaoDefault('Rafael Souza'),
  ]);
  const [avaliadoPor, setAvaliadoPor] = React.useState('Gestor da Qualidade / RT');
  const [dataAvaliacao, setDataAvaliacao] = React.useState(() => agoraBR().data);
  const [assinaturaAvaliador, setAssinaturaAvaliador] = React.useState(
    'Assinado Digitalmente — Gestão da Qualidade',
  );
  const [erroForm, setErroForm] = React.useState<string | null>(null);

  // Estado do modal de visualização / avaliação REG-008 de um treinamento existente
  const [editAvaliacoes, setEditAvaliacoes] = React.useState<
    AvaliacaoEficaciaParticipante[]
  >([]);
  const [editAvaliadoPor, setEditAvaliadoPor] = React.useState('');
  const [editDataAvaliacao, setEditDataAvaliacao] = React.useState('');
  const [editAssinaturaAvaliador, setEditAssinaturaAvaliador] = React.useState('');

  const podeEditarGovernanca = canEditGovernance(user?.perfil);

  React.useEffect(() => {
    if (user?.nomeCompleto) {
      setAvaliadoPor(user.nomeCompleto);
      setAssinaturaAvaliador(`${user.nomeCompleto} (${user.perfil.toUpperCase()})`);
    }
  }, [user?.nomeCompleto, user?.perfil]);

  function abrirModalNovoTreinamento(modalidade: TreinamentoTipo) {
    setTipo(modalidade);
    setErroForm(null);
    if (modalidade === 'interno') {
      setLocalTreinamento('Sala de Treinamento LinkMed');
      setEntidade('');
    } else {
      setLocalTreinamento('Centro Técnico do Fabricante / Remoto Síncrono');
    }
    setDialogAberto(true);
  }

  function sincronizarAvaliacoesComParticipantes(novos: ParticipanteReg008[]) {
    setAvaliacoesForm((prev) =>
      novos.map((p, idx) => {
        const existente = prev[idx];
        return existente
          ? { ...existente, participante: p.nome }
          : criarAvaliacaoDefault(p.nome);
      }),
    );
  }

  function adicionarParticipante() {
    const novos: ParticipanteReg008[] = [
      ...participantesDetalhe,
      {
        nome: '',
        funcao: '',
        assinatura: '',
      },
    ];
    setParticipantesDetalhe(novos);
    sincronizarAvaliacoesComParticipantes(novos);
  }

  function removerParticipante(idx: number) {
    if (participantesDetalhe.length <= 1) return;
    const novos = participantesDetalhe.filter((_, i) => i !== idx);
    setParticipantesDetalhe(novos);
    sincronizarAvaliacoesComParticipantes(novos);
  }

  function atualizarParticipante(
    idx: number,
    campo: keyof ParticipanteReg008,
    valor: string,
  ) {
    const novos = participantesDetalhe.map((p, i) => {
      if (i !== idx) return p;
      const atualizado = { ...p, [campo]: valor };
      if (campo === 'nome' && (!p.assinatura || p.assinatura.startsWith(p.nome))) {
        atualizado.assinatura = valor ? `${valor} (Assinado)` : '';
      }
      return atualizado;
    });
    setParticipantesDetalhe(novos);
    sincronizarAvaliacoesComParticipantes(novos);
  }

  function atualizarNotaForm(
    idx: number,
    quesito: keyof Omit<AvaliacaoEficaciaParticipante, 'participante' | 'observacoes'>,
    nota: NotaEficacia,
  ) {
    setAvaliacoesForm((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [quesito]: nota } : a)),
    );
  }

  function abrirFichaReg008(t: Treinamento) {
    setTreinamentoSelecionado(t);
    const listaNomes =
      t.participantesDetalhados && t.participantesDetalhados.length > 0
        ? t.participantesDetalhados.map((p: ParticipanteReg008) => p.nome)
        : t.participantes.length > 0
          ? t.participantes
          : ['Colaborador Participante 1'];

    if (t.avaliacoesEficacia && t.avaliacoesEficacia.length > 0) {
      setEditAvaliacoes(t.avaliacoesEficacia);
    } else {
      setEditAvaliacoes(
        listaNomes.map((nome: string) => criarAvaliacaoDefault(nome)),
      );
    }
    setEditAvaliadoPor(t.avaliadoPor || user?.nomeCompleto || 'Gestor da Qualidade / RT');
    setEditDataAvaliacao(t.dataAvaliacao || agoraBR().data);
    setEditAssinaturaAvaliador(
      t.assinaturaAvaliador ||
        (user
          ? `${user.nomeCompleto} (${user.perfil.toUpperCase()})`
          : 'Assinado Digitalmente'),
    );
  }

  async function handleSalvarAvaliacaoExistente() {
    if (!treinamentoSelecionado) return;
    try {
      await avaliarEficacia.mutateAsync({
        id: treinamentoSelecionado.id,
        avaliacoesEficacia: editAvaliacoes,
        avaliadoPor: editAvaliadoPor.trim() || 'Gestão da Qualidade',
        dataAvaliacao: editDataAvaliacao || agoraBR().data,
        assinaturaAvaliador: editAssinaturaAvaliador.trim() || 'Assinado Digitalmente',
      });
      toast.success('Avaliação da eficácia (REG-008) registrada com sucesso!');
      setTreinamentoSelecionado(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao salvar avaliação de eficácia.',
      );
    }
  }

  const lista = React.useMemo(() => data?.treinamentos ?? [], [data?.treinamentos]);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((t) => {
      if (tipoFiltro && t.tipo !== tipoFiltro) return false;
      if (!q) return true;
      return (
        t.titulo.toLowerCase().includes(q) ||
        (t.conteudo && t.conteudo.toLowerCase().includes(q)) ||
        (t.instrutor && t.instrutor.toLowerCase().includes(q)) ||
        (t.entidade && t.entidade.toLowerCase().includes(q)) ||
        t.participantes.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [lista, tipoFiltro, busca]);

  const totalInternos = lista.filter((t) => t.tipo === 'interno').length;
  const totalExternos = lista.filter((t) => t.tipo === 'externo').length;
  const totalParticipacoes = lista.reduce((acc, t) => acc + t.participantes.length, 0);
  const totalAvaliados = lista.filter(
    (t) => t.avaliacoesEficacia && t.avaliacoesEficacia.length > 0,
  ).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);

    if (titulo.trim().length < 3) {
      setErroForm('Informe o assunto/título do treinamento.');
      return;
    }
    if (tipo === 'externo' && !entidade.trim()) {
      setErroForm('Informe a entidade ou fabricante responsável pelo treinamento externo.');
      return;
    }

    const participantesValidos = participantesDetalhe.filter(
      (p) => p.nome.trim().length > 0,
    );
    if (participantesValidos.length === 0) {
      setErroForm('Adicione pelo menos 1 participante na lista de presença.');
      return;
    }

    const nomesParticipantes = participantesValidos.map((p) => p.nome.trim());
    const avaliacoesValidas = incluirAvaliacaoImediata
      ? participantesValidos.map((p, idx) => {
          const av = avaliacoesForm[idx] ?? criarAvaliacaoDefault(p.nome.trim());
          return {
            ...av,
            participante: p.nome.trim(),
          };
        })
      : [];

    try {
      await createTreinamento.mutateAsync({
        titulo: titulo.trim(),
        conteudo: conteudo.trim() || null,
        tipo,
        instrutor: instrutor.trim() || null,
        localTreinamento: localTreinamento.trim() || null,
        horarioInicial: horarioInicial || null,
        horarioFinal: horarioFinal || null,
        entidade: tipo === 'externo' ? entidade.trim() : null,
        cargaHoraria: cargaHoraria ? Number(cargaHoraria) : null,
        dataRealizacao,
        validadeAte: validadeAte || null,
        participantes: nomesParticipantes,
        participantesDetalhados: participantesValidos.map((p) => ({
          nome: p.nome.trim(),
          funcao: p.funcao.trim() || 'Colaborador',
          assinatura: p.assinatura.trim() || `${p.nome.trim()} (Assinado)`,
        })),
        avaliacoesEficacia: avaliacoesValidas,
        avaliadoPor: incluirAvaliacaoImediata ? avaliadoPor.trim() : null,
        dataAvaliacao: incluirAvaliacaoImediata ? dataAvaliacao : null,
        assinaturaAvaliador: incluirAvaliacaoImediata
          ? assinaturaAvaliador.trim()
          : null,
        observacoes: observacoes.trim() || null,
        elaboradoPor: elaboradoPor.trim() || 'Gestão da Qualidade',
        revisadoPor: revisadoPor.trim() || 'Responsável Técnico',
        aprovadoPor: aprovadoPor.trim() || 'Diretoria Operacional',
      });

      toast.success(
        `Treinamento ${tipo === 'interno' ? 'Interno' : 'Externo'} (REG-008) registrado com sucesso!`,
      );
      setTitulo('');
      setConteudo('');
      setInstrutor('');
      setEntidade('');
      setObservacoes('');
      setDialogAberto(false);
    } catch (err) {
      setErroForm(
        err instanceof Error ? err.message : 'Erro ao registrar treinamento.',
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com os 2 botões dedicados: Treinamento Interno e Treinamento Externo */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-mono">
              REG-008 · Rev. 01
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              RDC 665/22 — Capacitação & Avaliação da Eficácia
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Registro de Treinamento e Avaliação da Eficácia (REG 008)
          </h1>
          <p className="text-sm text-muted-foreground">
            Inclusão de Treinamentos Internos e Externos com Lista de Presença e Avaliação da Eficácia por participante.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => abrirModalNovoTreinamento('interno')}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Treinamento Interno
          </Button>
          <Button
            variant="outline"
            onClick={() => abrirModalNovoTreinamento('externo')}
            className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <Plus className="h-4 w-4" />
            Treinamento Externo
          </Button>
        </div>
      </div>

      {/* Cabeçalho de Governança Documental REG-008 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <FileCheck2 className="h-4 w-4" />
          <span>
            REG 008 — Registro de Treinamento e Avaliação da Eficácia (Revisão 01 · 30/01/2026)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span>
            <strong className="text-foreground">Elaborado por:</strong> Gestão da Qualidade
          </span>
          <span>
            <strong className="text-foreground">Revisado por:</strong> Responsável Técnico
          </span>
          <span>
            <strong className="text-foreground">Aprovado por:</strong> Diretoria Operacional
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total de Treinamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{lista.length}</p>
            <p className="text-xs text-muted-foreground">Registros REG-008 ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Treinamentos Internos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{totalInternos}</p>
            <p className="text-xs text-muted-foreground">POPs e rotinas da qualidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Treinamentos Externos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalExternos}
            </p>
            <p className="text-xs text-muted-foreground">Fabricantes (Olidef, TEB, etc.)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Eficácia Avaliada (REG-008)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalAvaliados}/{lista.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalParticipacoes} participações registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por assunto, conteúdo, instrutor, entidade ou participante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TreinamentoTipo | '')}
          >
            <option value="">Todas as modalidades</option>
            {TREINAMENTO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {TREINAMENTO_TIPO_LABEL[t]}
              </option>
            ))}
          </SelectNative>
        </CardContent>
      </Card>

      {/* Lista de Treinamentos */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhum treinamento encontrado.</p>
            <p className="text-xs text-muted-foreground">
              Utilize os botões &ldquo;Treinamento Interno&rdquo; ou &ldquo;Treinamento Externo&rdquo; no topo para registrar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((t) => {
            const mediaEficacia = calcularMediaEficacia(t.avaliacoesEficacia);
            return (
              <Card key={t.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          REG-008
                        </Badge>
                        <Badge
                          variant={t.tipo === 'externo' ? 'success' : 'default'}
                        >
                          {TREINAMENTO_TIPO_LABEL[t.tipo]}
                        </Badge>
                        {t.cargaHoraria && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {t.cargaHoraria}h
                            {t.horarioInicial && t.horarioFinal
                              ? ` (${t.horarioInicial} às ${t.horarioFinal})`
                              : ''}
                          </Badge>
                        )}
                        {t.localTreinamento && (
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {t.localTreinamento}
                          </Badge>
                        )}
                        {t.entidade && (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {t.entidade}
                          </Badge>
                        )}
                        {mediaEficacia !== null ? (
                          <Badge variant="success" className="gap-1">
                            <Award className="h-3 w-3" />
                            Eficácia Avaliada: {mediaEficacia}/5.0
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            Aguardando Avaliação de Eficácia
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Assunto: {t.titulo}
                      </p>
                      {t.conteudo && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Conteúdo:</strong> {t.conteudo}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Data:{' '}
                          <strong>
                            {t.dataRealizacao.split('-').reverse().join('/')}
                          </strong>
                        </p>
                        {t.validadeAte && (
                          <p className="mt-0.5 text-[11px]">
                            Validade: {t.validadeAte.split('-').reverse().join('/')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={mediaEficacia !== null ? 'outline' : 'default'}
                        onClick={() => abrirFichaReg008(t)}
                        className="gap-1.5"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {mediaEficacia !== null
                          ? 'Ver Ficha REG-008 / Eficácia'
                          : 'Avaliar Eficácia (REG-008)'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {t.instrutor && (
                      <span>
                        <strong>Instrutor:</strong> {t.instrutor}
                      </span>
                    )}
                    {t.avaliadoPor && (
                      <span>
                        <strong>Avaliado por:</strong> {t.avaliadoPor}
                        {t.dataAvaliacao
                          ? ` em ${t.dataAvaliacao.split('-').reverse().join('/')}`
                          : ''}
                      </span>
                    )}
                  </div>

                  {t.participantes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Participantes ({t.participantes.length}):
                      </span>
                      {t.participantes.map((p, idx) => (
                        <span
                          key={`${p}-${idx}`}
                          className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          {idx + 1}. {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        <strong>Elaborado por:</strong>{' '}
                        {t.elaboradoPor || 'Gestão da Qualidade'}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>Revisado por:</strong>{' '}
                        {t.revisadoPor || 'Responsável Técnico'}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>Aprovado por:</strong>{' '}
                        {t.aprovadoPor || 'Diretoria Operacional'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px]">
                      REG 008 · Rev. 01 (30/01/2026)
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabela Oficial de Histórico de Revisões do REG 008 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico de Revisão do Documento — REG 008
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-semibold">Data</th>
                  <th className="py-2 pr-4 font-semibold">Revisão</th>
                  <th className="py-2 font-semibold">Histórico / Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {HISTORICO_REVISAO_REG008.map((rev) => (
                  <tr key={rev.numero}>
                    <td className="py-2 pr-4 font-mono">{rev.data}</td>
                    <td className="py-2 pr-4 font-mono font-semibold">{rev.numero}</td>
                    <td className="py-2 text-muted-foreground">{rev.historico}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Inclusão de Treinamento Interno / Externo (REG-008 Completo) */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              REG 008 — Incluir{' '}
              {tipo === 'interno' ? 'Treinamento Interno' : 'Treinamento Externo'} e
              Avaliação da Eficácia
            </DialogTitle>
            <DialogDescription>
              Formulário oficial REG 008 (Rev. 01 — 30/01/2026) com lista de presença e registro de avaliação da eficácia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {erroForm && (
              <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600">
                {erroForm}
              </p>
            )}

            {/* Seletor rápido de Modalidade no topo do modal */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1.5">
              <button
                type="button"
                onClick={() => setTipo('interno')}
                className={`rounded-md py-2 text-xs font-semibold transition ${
                  tipo === 'interno'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Treinamento Interno (POPs / Qualidade)
              </button>
              <button
                type="button"
                onClick={() => setTipo('externo')}
                className={`rounded-md py-2 text-xs font-semibold transition ${
                  tipo === 'externo'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Treinamento Externo (Fabricante / Instituição)
              </button>
            </div>

            {/* Bloco 1: Cabeçalho do Treinamento REG-008 */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                1. Dados do Treinamento (REG 008)
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tr-titulo">Assunto *</Label>
                  <Input
                    id="tr-titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Treinamento POP-020 e Rastreabilidade de Manutenção Corretiva"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tr-conteudo">Conteúdo *</Label>
                  <Textarea
                    id="tr-conteudo"
                    rows={2}
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Descreva os tópicos abordados no treinamento..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tr-instrutor">Instrutor *</Label>
                  <Input
                    id="tr-instrutor"
                    value={instrutor}
                    onChange={(e) => setInstrutor(e.target.value)}
                    placeholder="Nome do instrutor responsável"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tr-local">Local *</Label>
                  <Input
                    id="tr-local"
                    value={localTreinamento}
                    onChange={(e) => setLocalTreinamento(e.target.value)}
                    placeholder="Ex: Sala de Treinamento LinkMed"
                    required
                  />
                </div>

                {tipo === 'externo' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="tr-entidade">
                      Entidade / Fabricante Responsável (Treinamento Externo) *
                    </Label>
                    <Input
                      id="tr-entidade"
                      value={entidade}
                      onChange={(e) => setEntidade(e.target.value)}
                      placeholder="Ex: Olidef / TEB / Instituto Acreditado"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="tr-data">Data *</Label>
                  <Input
                    id="tr-data"
                    type="date"
                    value={dataRealizacao}
                    onChange={(e) => setDataRealizacao(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tr-hi">Horário Inicial</Label>
                    <Input
                      id="tr-hi"
                      type="time"
                      value={horarioInicial}
                      onChange={(e) => setHorarioInicial(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tr-hf">Horário Final</Label>
                    <Input
                      id="tr-hf"
                      type="time"
                      value={horarioFinal}
                      onChange={(e) => setHorarioFinal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tr-carga">Carga (h)</Label>
                    <Input
                      id="tr-carga"
                      type="number"
                      step="0.5"
                      value={cargaHoraria}
                      onChange={(e) => setCargaHoraria(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Lista de Presença (Nº | Nome | Função | Assinatura) */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    2. Lista de Presença dos Participantes (REG 008)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Informe Nome, Função e Assinatura de cada colaborador treinado.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={adicionarParticipante}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Participante
                </Button>
              </div>

              <div className="space-y-2">
                {participantesDetalhe.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-2 sm:grid-cols-[44px_1fr_1fr_1fr_40px]"
                  >
                    <div className="flex h-9 items-center justify-center rounded-md border border-border bg-muted/40 font-mono text-xs font-bold">
                      {idx + 1}
                    </div>
                    <Input
                      placeholder="Nome do colaborador *"
                      value={p.nome}
                      onChange={(e) =>
                        atualizarParticipante(idx, 'nome', e.target.value)
                      }
                      required
                    />
                    <Input
                      placeholder="Função / Cargo"
                      value={p.funcao}
                      onChange={(e) =>
                        atualizarParticipante(idx, 'funcao', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Assinatura"
                      value={p.assinatura}
                      onChange={(e) =>
                        atualizarParticipante(idx, 'assinatura', e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={participantesDetalhe.length <= 1}
                      onClick={() => removerParticipante(idx)}
                      className="text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco 3: Registro de Avaliação da Eficácia do Treinamento (REG 008) */}
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    3. Registro de Avaliação da Eficácia do Treinamento (REG 008)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Legenda: 1- Insatisfatório | 2- Regular | 3- Bom | 4- Muito Bom | 5- Excelente
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={incluirAvaliacaoImediata}
                    onChange={(e) => setIncluirAvaliacaoImediata(e.target.checked)}
                  />
                  Preencher avaliação de eficácia agora
                </label>
              </div>

              {incluirAvaliacaoImediata && (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-[11px]">
                          <th className="p-2 font-semibold">Nº</th>
                          <th className="p-2 font-semibold">Participante</th>
                          {QUESITOS_EFICACIA_REG008.map((q, i) => (
                            <th
                              key={q.key}
                              className="max-w-[140px] p-2 font-semibold"
                              title={q.label}
                            >
                              Q{i + 1}. {q.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {participantesDetalhe.map((p, idx) => {
                          const av =
                            avaliacoesForm[idx] ??
                            criarAvaliacaoDefault(p.nome);
                          return (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold">{idx + 1}</td>
                              <td className="p-2 font-medium">
                                {p.nome || `Participante ${idx + 1}`}
                              </td>
                              {QUESITOS_EFICACIA_REG008.map((q) => (
                                <td key={q.key} className="p-2">
                                  <SelectNative
                                    value={String(av[q.key])}
                                    onChange={(e) =>
                                      atualizarNotaForm(
                                        idx,
                                        q.key,
                                        Number(e.target.value) as NotaEficacia,
                                      )
                                    }
                                    className="h-8 text-xs"
                                  >
                                    {([1, 2, 3, 4, 5] as const).map((nota) => (
                                      <option key={nota} value={nota}>
                                        {LEGENDA_EFICACIA_REG008[nota]}
                                      </option>
                                    ))}
                                  </SelectNative>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 pt-1 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Avaliado por *</Label>
                      <Input
                        value={avaliadoPor}
                        onChange={(e) => setAvaliadoPor(e.target.value)}
                        required={incluirAvaliacaoImediata}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data da avaliação *</Label>
                      <Input
                        type="date"
                        value={dataAvaliacao}
                        onChange={(e) => setDataAvaliacao(e.target.value)}
                        required={incluirAvaliacaoImediata}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Assinatura do avaliador *</Label>
                      <Input
                        value={assinaturaAvaliador}
                        onChange={(e) => setAssinaturaAvaliador(e.target.value)}
                        required={incluirAvaliacaoImediata}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bloco 4: Governança Documental (Elaborado / Revisado / Aprovado) */}
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Governança Documental (REG-008)
                </span>
                {podeEditarGovernanca ? (
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary text-[10px]">
                    Edição permitida (Qualidade / Diretor)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Bloqueado · Apenas Qualidade e Diretor
                  </Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Elaborado por *</Label>
                  <Input
                    value={elaboradoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setElaboradoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Revisado por *</Label>
                  <Input
                    value={revisadoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setRevisadoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Aprovado por *</Label>
                  <Input
                    value={aprovadoPor}
                    disabled={!podeEditarGovernanca}
                    readOnly={!podeEditarGovernanca}
                    onChange={(e) => setAprovadoPor(e.target.value)}
                    className={!podeEditarGovernanca ? 'bg-muted/60 cursor-not-allowed font-medium text-muted-foreground' : ''}
                    required
                  />
                </div>
              </div>
              {!podeEditarGovernanca && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Tabela bloqueada para usuários operacionais conforme governança documental LinkMed (RDC 665/22).
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createTreinamento.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                {createTreinamento.isPending
                  ? 'Salvando REG-008...'
                  : 'Registrar Treinamento (REG-008)'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização / Edição da Ficha REG-008 e Avaliação de Eficácia */}
      <Dialog
        open={Boolean(treinamentoSelecionado)}
        onOpenChange={(open) => !open && setTreinamentoSelecionado(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          {treinamentoSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle>
                  REG 008 — {treinamentoSelecionado.titulo}
                </DialogTitle>
                <DialogDescription>
                  Registro de Treinamento e Avaliação da Eficácia ·{' '}
                  {TREINAMENTO_TIPO_LABEL[treinamentoSelecionado.tipo]}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Metadados do treinamento */}
                <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Assunto:</span>
                    <p className="font-semibold text-foreground">
                      {treinamentoSelecionado.titulo}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Instrutor:</span>
                    <p className="font-semibold text-foreground">
                      {treinamentoSelecionado.instrutor || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Local / Entidade:</span>
                    <p className="font-semibold text-foreground">
                      {treinamentoSelecionado.localTreinamento ||
                        treinamentoSelecionado.entidade ||
                        'Sala de Treinamento LinkMed'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data e Horário:</span>
                    <p className="font-semibold text-foreground">
                      {treinamentoSelecionado.dataRealizacao
                        .split('-')
                        .reverse()
                        .join('/')}
                      {treinamentoSelecionado.horarioInicial
                        ? ` · ${treinamentoSelecionado.horarioInicial} às ${treinamentoSelecionado.horarioFinal || ''}`
                        : ''}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Conteúdo Programático:</span>
                    <p className="font-semibold text-foreground">
                      {treinamentoSelecionado.conteudo ||
                        treinamentoSelecionado.observacoes ||
                        'Capacitação técnica e normativa conforme POP vigente.'}
                    </p>
                  </div>
                </div>

                {/* Tabela de Avaliação da Eficácia REG-008 */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold uppercase tracking-wider text-primary">
                      Registro de Avaliação da Eficácia do Treinamento (REG 008)
                    </p>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      1- Insatisfatório | 2- Regular | 3- Bom | 4- Muito Bom | 5- Excelente
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-[11px]">
                          <th className="p-2 font-semibold">Nº</th>
                          <th className="p-2 font-semibold">Participante</th>
                          {QUESITOS_EFICACIA_REG008.map((q, i) => (
                            <th key={q.key} className="max-w-[140px] p-2 font-semibold">
                              Q{i + 1}. {q.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {editAvaliacoes.map((av, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono font-bold">{idx + 1}</td>
                            <td className="p-2 font-medium">{av.participante}</td>
                            {QUESITOS_EFICACIA_REG008.map((q) => (
                              <td key={q.key} className="p-2">
                                <SelectNative
                                  value={String(av[q.key])}
                                  onChange={(e) => {
                                    const novaNota = Number(
                                      e.target.value,
                                    ) as NotaEficacia;
                                    setEditAvaliacoes((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, [q.key]: novaNota } : item,
                                      ),
                                    );
                                  }}
                                  className="h-8 text-xs"
                                >
                                  {([1, 2, 3, 4, 5] as const).map((nota) => (
                                    <option key={nota} value={nota}>
                                      {LEGENDA_EFICACIA_REG008[nota]}
                                    </option>
                                  ))}
                                </SelectNative>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Avaliado por / Data / Assinatura */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Avaliado por</Label>
                    <Input
                      value={editAvaliadoPor}
                      onChange={(e) => setEditAvaliadoPor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={editDataAvaliacao}
                      onChange={(e) => setEditDataAvaliacao(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Assinatura</Label>
                    <Input
                      value={editAssinaturaAvaliador}
                      onChange={(e) => setEditAssinaturaAvaliador(e.target.value)}
                    />
                  </div>
                </div>

                {/* Rodapé de Governança e Revisão */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
                  <span>
                    <strong>Elaborado por:</strong>{' '}
                    {treinamentoSelecionado.elaboradoPor || 'Gestão da Qualidade'} ·{' '}
                    <strong>Revisado por:</strong>{' '}
                    {treinamentoSelecionado.revisadoPor || 'Responsável Técnico'} ·{' '}
                    <strong>Aprovado por:</strong>{' '}
                    {treinamentoSelecionado.aprovadoPor || 'Diretoria Operacional'}
                  </span>
                  <span className="font-mono">
                    Revisão 00 (01/04/2025) · Revisão 01 (30/01/2026)
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTreinamentoSelecionado(null)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  disabled={avaliarEficacia.isPending}
                  onClick={handleSalvarAvaliacaoExistente}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {avaliarEficacia.isPending
                    ? 'Salvando...'
                    : 'Salvar Avaliação de Eficácia (REG-008)'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
