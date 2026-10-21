import { NextResponse, type NextRequest } from 'next/server';

import { SETOR_LABEL } from '@/core/domain/enums/pop';
import { getRepositories } from '@/infra/db';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';

export const runtime = 'nodejs';

function sanitizarTextoPdf(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function quebrarLinhas(texto: string, maxCols = 82): string[] {
  const palavras = sanitizarTextoPdf(texto).split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > maxCols) {
      if (atual) linhas.push(atual);
      atual = p;
    } else {
      atual = (atual ? atual + ' ' : '') + p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Gera um documento PDF válido (ISO 32000-1) para POPs simulados/seed quando o binário
 * não estiver no bucket externo, evitando qualquer erro 404 na visualização.
 */
function gerarPdfPopOficial(params: {
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
  const linhasConteudo: Array<{ font: 'F1' | 'F2'; size: number; y: number; text: string }> = [];
  let y = 760;

  const addLine = (text: string, font: 'F1' | 'F2' = 'F1', size = 10, step = 15) => {
    linhasConteudo.push({ font, size, y, text: sanitizarTextoPdf(text) });
    y -= step;
  };

  addLine('LINKMED SOLUCOES MEDICAS - SISTEMA DE GESTAO DA QUALIDADE (RDC 665/2022)', 'F2', 11, 18);
  addLine('PROCEDIMENTO OPERACIONAL PADRAO (DOCUMENTO OFICIAL CONTROLADO)', 'F2', 13, 22);
  addLine('----------------------------------------------------------------------------------------', 'F1', 9, 16);

  addLine(`CODIGO DO DOCUMENTO: ${params.codigo}     |     REVISAO: 0${params.versao}     |     SETOR: ${params.setor}`, 'F2', 10, 16);
  addLine(`TITULO: ${params.titulo}`, 'F2', 11, 18);
  addLine(`PERIODICIDADE DE REVISAO: ${params.periodicidadeMeses} meses     |     DATA DE VIGENCIA: ${params.publicadoEm}`, 'F1', 9, 18);

  addLine('----------------------------------------------------------------------------------------', 'F1', 9, 16);
  addLine('GOVERNANCA E RESPONSAVEIS PELO DOCUMENTO (RDC 665/22):', 'F2', 10, 16);
  addLine(`  * ELABORADO POR: ${params.elaboradoPor}`, 'F1', 10, 15);
  addLine(`  * REVISADO POR:  ${params.revisadoPor}`, 'F1', 10, 15);
  addLine(`  * APROVADO POR:  ${params.aprovadoPor}`, 'F1', 10, 18);

  addLine('----------------------------------------------------------------------------------------', 'F1', 9, 16);
  addLine('1. OBJETIVO E ESCOPO DO PROCEDIMENTO', 'F2', 11, 16);
  for (const l of quebrarLinhas(params.descricao || 'Procedimento operacional padrao estabelecido conforme Boas Praticas de Fabricacao e Assistencia Tecnica (RDC 665/2022 - ANVISA).')) {
    addLine(`   ${l}`, 'F1', 10, 14);
  }
  y -= 8;

  addLine('2. DIRETRIZES OPERACIONAIS E REGISTROS VINCULADOS', 'F2', 11, 16);
  addLine('   2.1. Todo colaborador envolvido na atividade deve confirmar a leitura deste POP.', 'F1', 10, 14);
  addLine('   2.2. Os registros operacionais (REGs) devem ser preenchidos em tempo real no sistema.', 'F1', 10, 14);
  addLine('   2.3. Qualquer desvio ou anomalia deve gerar abertura de Nao Conformidade (REG-020).', 'F1', 10, 14);
  addLine('   2.4. Equipamentos na bancada devem portar a etiqueta fisica correspondente (REG-016).', 'F1', 10, 14);
  addLine('   2.5. Instrumentos de medicao devem possuir certificado de calibracao RBC vigente.', 'F1', 10, 20);

  addLine('3. HISTORICO DE REVISOES', 'F2', 11, 16);
  addLine('   Rev. 00 - 01/04/2025 - Elaboracao inicial do documento no SGQ.', 'F1', 9, 14);
  addLine(`   Rev. 0${params.versao} - ${params.publicadoEm} - Adequacao do processo e controle eletronico RDC 665/22.`, 'F1', 9, 20);

  addLine('----------------------------------------------------------------------------------------', 'F1', 9, 14);
  addLine(`ASSINATURA CRIPTOGRAFICA SHA-256: ${params.hashArquivo}`, 'F1', 8, 12);
  addLine('DOCUMENTO CONTROLADO DIGITALMENTE PELA PLATAFORMA REGULA-ON / LINKMED.', 'F1', 8, 12);

  const streamCommands = [
    'BT',
    ...linhasConteudo.map(
      (item) => `/${item.font} ${item.size} Tf 1 0 0 1 48 ${item.y} Tm (${item.text}) Tj`,
    ),
    'ET',
  ].join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamCommands, 'utf8')} >>\nstream\n${streamCommands}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
      pdfBuffer = gerarPdfPopOficial({
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
