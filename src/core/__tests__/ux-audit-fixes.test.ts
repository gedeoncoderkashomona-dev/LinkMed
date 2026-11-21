import { describe, expect, it } from 'vitest';

import {
  gerarAvisosOsV4,
  usuarioPodeConfirmarAvisoSetor,
} from '@/core/domain/forms/os-notices';
import { criarOsViaReg022, type AtorAcaoOS } from '@/core/domain/forms/os-workflow';
import { obterConteudoPop } from '@/core/domain/pops/pop-catalog-content';
import { gerarPdfPopCompleto } from '@/core/domain/pops/pop-pdf-generator';
import { traduzirMensagemZod } from '@/lib/http/api-handler';

const ATOR_ADM: AtorAcaoOS = {
  usuarioId: 'u-adm',
  usuarioNome: 'Adm Teste',
  perfil: 'adm',
  dataHora: new Date('2026-11-20T12:00:00Z'),
};

describe('Auditorias UX/UI & Português — Avisos de OS, POPs e Zod', () => {
  it('gerarAvisosOsV4 retorna lista vazia quando não há OS no banco (sem sementes fictícias)', () => {
    const avisos = gerarAvisosOsV4([]);
    expect(avisos).toEqual([]);
  });

  it('gerarAvisosOsV4 exibe atalho setorial correto (sem REG-034 para Almoxarifado e com Item 5 D8 para AT)', () => {
    const osAt = criarOsViaReg022({
      numeroOs: 'OS-2026-0901',
      identificacao: {
        cliente: 'Hospital Esperança',
        equipamento: 'Monitor',
        marca: 'Cardios',
        modelo: 'M-1',
        numeroSerie: 'SN-1',
      },
      ator: ATOR_ADM,
    });
    osAt.v4No = 'EM_EXECUCAO';
    osAt.setorPendente = 'AT';
    osAt.etiquetaAtual = 'BLUE';
    osAt.reg034Preenchido = true;
    osAt.item5Preenchido = false;
    osAt.v4Estado = {
      no: 'EM_EXECUCAO',
      origem: 'orcamento',
      cancelada: false,
      etiqueta: 'AZUL',
      setor: 'AT',
      estadoGeral: 'em_andamento',
      etiquetasEfetivas: ['BRANCA', 'VIOLETA', 'CINZA', 'AMARELA', 'AZUL'],
      item5Bloqueado: false,
      versao: 10,
      efetivos: [],
      anuladosIds: [],
      visitados: [],
    };

    const osAlmox = criarOsViaReg022({
      numeroOs: 'OS-2026-0902',
      identificacao: {
        cliente: 'Hospital Português',
        equipamento: 'Incubadora',
        marca: 'OLIDEF',
        modelo: 'SC',
        numeroSerie: 'SN-2',
      },
      ator: ATOR_ADM,
    });
    osAlmox.v4No = 'P_TRIAGEM';
    osAlmox.setorPendente = 'ALMOXARIFADO';
    osAlmox.etiquetaAtual = 'BLUE';
    osAlmox.reg034Preenchido = false;

    const avisos = gerarAvisosOsV4([osAt, osAlmox]);

    const avisoAt = avisos.find((a) => a.numeroOs === 'OS-2026-0901' && a.tipoAviso === 'pendencia_etapa');
    expect(avisoAt).toBeDefined();
    expect(avisoAt?.acaoSugeridaLabel).toContain('REG-009');
    expect(avisoAt?.acaoSugeridaHref).toContain('/formularios/checklist-manutencao?os=OS-2026-0901');
    expect(avisoAt?.tagSpec?.nomeCor).toBe('Azul');

    const avisoAlmox = avisos.find((a) => a.numeroOs === 'OS-2026-0902' && a.tipoAviso === 'pendencia_etapa');
    expect(avisoAlmox).toBeDefined();
    expect(avisoAlmox?.acaoSugeridaHref).toContain('/equipamentos?os=OS-2026-0902');
    expect(avisoAlmox?.acaoSugeridaHref).not.toContain('limpeza-equipamento');
  });

  it('usuarioPodeConfirmarAvisoSetor bloqueia confirmação por setor diferente ou perfil gerencial', () => {
    expect(usuarioPodeConfirmarAvisoSetor('tecnico', 'AT')).toBe(true);
    expect(usuarioPodeConfirmarAvisoSetor('adm', 'AT')).toBe(false);
    expect(usuarioPodeConfirmarAvisoSetor('estoquista', 'ALMOXARIFADO')).toBe(true);
    expect(usuarioPodeConfirmarAvisoSetor('diretor', 'ADM')).toBe(false);
  });

  it('obterConteudoPop e gerarPdfPopCompleto preservam metadados dinâmicos de POPs customizados', () => {
    const doc = obterConteudoPop('POP-ADM-001', {
      titulo: 'Recebimento Especial Hospitalar',
      descricao: 'Procedimento personalizado de triagem.',
      versao: 3,
      elaboradoPor: 'Maria Clara (Qualidade)',
      revisadoPor: 'Marina Lopes (RT)',
      aprovadoPorNome: 'Pedro Costa (Diretor)',
      periodicidadeMeses: 12,
    });

    expect(doc.titulo).toBe('Recebimento Especial Hospitalar');
    expect(doc.versaoLabel).toBe('03');
    expect(doc.periodicidadeMeses).toBe(12);
    expect(doc.secoes[0]?.paragrafos[0]).toContain('Procedimento personalizado de triagem.');

    const pdf = gerarPdfPopCompleto('POP-ADM-001', undefined, {
      titulo: 'Recebimento Especial Hospitalar',
      versao: 3,
    });
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('traduzirMensagemZod converte erros padrão em inglês da Zod para português claro', () => {
    expect(traduzirMensagemZod('Required')).toBe('Campo obrigatório não preenchido.');
    expect(traduzirMensagemZod('String must contain at least 3 character(s)')).toBe(
      'Deve conter no mínimo 3 caractere(s).',
    );
    expect(traduzirMensagemZod('Invalid enum value. Expected ...')).toBe(
      'Valor selecionado inválido para este campo.',
    );
    expect(traduzirMensagemZod('Expected number, received string')).toBe(
      'Informe um número válido.',
    );
  });
});
