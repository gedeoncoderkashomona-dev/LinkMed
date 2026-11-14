'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Lock,
  PackageCheck,
  Search,
  Tag,
  UserCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Skeleton } from '@/components/ui/skeleton';
import { DOCUMENTOS_OFICIAIS_POR_MODULO } from '@/core/domain/entities/operacional';
import {
  FORM_DEFS,
  SETOR_FORM_LABEL,
  type FormDef,
  type FormTipo,
  type SetorFormulario,
} from '@/core/domain/forms/definitions';
import { mergeOsFluxoIntoServiceOrders } from '@/core/domain/forms/os-reg016-sync';
import {
  aggregateServiceOrders,
  TAG_SPECS_LIST,
  verificarPreRequisitoFormularioPop020,
} from '@/core/domain/forms/os-workflow';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFormsOverview, useOsFlowList } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

/**
 * Ordem operacional estrita conforme Trilha de Execução POP-020 e Auditoria Linkmed:
 * 1. REG 022 (Inspeção de Recebimento - ADM)
 * 2. REG 034 (Limpeza / Higienização de Equipamentos - AT)
 * 3. REG 016 (Etapas da Manutenção & Etiquetas - Central AT / ADM / Almox)
 * 4. REG 009 / REG 035 (Checklist Final Pós-Serviço — visível somente após Etiqueta VERDE no REG 016)
 * 5. REG 018 (Higienização de Bancada - POP 006 - AT)
 * 6. REG 017 (Temperatura e Umidade - POP 007 - AT e Almoxarifado)
 * 7. REG 040 (Teste da Pulseira Antiestática - POP 007 - AT)
 * 8. REG 015 (Instrumentos de Medição e Validades - POP 011 - AT)
 * 9. REG 030 (Verificação da Calibração Interna vinculada ao REG 015 - POP 011 - AT)
 */
const ORDEM_OPERACIONAL_TIPOS: Record<FormTipo, number> = {
  'inspecao-recebimento': 1,
  'limpeza-equipamento': 2,
  'etapas-manutencao': 3,
  'checklist-manutencao': 4,
  'higienizacao-bancada': 5,
  'temperatura-umidade': 6,
  'pulseira-antiestatica': 7,
  'validade-calibracao': 8,
  'verificacao-calibracao': 9,
};

export function FormulariosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useFormsOverview();
  const { data: osFlowData } = useOsFlowList();
  const [setor, setSetor] = React.useState<SetorFormulario | ''>('');
  const [busca, setBusca] = React.useState('');
  const [osSelecionadaChave, setOsSelecionadaChave] = React.useState('');
  const [mostrarLegendaCores, setMostrarLegendaCores] = React.useState(false);

  const ordensServico = React.useMemo(
    () =>
      mergeOsFluxoIntoServiceOrders(
        osFlowData?.ordens ?? [],
        aggregateServiceOrders(data?.records ?? []),
      ),
    [osFlowData?.ordens, data?.records],
  );

  const osAtiva = React.useMemo(
    () => ordensServico.find((o) => o.chave === osSelecionadaChave) ?? null,
    [ordensServico, osSelecionadaChave],
  );

  const resumoPop020Geral = React.useMemo(() => {
    const temReg022 = ordensServico.some((o) => o.etapasConcluidas.reg022Recebimento);
    const temReg034 = ordensServico.some((o) => o.etapasConcluidas.reg034Limpeza);
    const temEtiquetaVerde = ordensServico.some(
      (o) => o.tagColor === 'GREEN' || o.etapasConcluidas.reg035Manutencao,
    );
    return { temReg022, temReg034, temEtiquetaVerde };
  }, [ordensServico]);

  const avaliarAcessoFormulario = React.useCallback(
    (tipo: FormTipo) => {
      if (osAtiva) {
        const res = verificarPreRequisitoFormularioPop020(tipo, osAtiva);
        return { ...res, osDestinoChave: osAtiva.chave };
      }

      if (tipo === 'limpeza-equipamento') {
        const candidata = ordensServico.find(
          (o) => o.etapasConcluidas.reg022Recebimento && !o.etapasConcluidas.reg034Limpeza,
        ) ?? ordensServico.find((o) => o.etapasConcluidas.reg022Recebimento);
        if (!resumoPop020Geral.temReg022) {
          return {
            visivel: true,
            liberado: false,
            motivo: 'Pré-requisito obrigatório (POP-020): nenhuma OS concluída no REG-022 ainda.',
            osDestinoChave: null,
          };
        }
        return { visivel: true, liberado: true, motivo: null, osDestinoChave: candidata?.chave ?? null };
      }

      if (tipo === 'etapas-manutencao') {
        const candidata = ordensServico.find((o) => o.etapasConcluidas.reg034Limpeza);
        if (!resumoPop020Geral.temReg034) {
          return {
            visivel: true,
            liberado: false,
            motivo:
              'Pré-requisito obrigatório (POP-020): conclua antes o REG-034 (Higienização) de alguma OS.',
            osDestinoChave: null,
          };
        }
        return { visivel: true, liberado: true, motivo: null, osDestinoChave: candidata?.chave ?? null };
      }

      if (tipo === 'checklist-manutencao') {
        const candidataVerde = ordensServico.find((o) => o.tagColor === 'GREEN');
        if (!candidataVerde) {
          return {
            visivel: false,
            liberado: false,
            motivo:
              'Pré-requisito obrigatório (POP-020): o REG-035 só fica visível após acionar a Etiqueta VERDE no REG-016.',
            osDestinoChave: null,
          };
        }
        return {
          visivel: true,
          liberado: true,
          motivo: null,
          osDestinoChave: candidataVerde.chave,
        };
      }

      return { visivel: true, liberado: true, motivo: null, osDestinoChave: null };
    },
    [osAtiva, ordensServico, resumoPop020Geral],
  );

  // Filtragem, visibilidade condicional e ordenação estrita POP-020
  const formulariosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    const perfil = user?.perfil;

    const filtrados = FORM_DEFS.filter((f: FormDef) => {
      // 1. Restrição estrita por setor de login
      if (perfil === 'adm') {
        // ADM vê exclusivamente recebimento (REG 022) e etapas/orçamento da OS (REG 016)
        if (f.tipo !== 'inspecao-recebimento' && f.tipo !== 'etapas-manutencao') {
          return false;
        }
      } else if (perfil === 'estoquista') {
        // Almoxarifado vê exclusivamente o controle diário de temperatura e umidade do setor (REG 017)
        if (f.tipo !== 'temperatura-umidade') {
          return false;
        }
      } else if (perfil === 'tecnico') {
        // Assistência Técnica (AT) vê todos os seus REGs técnicos e diários (exceto REG 022 que é exclusivo do ADM)
        if (f.tipo === 'inspecao-recebimento') {
          return false;
        }
      }

      // 2. Condicional de visibilidade do REG-035 vinculada à Etiqueta VERDE no fluxo
      if (!avaliarAcessoFormulario(f.tipo).visivel) {
        return false;
      }

      // 3. Filtro do dropdown de setor se preenchido
      if (setor && !f.setores.includes(setor)) return false;

      // 4. Busca por texto
      if (!q) return true;
      return (
        f.titulo.toLowerCase().includes(q) ||
        f.descricao.toLowerCase().includes(q) ||
        (f.reg && f.reg.toLowerCase().includes(q)) ||
        (f.pastaPop && f.pastaPop.toLowerCase().includes(q))
      );
    });

    return [...filtrados].sort(
      (a, b) => (ORDEM_OPERACIONAL_TIPOS[a.tipo] ?? 99) - (ORDEM_OPERACIONAL_TIPOS[b.tipo] ?? 99),
    );
  }, [setor, busca, user?.perfil, avaliarAcessoFormulario]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Formulários Operacionais (REGs)
          </h1>
          <p className="text-sm text-muted-foreground">
            Checklists e registros da Assistência Técnica, Almoxarifado e Administrativo (ADM) setorizados conforme Auditoria Linkmed v2 (RDC 665/22).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarLegendaCores((v) => !v)}
          >
            <Tag className="h-4 w-4" />
            {mostrarLegendaCores ? 'Ocultar Etiquetas REG-016' : 'Legenda de Etiquetas (REG-016)'}
          </Button>
          <Link href="/equipamentos">
            <Button size="sm" variant="secondary">
              Fila de OS / Equipamentos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Catálogo Oficial de Documentos por Setor — Seção 1 da Auditoria Linkmed */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <FileCheck2 className="h-4 w-4" />
            <span>
              {user?.perfil === 'adm'
                ? 'REGs Exclusivos do Setor Administrativo (ADM):'
                : user?.perfil === 'estoquista'
                ? 'REGs Exclusivos do Almoxarifado / Estoque:'
                : user?.perfil === 'tecnico'
                ? 'REGs Exclusivos da Assistência Técnica (AT — Ordem Operacional):'
                : 'Catálogo Geral de Formulários Oficiais Linkmed (RDC 665/22):'}
            </span>
          </div>
          {user?.perfil === 'estoquista' && (
            <Link href="/equipamentos">
              <Button size="sm" variant="default" className="h-7 gap-1.5 text-xs">
                <PackageCheck className="h-3.5 w-3.5" />
                Ir para Separação de Peças da OS (Bloco P)
              </Button>
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENTOS_OFICIAIS_POR_MODULO.formularios
            .filter((item) => {
              if (user?.perfil === 'adm') {
                return item.codigo === 'REG-022' || item.codigo === 'REG-016';
              }
              if (user?.perfil === 'estoquista') {
                return item.codigo === 'REG-017';
              }
              if (user?.perfil === 'tecnico') {
                if (item.codigo === 'REG-022') return false;
                if (
                  (item.codigo === 'REG-035' || item.codigo === 'REG-009') &&
                  !resumoPop020Geral.temEtiquetaVerde
                ) {
                  return false;
                }
                return true;
              }
              if (
                (item.codigo === 'REG-035' || item.codigo === 'REG-009') &&
                !resumoPop020Geral.temEtiquetaVerde
              ) {
                return false;
              }
              return true;
            })
            .map((item) => (
              <button
                key={item.codigo}
                type="button"
                onClick={() => setBusca(item.codigo)}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-background px-2.5 py-1 text-[11px] font-medium transition hover:border-primary hover:bg-primary/10"
              >
                <span className="font-mono font-bold text-primary">{item.codigo}</span>
                <span className="text-muted-foreground">— Pasta: {item.pastaPop}</span>
              </button>
            ))}
        </div>
        {user?.perfil !== 'estoquista' && (
          <p className="text-[11px] text-muted-foreground">
            <strong>Trilha POP-020:</strong> REG-022 → REG-034 → REG-016 → REG-035. Cada registro só é liberado após o anterior estar concluído; o{' '}
            <span className="font-mono font-semibold text-foreground">REG-035 / REG-009</span>{' '}
            só aparece quando a{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Etiqueta VERDE</span>{' '}
            é acionada no REG-016.
          </p>
        )}
      </div>

      {/* Legenda Oficial das 10 Etiquetas do REG-016 (Auditoria Linkmed - Seção 4.1) */}
      {mostrarLegendaCores && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" />
                Legenda Oficial das 10 Etiquetas de Status da OS (REG-016 · Seção 4.1)
              </span>
              <Badge variant="outline" className="text-xs uppercase font-mono">
                RDC 665/2022
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TAG_SPECS_LIST.map((t) => (
                <div
                  key={t.color}
                  className="rounded-lg border border-border bg-card p-2.5 space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                        t.badgeClass,
                      )}
                    >
                      <Tag className="h-3 w-3" />
                      {t.nomeCor}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.comoMarcada}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground text-xs">{t.labelStatus}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    <strong>Como é marcada:</strong> {t.comoMarcada}
                  </p>
                  {t.color === 'RED' && (
                    <Badge variant="destructive" className="text-[10px] mt-1">
                      Bloqueia Item 5 do REG 016
                    </Badge>
                  )}
                  {t.color === 'BLACK' && (
                    <Badge variant="warning" className="text-[10px] mt-1">
                      OS em Stand-by (Pausada)
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros + Seleção opcional de OS da Trilha POP-020 */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_200px_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do formulário, código (ex: REG-016) ou pasta POP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <SelectNative
            value={setor}
            onChange={(e) => setSetor(e.target.value as SetorFormulario | '')}
          >
            <option value="">Todos os setores</option>
            {(Object.keys(SETOR_FORM_LABEL) as SetorFormulario[]).map((s) => (
              <option key={s} value={s}>
                {SETOR_FORM_LABEL[s]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={osSelecionadaChave}
            onChange={(e) => setOsSelecionadaChave(e.target.value)}
          >
            <option value="">Todas as OS (visão geral)</option>
            {ordensServico.map((o) => (
              <option key={o.chave} value={o.chave}>
                OS {o.numeroOs} — {o.equipamento} ({o.marca})
              </option>
            ))}
          </SelectNative>
        </CardContent>
      </Card>

      {/* Grid de Formulários */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : formulariosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhum formulário encontrado.</p>
            <p className="text-xs text-muted-foreground">
              Ajuste o filtro de busca ou verifique as permissões do seu setor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formulariosFiltrados.map((def) => {
            const resumo = data?.contagens[def.tipo];
            const total = resumo?.total ?? 0;
            const nc = resumo?.naoConformes ?? 0;
            const acesso = avaliarAcessoFormulario(def.tipo);
            const hrefDestino = acesso.osDestinoChave
              ? `/formularios/${def.tipo}?os=${encodeURIComponent(acesso.osDestinoChave)}`
              : `/formularios/${def.tipo}`;

            return (
              <Card
                key={def.tipo}
                className={cn(
                  'flex flex-col justify-between transition-shadow hover:shadow-card',
                  !acesso.liberado && 'border-amber-500/35 bg-muted/20 opacity-90',
                )}
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {def.reg ? (
                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                          {def.reg}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Controle
                        </Badge>
                      )}
                      {def.pastaPop && (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          {def.pastaPop}
                        </Badge>
                      )}
                    </div>
                    {nc > 0 && (
                      <Badge variant="destructive" className="text-[11px]">
                        {nc} {nc === 1 ? 'NC' : 'NCs'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base leading-snug">{def.titulo}</CardTitle>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {def.descricao}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-lg border border-border/70 bg-muted/25 px-2.5 py-1.5 text-[10px] space-y-0.5">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <UserCheck className="h-3 w-3 shrink-0 text-primary" />
                      <span>Elaborado:</span>
                      <strong className="truncate text-foreground font-medium">
                        {def.responsaveis.elaboradoPor}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <UserCheck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Aprovado:</span>
                      <strong className="truncate text-foreground font-medium">
                        {def.responsaveis.aprovadoPor}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {def.setores.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {SETOR_FORM_LABEL[s]}
                      </span>
                    ))}
                  </div>

                  {!acesso.liberado && acesso.motivo && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>{acesso.motivo}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {total} {total === 1 ? 'registro' : 'registros'}
                    </span>
                    {acesso.liberado ? (
                      <Link href={hrefDestino}>
                        <Button size="sm">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Acessar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="cursor-not-allowed">
                        <Lock className="h-3.5 w-3.5" />
                        Bloqueado
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
