import { NextResponse, type NextRequest } from 'next/server';

import { AppError } from '@/core/domain/errors';
import { SETOR_LABEL } from '@/core/domain/enums/pop';
import { gerarPdfPopCompleto } from '@/core/domain/pops/pop-pdf-generator';
import { getRepositories } from '@/infra/db';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';

export const runtime = 'nodejs';

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

    if (!pop) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'POP não encontrado.' },
        { status: 404 },
      );
    }

    const versaoNumero = version?.numeroVersao ?? pop.versaoAtual ?? 1;
    const metaOverride = {
      titulo: pop.titulo,
      descricao: pop.descricao,
      setor: pop.setor,
      setorNome: SETOR_LABEL[pop.setor] ?? pop.setor,
      versao: versaoNumero,
      periodicidadeMeses: pop.periodicidadeRevisaoMeses,
      elaboradoPor: pop.elaboradoPor,
      revisadoPor: pop.revisadoPor,
      aprovadoPorNome: pop.aprovadoPorNome,
    };

    let pdfBuffer: Buffer;

    if (version?.arquivoUrl) {
      const dataUrl = await storageService.read(version.arquivoUrl);
      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1] || '';
        pdfBuffer = Buffer.from(base64Data, 'base64');
      } else {
        pdfBuffer = gerarPdfPopCompleto(pop.codigo, version.hashArquivo, metaOverride);
      }
    } else {
      pdfBuffer = gerarPdfPopCompleto(pop.codigo, undefined, metaOverride);
    }

    const nomeArquivo = `${pop.codigo}-v${String(versaoNumero).padStart(2, '0')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Não foi possível gerar ou baixar o PDF do POP.' },
      { status: 500 },
    );
  }
}
