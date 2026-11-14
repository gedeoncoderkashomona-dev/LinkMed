import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, ValidationError } from '@/core/domain/errors';
import {
  avaliarConformidade,
  getFormDef,
  sanitizarDados,
  validarDados,
  verificarBloqueioItem5Reg016,
  type FormDef,
  type FormTipo,
} from '@/core/domain/forms/definitions';
import { agoraBR } from '@/core/domain/forms/alerts';
import {
  buildReg016DadosFromOsFluxo,
  copiarCamposItem5DeChecklist,
  normalizarMarcaParaItem5,
} from '@/core/domain/forms/os-reg016-sync';
import {
  admMarcarEtiquetaBrancaNoReg016,
  atFinalizarServicoComEtiquetaVerde,
  atMarcarEtiquetaCinzaAnaliseCompleta,
  atMarcarEtiquetaVioleta,
  atPreencherItem5Reg016,
  atRegistrarReg034,
  confirmarNotificacaoSetor,
  criarOsViaReg022,
  isItem5Reg016Liberado,
  normalizarNumeroOs,
  type AtorAcaoOS,
  type OrdemServicoFluxoState,
} from '@/core/domain/forms/os-workflow';
import { getRepositories } from '@/infra/db';
import {
  carregarOsFluxoPorNumero,
  persistirOsFluxoNoServidor,
} from '@/infra/db/supabase/os-flow-store';
import { requireAuth } from '@/lib/auth/require-auth';
import { apiHandler } from '@/lib/http/api-handler';

export const runtime = 'nodejs';

const createSchema = z.object({
  tipo: z.string().min(1),
  subtipo: z.string().nullish(),
  dados: z.record(z.unknown()),
});

function buildReg016PatchFromRelatedForm(params: {
  tipo: FormTipo;
  dados: Record<string, unknown>;
  subtipo: string | null;
  osFluxoAtual: OrdemServicoFluxoState | null;
  reg016ExistenteDados: Record<string, unknown> | null;
  reg016ExistenteDataRef: string | null;
  reg016Def: FormDef;
}) {
  const {
    tipo,
    dados,
    subtipo,
    osFluxoAtual,
    reg016ExistenteDados,
    reg016ExistenteDataRef,
    reg016Def,
  } = params;

  if (tipo === 'checklist-manutencao') {
    const bloqueio = verificarBloqueioItem5Reg016({
      etiquetaAtual: osFluxoAtual?.etiquetaAtual,
      orcamentoReprovado: reg016ExistenteDados?.orcamento_reprovado,
    });
    if (bloqueio.bloqueado) return null;

    if (osFluxoAtual) {
      return buildReg016DadosFromOsFluxo({
        os: osFluxoAtual,
        dadosExistentes: reg016ExistenteDados,
        reg035Dados: dados,
        reg035Subtipo: subtipo,
      });
    }

    if (!reg016ExistenteDados || !reg016ExistenteDataRef) return null;
    const marcaFallback = normalizarMarcaParaItem5(String(reg016ExistenteDados.marca ?? ''));
    const copiados = copiarCamposItem5DeChecklist(dados, subtipo, marcaFallback);
    if (Object.keys(copiados).length === 0) return null;
    const dadosAtualizados = { ...reg016ExistenteDados, ...copiados };
    return {
      dados: dadosAtualizados,
      status: avaliarConformidade(reg016Def, null, dadosAtualizados),
      dataRef: reg016ExistenteDataRef,
    };
  }

  if (tipo === 'verificacao-calibracao' && reg016ExistenteDados && reg016ExistenteDataRef) {
    const dadosAtualizados = {
      ...reg016ExistenteDados,
      etiqueta_calibracao: 'C',
      __sync_atualizado_em: new Date().toISOString(),
    };
    return {
      dados: dadosAtualizados,
      status: avaliarConformidade(reg016Def, null, dadosAtualizados),
      dataRef: reg016ExistenteDataRef,
    };
  }

  return null;
}

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAuth();
  const tipo = req.nextUrl.searchParams.get('tipo');
  const { operacionalRepository } = getRepositories();

  if (!tipo) {
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const records = await operacionalRepository.listFormRecords({ limit: 300 });
    const contagens: Record<string, { total: number; naoConformes: number }> = {};
    for (const r of records) {
      if (r.dataRef < desde) continue;
      const atual = (contagens[r.tipo] ??= { total: 0, naoConformes: 0 });
      atual.total += 1;
      if (r.status === 'nao_conforme') atual.naoConformes += 1;
    }
    return { records, contagens };
  }

  const def = getFormDef(tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');

  const records = await operacionalRepository.listFormRecords({ tipo: def.tipo, limit: 100 });
  return { records };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  const body = createSchema.parse(await req.json());

  const def = getFormDef(body.tipo);
  if (!def) throw new NotFoundError('Formulário não encontrado.');
  if (!def.perfis.includes(auth.perfil)) throw new ForbiddenError();

  const subtipo = body.subtipo ?? null;
  const erros = validarDados(def, subtipo, body.dados);
  if (Object.keys(erros).length > 0) {
    throw new ValidationError('Preencha os campos obrigatórios.', erros);
  }

  const { operacionalRepository, auditService, userRepository } = getRepositories();

  // Regra Seção 7.4 (T11): Bloquear números de OS duplicados ao cadastrar o REG 022
  if (def.tipo === 'inspecao-recebimento') {
    const numOsNorm = normalizarNumeroOs(String(body.dados.numero_os ?? ''));
    if (numOsNorm) {
      const existentes = await operacionalRepository.listFormRecords({
        tipo: 'inspecao-recebimento',
        limit: 300,
      });
      const duplicado = existentes.find(
        (r) => normalizarNumeroOs(String(r.dados?.numero_os ?? '')) === numOsNorm,
      );
      if (duplicado) {
        const osExibicao = String(duplicado.dados?.numero_os ?? numOsNorm);
        throw new ValidationError(
          `Já existe uma OS com este número (${osExibicao}). Acesse a OS existente em /equipamentos?os=${encodeURIComponent(osExibicao)}.`,
          {
            numero_os: `Já existe uma OS com este número (${osExibicao}). Não são permitidas OS duplicadas.`,
          },
        );
      }
    }
  }

  let dados = sanitizarDados(def, subtipo, body.dados, auth.perfil);
  const dataRef = String(dados[def.campoData] ?? agoraBR().data);
  const numOsNorm = normalizarNumeroOs(String(dados.numero_os ?? ''));
  const reg016Def = getFormDef('etapas-manutencao')!;

  const [osFluxoInicial, reg022Existente, reg034Existente, reg016Existente] = numOsNorm
    ? await Promise.all([
        carregarOsFluxoPorNumero(numOsNorm),
        def.tipo === 'inspecao-recebimento'
          ? Promise.resolve(null)
          : operacionalRepository.findLatestFormRecordByOs('inspecao-recebimento', numOsNorm),
        def.tipo === 'limpeza-equipamento' || def.tipo === 'inspecao-recebimento'
          ? Promise.resolve(null)
          : operacionalRepository.findLatestFormRecordByOs('limpeza-equipamento', numOsNorm),
        def.tipo === 'inspecao-recebimento'
          ? Promise.resolve(null)
          : operacionalRepository.findLatestFormRecordByOs('etapas-manutencao', numOsNorm),
      ])
    : [null, null, null, null];

  // Regra estrita da Trilha POP-020: REG-022 -> REG-034 -> REG-016 -> REG-035
  if (numOsNorm) {
    if (def.tipo === 'limpeza-equipamento') {
      const reg022Ok = Boolean(osFluxoInicial?.reg022Preenchido || reg022Existente);
      if (!reg022Ok) {
        throw new ValidationError(
          'Pré-requisito obrigatório (POP-020): conclua primeiro o REG-022 (Inspeção de Recebimento) para esta OS.',
          {
            numero_os:
              'Esta OS ainda não passou pelo REG-022 (Inspeção de Recebimento do ADM).',
          },
        );
      }
    } else if (def.tipo === 'etapas-manutencao') {
      const reg034Ok = Boolean(osFluxoInicial?.reg034Preenchido || reg034Existente);
      if (!reg034Ok) {
        throw new ValidationError(
          'Pré-requisito obrigatório (POP-020): conclua primeiro o REG-034 (Limpeza e Higienização) para liberar o REG-016.',
          {
            numero_os:
              'Preencha primeiro o REG-034 (Higienização com Álcool 70%) antes de abrir ou enviar o REG-016.',
          },
        );
      }
    } else if (def.tipo === 'checklist-manutencao') {
      const bloqueioRed = verificarBloqueioItem5Reg016({
        etiquetaAtual: osFluxoInicial?.etiquetaAtual ?? String(reg016Existente?.dados?.etiqueta_atual ?? ''),
        orcamentoReprovado: reg016Existente?.dados?.orcamento_reprovado,
      });
      if (bloqueioRed.bloqueado && bloqueioRed.motivo) {
        throw new ValidationError(bloqueioRed.motivo, { numero_os: bloqueioRed.motivo });
      }
      const etiquetaVerdeAtiva =
        osFluxoInicial?.etiquetaAtual === 'GREEN' ||
        reg016Existente?.dados?.liberado_qualidade === 'C' ||
        reg016Existente?.dados?.etiqueta_verde_sem_defeito === 'C' ||
        String(reg016Existente?.dados?.etiqueta_atual ?? '').toUpperCase() === 'GREEN';
      if (!etiquetaVerdeAtiva) {
        const msg =
          'Pré-requisito obrigatório (POP-020): o REG-035 só fica disponível após acionar a Etiqueta VERDE (Serviço Finalizado) no REG-016.';
        throw new ValidationError(msg, { numero_os: msg });
      }
    }
  }

  // Preserva a marca definida pelo ADM no REG-022 para impedir erro operacional do técnico
  if (auth.perfil === 'tecnico' && (def.tipo === 'etapas-manutencao' || def.tipo === 'checklist-manutencao')) {
    const marcaAdm =
      osFluxoInicial?.identificacao.marca?.trim() ||
      String(reg022Existente?.dados?.marca ?? '').trim();
    if (marcaAdm) {
      dados = { ...dados, marca: marcaAdm };
      if (def.tipo === 'etapas-manutencao' && dados.item5_marca) {
        const marcaNorm = normalizarMarcaParaItem5(marcaAdm);
        if (marcaNorm) {
          dados.item5_marca = marcaNorm;
        }
      }
    }
  }

  const status = avaliarConformidade(def, subtipo, dados);

  const usuarioAtual = await userRepository.findById(auth.sub).catch(() => null);
  const atorAtual: AtorAcaoOS = {
    usuarioId: auth.sub,
    usuarioNome: usuarioAtual?.nomeCompleto ?? 'Colaborador Autorizado',
    perfil: auth.perfil,
  };
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  let record;
  let osFluxoAtualizado: OrdemServicoFluxoState | null = osFluxoInicial;

  if (def.tipo === 'etapas-manutencao' && numOsNorm) {
    if (dados.item5_marca) {
      const bloqueio = verificarBloqueioItem5Reg016({
        etiquetaAtual: osFluxoAtualizado?.etiquetaAtual ?? String(body.dados.etiqueta_atual ?? ''),
        orcamentoReprovado:
          dados.orcamento_reprovado ?? reg016Existente?.dados?.orcamento_reprovado,
      });
      if (bloqueio.bloqueado && bloqueio.motivo) {
        throw new ValidationError(bloqueio.motivo, { item5_marca: bloqueio.motivo });
      }
    }

    if (osFluxoAtualizado) {
      let nextOs = structuredClone(osFluxoAtualizado);
      const podeAt = ['tecnico', 'diretor', 'gestor'].includes(atorAtual.perfil);
      const podeAdm = ['adm', 'diretor', 'gestor'].includes(atorAtual.perfil);

      try {
        if (
          nextOs.passoAtual === 'A1_CRIADA_NO_REG022' &&
          dados.etiqueta_branca_adm === 'C' &&
          podeAdm
        ) {
          nextOs = admMarcarEtiquetaBrancaNoReg016(nextOs, atorAtual);
        }
        if (
          nextOs.passoAtual === 'A2_BRANCA_NOTIFICA_AT' &&
          podeAt
        ) {
          nextOs = confirmarNotificacaoSetor(nextOs, atorAtual);
        }
        if (
          nextOs.passoAtual === 'A4_REG034_PREENCHIDO' &&
          podeAt
        ) {
          nextOs = atMarcarEtiquetaVioleta(nextOs, atorAtual);
        }
        if (
          nextOs.passoAtual === 'A5_VIOLETA_HIGIENIZADO' &&
          dados.etiqueta_cinza === 'C' &&
          podeAt
        ) {
          nextOs = atMarcarEtiquetaCinzaAnaliseCompleta(nextOs, atorAtual);
        }
        if (
          (dados.liberado_qualidade === 'C' || dados.etiqueta_verde_sem_defeito === 'C') &&
          nextOs.etiquetaAtual !== 'GREEN' &&
          isItem5Reg016Liberado(nextOs.etiquetaAtual, nextOs.orcamentoAprovado) &&
          podeAt
        ) {
          nextOs = atFinalizarServicoComEtiquetaVerde(nextOs, atorAtual);
        }
        if (
          dados.item5_marca &&
          nextOs.etiquetaAtual === 'GREEN' &&
          !nextOs.item5Preenchido &&
          podeAt
        ) {
          nextOs = atPreencherItem5Reg016(nextOs, nextOs.identificacao.marca || String(dados.item5_marca), atorAtual);
        }
        osFluxoAtualizado = nextOs;
        await persistirOsFluxoNoServidor({
          estado: osFluxoAtualizado,
          usuarioId: auth.sub,
          ip,
          userAgent,
        });
      } catch {
        // Mantém estado atual caso etapa pertença a outro setor no momento
      }
    }

    const dadosCombinados = osFluxoAtualizado
      ? {
          ...buildReg016DadosFromOsFluxo({
            os: osFluxoAtualizado,
            dadosExistentes: { ...(reg016Existente?.dados ?? {}), ...dados },
          }).dados,
          ...dados,
          etiqueta_atual: osFluxoAtualizado.etiquetaAtual ?? 'WHITE',
          __sync_origem: 'form_reg016',
          __sync_passo: osFluxoAtualizado.passoAtual,
          __sync_atualizado_em: new Date().toISOString(),
        }
      : { ...(reg016Existente?.dados ?? {}), ...dados };

    record = await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
      subtipo,
      dados: dadosCombinados,
      status: avaliarConformidade(def, subtipo, dadosCombinados),
      dataRef,
      criadoPor: auth.sub,
    });
  } else {
    record = await operacionalRepository.createFormRecord({
      tipo: def.tipo,
      subtipo,
      dados,
      status,
      dataRef,
      criadoPor: auth.sub,
    });

    if (numOsNorm && def.tipo === 'inspecao-recebimento') {
      const criada = criarOsViaReg022({
        numeroOs: String(dados.numero_os ?? numOsNorm),
        identificacao: {
          cliente: String(dados.cliente ?? 'Cliente Hospitalar'),
          equipamento: String(dados.equipamento ?? 'Equipamento Médico'),
          marca: String(dados.marca ?? 'Cardios'),
          modelo: String(dados.modelo ?? 'Modelo Padrão'),
          numeroSerie: String(dados.numero_serie ?? 'S/N'),
          acessorios: String(dados.acessorios ?? ''),
          relatoCliente: String(dados.relato_cliente ?? ''),
        },
        ator: atorAtual,
      });
      osFluxoAtualizado = ['adm', 'diretor', 'gestor'].includes(atorAtual.perfil)
        ? admMarcarEtiquetaBrancaNoReg016(criada, atorAtual)
        : criada;
      await persistirOsFluxoNoServidor({
        estado: osFluxoAtualizado,
        usuarioId: auth.sub,
        ip,
        userAgent,
      });
      if (osFluxoAtualizado.etiquetaAtual) {
        const reg016Init = buildReg016DadosFromOsFluxo({
          os: osFluxoAtualizado,
          reg022Dados: dados,
        });
        await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
          subtipo: null,
          ...reg016Init,
          criadoPor: auth.sub,
        });
      }
    } else if (numOsNorm && def.tipo === 'limpeza-equipamento') {
      let baseOs = osFluxoAtualizado ? structuredClone(osFluxoAtualizado) : null;
      if (!baseOs && reg022Existente) {
        const d22 = reg022Existente.dados ?? {};
        const atorAdmFallback: AtorAcaoOS = {
          usuarioId: reg022Existente.criadoPor,
          usuarioNome: reg022Existente.criadoPorNome ?? 'Setor Administrativo (ADM)',
          perfil: 'adm',
        };
        const criada = criarOsViaReg022({
          numeroOs: String(d22.numero_os ?? numOsNorm),
          identificacao: {
            cliente: String(d22.cliente ?? dados.cliente ?? 'Cliente Hospitalar'),
            equipamento: String(d22.equipamento ?? dados.equipamento ?? 'Equipamento Médico'),
            marca: String(d22.marca ?? 'Cardios'),
            modelo: String(d22.modelo ?? 'Modelo Padrão'),
            numeroSerie: String(d22.numero_serie ?? dados.numero_serie ?? 'S/N'),
            acessorios: String(d22.acessorios ?? dados.acessorios ?? ''),
            relatoCliente: String(d22.relato_cliente ?? ''),
          },
          ator: atorAdmFallback,
        });
        baseOs = admMarcarEtiquetaBrancaNoReg016(criada, atorAdmFallback);
      }
      if (baseOs) {
        const podeAt = ['tecnico', 'diretor', 'gestor'].includes(atorAtual.perfil);
        try {
          if (
            baseOs.passoAtual === 'A1_CRIADA_NO_REG022' &&
            ['adm', 'diretor', 'gestor'].includes(atorAtual.perfil)
          ) {
            baseOs = admMarcarEtiquetaBrancaNoReg016(baseOs, atorAtual);
          }
          if (baseOs.passoAtual === 'A2_BRANCA_NOTIFICA_AT' && podeAt) {
            baseOs = confirmarNotificacaoSetor(baseOs, atorAtual);
          }
          if (baseOs.passoAtual === 'A3_AT_CONFIRMOU_PREENCHER_REG034' && podeAt) {
            baseOs = atRegistrarReg034(baseOs, atorAtual);
          }
          if (
            baseOs.passoAtual === 'A4_REG034_PREENCHIDO' &&
            dados.limpeza_realizada !== 'NC' &&
            podeAt
          ) {
            baseOs = atMarcarEtiquetaVioleta(baseOs, atorAtual);
          }
          osFluxoAtualizado = baseOs;
          await persistirOsFluxoNoServidor({
            estado: osFluxoAtualizado,
            usuarioId: auth.sub,
            ip,
            userAgent,
          });
          const reg016Sync = buildReg016DadosFromOsFluxo({
            os: osFluxoAtualizado,
            dadosExistentes: reg016Existente?.dados ?? null,
            reg022Dados: reg022Existente?.dados ?? null,
          });
          await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
            subtipo: null,
            ...reg016Sync,
            criadoPor: auth.sub,
          });
        } catch {
          // Mantém registro REG-034 salvo
        }
      }
    } else if (numOsNorm && def.tipo === 'checklist-manutencao') {
      if (
        osFluxoAtualizado &&
        osFluxoAtualizado.etiquetaAtual === 'GREEN' &&
        !osFluxoAtualizado.item5Preenchido &&
        ['tecnico', 'diretor', 'gestor'].includes(atorAtual.perfil)
      ) {
        try {
          osFluxoAtualizado = atPreencherItem5Reg016(
            structuredClone(osFluxoAtualizado),
            osFluxoAtualizado.identificacao.marca,
            atorAtual,
          );
          await persistirOsFluxoNoServidor({
            estado: osFluxoAtualizado,
            usuarioId: auth.sub,
            ip,
            userAgent,
          });
        } catch {
          // Já bloqueado acima se inválido
        }
      }
      const reg016Atualizacao = buildReg016PatchFromRelatedForm({
        tipo: def.tipo,
        dados,
        subtipo,
        osFluxoAtual: osFluxoAtualizado,
        reg016ExistenteDados: reg016Existente?.dados ?? null,
        reg016ExistenteDataRef: reg016Existente?.dataRef ?? null,
        reg016Def,
      });

      if (reg016Atualizacao) {
        await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
          subtipo: null,
          ...reg016Atualizacao,
          criadoPor: auth.sub,
        });
      }
    } else if (numOsNorm && def.tipo === 'verificacao-calibracao') {
      const reg016Atualizacao = buildReg016PatchFromRelatedForm({
        tipo: def.tipo,
        dados,
        subtipo,
        osFluxoAtual: osFluxoAtualizado,
        reg016ExistenteDados: reg016Existente?.dados ?? null,
        reg016ExistenteDataRef: reg016Existente?.dataRef ?? null,
        reg016Def,
      });

      if (reg016Atualizacao) {
        await operacionalRepository.upsertFormRecordByOs('etapas-manutencao', numOsNorm, {
          subtipo: null,
          ...reg016Atualizacao,
          criadoPor: auth.sub,
        });
      }
    }
  }

  await auditService.registrar(
    {
      usuarioId: auth.sub,
      ip,
      userAgent,
    },
    'form.create',
    'FormRecord',
    record.id,
    null,
    { tipo: def.tipo, subtipo, status },
  );

  return { record, osFluxo: osFluxoAtualizado };
});
