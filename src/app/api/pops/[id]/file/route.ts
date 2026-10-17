import { NextResponse, type NextRequest } from 'next/server';

import { getRepositories } from '@/infra/db';
import { storageService } from '@/infra/storage';
import { requireAuth } from '@/lib/auth/require-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const { popRepository } = getRepositories();
    const { searchParams } = req.nextUrl;
    const versionId = searchParams.get('versionId');

    const version = versionId
      ? await popRepository.findVersionById(versionId)
      : await popRepository.findVersaoVigente(params.id);

    if (!version) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Versão do PDF não encontrada.' }, { status: 404 });
    }

    const dataUrl = await storageService.read(version.arquivoUrl);
    if (!dataUrl) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Arquivo não encontrado no storage.' }, { status: 404 });
    }

    // dataUrl format: data:application/pdf;base64,.....
    const base64Data = dataUrl.split(',')[1] || '';
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(pdfBuffer, {
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
