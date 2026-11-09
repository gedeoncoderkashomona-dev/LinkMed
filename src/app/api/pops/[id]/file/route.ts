import { NextResponse, type NextRequest } from 'next/server';

import {
  gerarPdfPopCompleto,
} from '@/core/domain/pops/pop-pdf-generator';
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

    let pdfBuffer: Buffer;

    if (version?.arquivoUrl) {
      const dataUrl = await storageService.read(version.arquivoUrl);
      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1] || '';
        pdfBuffer = Buffer.from(base64Data, 'base64');
      } else {
        pdfBuffer = gerarPdfPopCompleto(pop.codigo, version.hashArquivo);
      }
    } else {
      pdfBuffer = gerarPdfPopCompleto(pop.codigo);
    }

    const nomeArquivo = `${pop.codigo}-v01.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Acesso negado.' }, { status: 401 });
  }
}
