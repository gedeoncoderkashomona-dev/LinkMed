'use client';

import * as React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  Plus,
  Search,
  Users,
} from 'lucide-react';

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
  TREINAMENTO_TIPO_LABEL,
  TREINAMENTO_TIPOS,
  type TreinamentoTipo,
} from '@/core/domain/entities/operacional';
import { agoraBR } from '@/core/domain/forms/alerts';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCreateTreinamento, useTreinamentos } from '@/hooks/use-operacional';
import { can } from '@/lib/auth/rbac';

export function TreinamentosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useTreinamentos();
  const createTreinamento = useCreateTreinamento();

  const [tipoFiltro, setTipoFiltro] = React.useState<TreinamentoTipo | ''>('');
  const [busca, setBusca] = React.useState('');
  const [dialogAberto, setDialogAberto] = React.useState(false);

  // Estado do formulário
  const [titulo, setTitulo] = React.useState('');
  const [tipo, setTipo] = React.useState<TreinamentoTipo>('interno');
  const [instrutor, setInstrutor] = React.useState('');
  const [entidade, setEntidade] = React.useState('');
  const [cargaHoraria, setCargaHoraria] = React.useState('');
  const [dataRealizacao, setDataRealizacao] = React.useState(() => agoraBR().data);
  const [validadeAte, setValidadeAte] = React.useState('');
  const [participantesTexto, setParticipantesTexto] = React.useState('');
  const [observacoes, setObservacoes] = React.useState('');
  const [erroForm, setErroForm] = React.useState<string | null>(null);

  const canCreate = user ? can(user.perfil, 'trainings:create') : false;

  const lista = React.useMemo(() => data?.treinamentos ?? [], [data?.treinamentos]);

  const filtrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((t) => {
      if (tipoFiltro && t.tipo !== tipoFiltro) return false;
      if (!q) return true;
      return (
        t.titulo.toLowerCase().includes(q) ||
        (t.instrutor && t.instrutor.toLowerCase().includes(q)) ||
        (t.entidade && t.entidade.toLowerCase().includes(q)) ||
        t.participantes.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [lista, tipoFiltro, busca]);

  const totalInternos = lista.filter((t) => t.tipo === 'interno').length;
  const totalExternos = lista.filter((t) => t.tipo === 'externo').length;
  const totalParticipacoes = lista.reduce((acc, t) => acc + t.participantes.length, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);

    if (titulo.trim().length < 3) {
      setErroForm('Informe o título do treinamento.');
      return;
    }
    if (tipo === 'externo' && !entidade.trim()) {
      setErroForm('Informe a entidade responsável pelo treinamento externo.');
      return;
    }

    const participantes = participantesTexto
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createTreinamento.mutateAsync({
        titulo: titulo.trim(),
        tipo,
        instrutor: instrutor.trim() || null,
        entidade: tipo === 'externo' ? entidade.trim() : null,
        cargaHoraria: cargaHoraria ? Number(cargaHoraria) : null,
        dataRealizacao,
        validadeAte: validadeAte || null,
        participantes,
        observacoes: observacoes.trim() || null,
      });

      setTitulo('');
      setInstrutor('');
      setEntidade('');
      setCargaHoraria('');
      setValidadeAte('');
      setParticipantesTexto('');
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Capacitações e Treinamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de treinamentos internos (POPs) e externos (fabricantes / entidades acreditadas).
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Registrar Treinamento
          </Button>
        )}
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
            <p className="text-xs text-muted-foreground">Registros ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Internos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{totalInternos}</p>
            <p className="text-xs text-muted-foreground">POPs e rotinas internas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Externos
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
              Participações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalParticipacoes}</p>
            <p className="text-xs text-muted-foreground">Colaboradores capacitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, instrutor, entidade ou participante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TreinamentoTipo | '')}
          >
            <option value="">Todos os tipos</option>
            {TREINAMENTO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {TREINAMENTO_TIPO_LABEL[t]}
              </option>
            ))}
          </SelectNative>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhum treinamento encontrado.</p>
            <p className="text-xs text-muted-foreground">
              Registre treinamentos internos ou externos para comprovação normativa (RDC 665/22).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={t.tipo === 'externo' ? 'success' : 'default'}
                      >
                        {TREINAMENTO_TIPO_LABEL[t.tipo]}
                      </Badge>
                      {t.cargaHoraria && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {t.cargaHoraria}h
                        </Badge>
                      )}
                      {t.entidade && (
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {t.entidade}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t.titulo}</p>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Realizado em{' '}
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
                </div>

                {t.instrutor && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Instrutor:</strong> {t.instrutor}
                  </p>
                )}

                {t.participantes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Participantes ({t.participantes.length}):
                    </span>
                    {t.participantes.map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {t.observacoes && (
                  <p className="text-xs text-muted-foreground">{t.observacoes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Registro de Treinamento */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Treinamento</DialogTitle>
            <DialogDescription>
              Cadastre capacitações internas (POPs) ou externas (fabricantes e instituições).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {erroForm && (
              <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600">
                {erroForm}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tr-titulo">Título do treinamento *</Label>
              <Input
                id="tr-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Treinamento POP-020 e Manutenção de Incubadoras Olidef"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tr-tipo">Modalidade *</Label>
                <SelectNative
                  id="tr-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TreinamentoTipo)}
                >
                  {TREINAMENTO_TIPOS.map((tp) => (
                    <option key={tp} value={tp}>
                      {TREINAMENTO_TIPO_LABEL[tp]}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tr-carga">Carga horária (horas)</Label>
                <Input
                  id="tr-carga"
                  type="number"
                  step="0.5"
                  value={cargaHoraria}
                  onChange={(e) => setCargaHoraria(e.target.value)}
                  placeholder="Ex: 8"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tr-instrutor">Instrutor / Responsável</Label>
                <Input
                  id="tr-instrutor"
                  value={instrutor}
                  onChange={(e) => setInstrutor(e.target.value)}
                  placeholder="Nome do instrutor"
                />
              </div>

              {tipo === 'externo' && (
                <div className="space-y-1.5">
                  <Label htmlFor="tr-entidade">Entidade / Fabricante *</Label>
                  <Input
                    id="tr-entidade"
                    value={entidade}
                    onChange={(e) => setEntidade(e.target.value)}
                    placeholder="Ex: Olidef / TEB"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tr-data">Data de realização *</Label>
                <Input
                  id="tr-data"
                  type="date"
                  value={dataRealizacao}
                  onChange={(e) => setDataRealizacao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tr-validade">Validade do certificado (opcional)</Label>
                <Input
                  id="tr-validade"
                  type="date"
                  value={validadeAte}
                  onChange={(e) => setValidadeAte(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-participantes">
                Participantes (separe por vírgula ou um por linha)
              </Label>
              <Textarea
                id="tr-participantes"
                rows={3}
                value={participantesTexto}
                onChange={(e) => setParticipantesTexto(e.target.value)}
                placeholder="Ex: Carlos Silva, Ana Souza, Marcos Oliveira"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-obs">Observações / Conteúdo programático</Label>
              <Textarea
                id="tr-obs"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
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
                {createTreinamento.isPending ? 'Salvando...' : 'Salvar Treinamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
