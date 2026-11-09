'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
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
  type SetorFormulario,
} from '@/core/domain/forms/definitions';
import { TAG_SPECS_LIST } from '@/core/domain/forms/os-workflow';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFormsOverview } from '@/hooks/use-operacional';
import { cn } from '@/lib/utils';

export function FormulariosClient() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useFormsOverview();
  const [setor, setSetor] = React.useState<SetorFormulario | ''>('');
  const [busca, setBusca] = React.useState('');
  const [mostrarLegendaCores, setMostrarLegendaCores] = React.useState(false);

  // Filtragem estrita por perfil de setor conforme ata da reunião e auditoria Linkmed
  const formulariosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    const perfil = user?.perfil;

    return FORM_DEFS.filter((f) => {
      // 1. Restrição estrita por setor de login
      if (perfil === 'adm') {
        // ADM vê exclusivamente recebimento (REG 022) e iniciação/etapas (REG 016)
        if (f.tipo !== 'inspecao-recebimento' && f.tipo !== 'etapas-manutencao') {
          return false;
        }
      } else if (perfil === 'estoquista') {
        // Almoxarifado vê exclusivamente temperatura e umidade do setor (REG 017)
        if (f.tipo !== 'temperatura-umidade') {
          return false;
        }
      } else if (perfil === 'tecnico') {
        // Técnico vê formulários pertinentes à Assistência Técnica
        if (
          f.tipo !== 'limpeza-equipamento' &&
          f.tipo !== 'etapas-manutencao' &&
          f.tipo !== 'checklist-manutencao' &&
          f.tipo !== 'higienizacao-bancada' &&
          f.tipo !== 'pulseira-antiestatica' &&
          f.tipo !== 'validade-calibracao'
        ) {
          return false;
        }
      }

      // 2. Filtro do dropdown de setor se preenchido
      if (setor && !f.setores.includes(setor)) return false;

      // 3. Busca por texto
      if (!q) return true;
      return (
        f.titulo.toLowerCase().includes(q) ||
        f.descricao.toLowerCase().includes(q) ||
        (f.reg && f.reg.toLowerCase().includes(q)) ||
        (f.pastaPop && f.pastaPop.toLowerCase().includes(q))
      );
    });
  }, [setor, busca, user?.perfil]);

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

      {/* Catálogo Oficial de Documentos — Seção 1 da Auditoria Linkmed */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <FileCheck2 className="h-4 w-4" />
          <span>
            {user?.perfil === 'adm'
              ? 'Formulários Habilitados para o Setor Administrativo (ADM):'
              : user?.perfil === 'estoquista'
              ? 'Formulários Habilitados para o Almoxarifado / Estoque:'
              : user?.perfil === 'tecnico'
              ? 'Formulários Habilitados para a Assistência Técnica (AT):'
              : 'Catálogo Geral de Formulários Oficiais Linkmed (RDC 665/22):'}
          </span>
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
                return item.codigo !== 'REG-022';
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

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
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

            return (
              <Card
                key={def.tipo}
                className="flex flex-col justify-between transition-shadow hover:shadow-card"
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

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {total} {total === 1 ? 'registro' : 'registros'}
                    </span>
                    <Link href={`/formularios/${def.tipo}`}>
                      <Button size="sm">
                        Acessar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
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
