import {
  obterConteudoPop,
  type PopDocumentoCompleto,
} from './pop-catalog-content';

export function sanitizarTextoPdf(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

export function quebrarLinhas(texto: string, maxCols = 82): string[] {
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

export interface LinhaPdf {
  font: 'F1' | 'F2';
  size: number;
  y: number;
  text: string;
}

export function gerarPdfMultiPaginas(paginas: LinhaPdf[][]): Buffer {
  const numPages = paginas.length;
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  for (let i = 0; i < numPages; i += 1) {
    pageObjIds.push(5 + i * 2);
    contentObjIds.push(6 + i * 2);
  }

  const objects: string[] = [];

  // 1 0 obj: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2 0 obj: Pages
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>\nendobj\n`);

  // 3 0 obj: Font F1 (Helvetica)
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // 4 0 obj: Font F2 (Helvetica-Bold)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // Pages and Contents
  for (let i = 0; i < numPages; i += 1) {
    const pageId = pageObjIds[i]!;
    const contentId = contentObjIds[i]!;
    const linhas = paginas[i]!;

    const streamCommands = [
      'BT',
      ...linhas.map(
        (item) => `/${item.font} ${item.size.toFixed(1)} Tf 40 ${item.y.toFixed(1)} Td (${item.text}) Tj -40 -${item.y.toFixed(1)} Td`,
      ),
      'ET',
    ].join('\n');

    const streamBytes = Buffer.from(streamCommands, 'latin1');
    const streamLen = streamBytes.length;

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`,
    );

    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamCommands}\nendstream\nendobj\n`,
    );
  }

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }

  const xrefOffset = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    const off = offsets[i] ?? 0;
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'latin1');
}

export function adicionarCabecalhoRodapePop(
  linhas: LinhaPdf[],
  numPagina: number,
  totalPaginas: number,
  meta: {
    codigo: string;
    titulo: string;
    versao: string;
    elaboradoPor: string;
    revisadoPor: string;
    aprovadoPor: string;
  },
) {
  linhas.push({
    font: 'F2',
    size: 11,
    y: 810,
    text: sanitizarTextoPdf(`LINKMED - SISTEMA DE GESTAO DA QUALIDADE (RDC 665/2022)`),
  });
  linhas.push({
    font: 'F2',
    size: 10,
    y: 795,
    text: sanitizarTextoPdf(`${meta.codigo} - ${meta.titulo}`),
  });
  linhas.push({
    font: 'F1',
    size: 8,
    y: 782,
    text: sanitizarTextoPdf(`Revisao: ${meta.versao} | Pagina ${numPagina} de ${totalPaginas} | Status: VIGENTE`),
  });
  linhas.push({
    font: 'F1',
    size: 7,
    y: 770,
    text: sanitizarTextoPdf(`Elaborado: ${meta.elaboradoPor} | Revisado: ${meta.revisadoPor} | Aprovado: ${meta.aprovadoPor}`),
  });

  // Linha separadora
  linhas.push({
    font: 'F1',
    size: 6,
    y: 762,
    text: '------------------------------------------------------------------------------------------------------------------------',
  });

  // Rodapé
  linhas.push({
    font: 'F1',
    size: 6.5,
    y: 25,
    text: sanitizarTextoPdf(`LinkMed Comercio e Manutencao de Equipamentos Medicos - Documento Eletronico RDC 665/2022 - Pag. ${numPagina}/${totalPaginas}`),
  });
}

/**
 * Gera documento PDF oficial completo para qualquer POP Linkmed.
 */
export function gerarPdfPopCompleto(codigo: string, hashArquivo = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'): Buffer {
  const doc = obterConteudoPop(codigo);
  const metaHeader = {
    codigo: doc.codigo,
    titulo: doc.titulo,
    versao: String(doc.versaoLabel).padStart(2, '0'),
    elaboradoPor: doc.elaboradoPor,
    revisadoPor: doc.revisadoPor,
    aprovadoPor: doc.aprovadoPor,
  };

  const paginas: LinhaPdf[][] = [];

  // Cria páginas dinâmicas com quebra automática
  let paginaAtual: LinhaPdf[] = [];
  let yAtual = 750;

  const pushNovaPagina = () => {
    paginas.push(paginaAtual);
    paginaAtual = [];
    yAtual = 750;
  };

  const addText = (text: string, font: 'F1' | 'F2' = 'F1', size = 9, step = 13) => {
    if (yAtual < 60) pushNovaPagina();
    paginaAtual.push({ font, size, y: yAtual, text: sanitizarTextoPdf(text) });
    yAtual -= step;
  };

  const addParagraph = (text: string, font: 'F1' | 'F2' = 'F1', size = 8.5, step = 12) => {
    for (const l of quebrarLinhas(text, 86)) {
      if (yAtual < 60) pushNovaPagina();
      paginaAtual.push({ font, size, y: yAtual, text: l });
      yAtual -= step;
    }
  };

  // Seções
  for (const secao of doc.secoes) {
    yAtual -= 6;
    addText(secao.titulo, 'F2', 9.5, 14);
    for (const p of secao.paragrafos) {
      addParagraph(p, 'F1', 8.5, 12);
    }
  }

  // Tabela de Registros
  if (doc.registros.length > 0) {
    yAtual -= 8;
    addText('REGISTROS DO SISTEMA DA QUALIDADE GERADOS POR ESTE POP', 'F2', 9.5, 14);
    for (const reg of doc.registros) {
      addText(`* ${reg.identificacao}`, 'F2', 8, 11);
      addParagraph(`   Armazenamento: ${reg.armazenamento} | Acesso: ${reg.acesso} | Retencao: ${reg.retencao}`, 'F1', 7.5, 11);
    }
  }

  // Histórico de Revisões
  if (doc.revisoes.length > 0) {
    yAtual -= 8;
    addText('HISTORICO DE REVISOES', 'F2', 9.5, 14);
    for (const rev of doc.revisoes) {
      addText(`Rev. ${rev.numero} (${rev.data}): ${rev.historico}`, 'F1', 8, 11);
    }
  }

  // Autenticidade
  yAtual -= 8;
  addText('CONTROLE DE AUTENTICIDADE E ASSINATURA ELETRONICA LGPD', 'F2', 9, 13);
  addParagraph(`Hash SHA-256 do Documento Original: ${hashArquivo}`, 'F1', 7.5, 11);
  addParagraph('Documento validado eletronicamente no SGQ LinkMed conforme resolucao ANVISA RDC 665/2022.', 'F1', 7.5, 11);

  // Fecha última página
  if (paginaAtual.length > 0) paginas.push(paginaAtual);

  // Aplica cabeçalhos com total exato de páginas
  const total = paginas.length;
  for (let i = 0; i < total; i += 1) {
    adicionarCabecalhoRodapePop(paginas[i]!, i + 1, total, metaHeader);
  }

  return gerarPdfMultiPaginas(paginas);
}

export function gerarPdfPop020Oficial(hashArquivo: string): Buffer {
  return gerarPdfPopCompleto('POP-020', hashArquivo);
}
