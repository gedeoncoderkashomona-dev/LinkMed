import { NextResponse, type NextRequest } from 'next/server';

import { SETOR_LABEL } from '@/core/domain/enums/pop';
import {
  adicionarCabecalhoRodapePop,
  gerarPdfMultiPaginas,
  gerarPdfPop020Oficial,
  quebrarLinhas,
  sanitizarTextoPdf,
  type LinhaPdf,
} from '@/core/domain/pops/pop-pdf-generator';
import { getRepositories } from '@/infra/db';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';

export const runtime = 'nodejs';

/**
 * Gera um documento PDF válido (ISO 32000-1) para outros POPs simulados/seed.
 */
function gerarPdfPopGenerico(params: {
  codigo: string;
  titulo: string;
  setor: string;
  versao: number;
  periodicidadeMeses: number;
  descricao: string;
  elaboradoPor: string;
  revisadoPor: string;
  aprovadoPor: string;
  hashArquivo: string;
  publicadoEm: string;
}): Buffer {
  const paginas: LinhaPdf[][] = [[]];
  const linhas = paginas[0]!;

  adicionarCabecalhoRodapePop(linhas, 1, 1, {
    codigo: params.codigo,
    titulo: params.titulo,
    versao: `0${params.versao}`,
    elaboradoPor: params.elaboradoPor,
    revisadoPor: params.revisadoPor,
    aprovadoPor: params.aprovadoPor,
  });

  let y = 755;
  const add = (text: string, font: 'F1' | 'F2' = 'F1', size = 9.5, step = 14) => {
    linhas.push({ font, size, y, text: sanitizarTextoPdf(text) });
    y -= step;
  };

  add('1. OBJETIVO E ESCOPO DO PROCEDIMENTO', 'F2', 10, 15);
  for (const l of quebrarLinhas(params.descricao || 'Procedimento operacional padrao estabelecido conforme Boas Praticas de Fabricacao e Assistencia Tecnica (RDC 665/2022 - ANVISA).', 88)) {
    add(`   ${l}`, 'F1', 9, 13);
  }
  y -= 8;

  add('2. SETOR RESPONSAVEL E PERIODICIDADE DE REVISAO', 'F2', 10, 15);
  add(`   Setor de Aplicacao: ${params.setor}`, 'F1', 9, 13);
  add(`   Periodicidade de Revisao Vigente: a cada ${params.periodicidadeMeses} meses`, 'F1', 9, 13);
  add(`   Data de Publicacao: ${params.publicadoEm}`, 'F1', 9, 13);
  y -= 8;

  add('3. DIRETRIZES DE EXECUCAO E BOAS PRATICAS', 'F2', 10, 15);
  add('   * Cumprimento integral dos passos descritos nas instrucoes tecnicas de trabalho;', 'F1', 8.5, 12);
  add('   * Preenchimento fidedigno e contemporaneo de todos os registros (REGs) aplicaveis;', 'F1', 8.5, 12);
  add('   * Notificacao imediata da Gestao da Qualidade em caso de desvios ou nao conformidades;', 'F1', 8.5, 12);
  add('   * Uso obrigatorio dos EPIs e equipamentos calibrados com certificados RBC.', 'F1', 8.5, 12);
  y -= 12;

  add('4. CONTROLE DE AUTENTICIDADE E ASSINATURA ELETRONICA', 'F2', 9.5, 14);
  add(`   Hash SHA-256 do Documento Original: ${params.hashArquivo}`, 'F1', 7.5, 11);
  add('   Documento validado eletronicamente no SGQ LinkMed conforme resolucao ANVISA RDC 665/2022.', 'F1', 7.5, 11);

  return gerarPdfMultiPaginas(paginas);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();

    const { popRepository } = getRepositories();
    const { searchParams } = req.nextUrl;
    const versionId = searchParams.get('versionId');

    const [pop, version] = await Promise.all([
      popRepository.findById(params.id),
      versionId
        ? popRepository.findVersionById(versionId)
        : popRepository.findVersaoVigente(params.id),
    ]);

    if (!version || !pop) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Versão do PDF não encontrada.' },
        { status: 404 },
      );
    }

    const dataUrl = await storageService.read(version.arquivoUrl);
    let pdfBuffer: Buffer;

    if (dataUrl) {
      const base64Data = dataUrl.split(',')[1] || '';
      pdfBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const isPop020 =
        pop.codigo === 'POP-020' ||
        pop.codigo.includes('020') ||
        pop.titulo.toLowerCase().includes('assistencia tecnica');

      if (isPop020) {
        pdfBuffer = gerarPdfPop020Oficial(version.hashArquivo);
      } else {
        pdfBuffer = gerarPdfPopGenerico({
          codigo: pop.codigo,
          titulo: pop.titulo,
          setor: SETOR_LABEL[pop.setor] ?? pop.setor,
          versao: version.numeroVersao,
          periodicidadeMeses: pop.periodicidadeRevisaoMeses,
          descricao: pop.descricao ?? '',
          elaboradoPor: pop.elaboradoPor ?? 'Vanessa Ribeiro (Gestão da Qualidade)',
          revisadoPor: pop.revisadoPor ?? 'Marina Lopes (Responsável Técnica)',
          aprovadoPor: pop.aprovadoPorNome ?? 'Pedro Costa (Diretoria)',
          hashArquivo: version.hashArquivo,
          publicadoEm: version.publicadoEm
            ? new Date(version.publicadoEm).toLocaleDateString('pt-BR')
            : new Date(version.createdAt).toLocaleDateString('pt-BR'),
        });
      }
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${version.arquivoNome}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Acesso negado.' }, { status: 401 });
  }
}
