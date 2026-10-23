import {
  POP_020_META,
  POP_020_REGISTROS_TABLE,
  POP_020_REVISOES_TABLE,
  POP_020_SECOES,
} from './pop-020-content';

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
        (item) => `/${item.font} ${item.size} Tf 1 0 0 1 45 ${item.y} Tm (${item.text}) Tj`,
      ),
      'ET',
    ].join('\n');

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`,
    );

    objects.push(
      `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(streamCommands, 'utf8')} >>\nstream\n${streamCommands}\nendstream\nendobj\n`,
    );
  }

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

export function adicionarCabecalhoRodapePop(
  linhas: LinhaPdf[],
  pageNum: number,
  totalPaginas: number,
  params: {
    codigo: string;
    titulo: string;
    versao: string | number;
    elaboradoPor: string;
    revisadoPor: string;
    aprovadoPor: string;
  },
) {
  // Cabeçalho (Topo)
  linhas.push({ font: 'F2', size: 10, y: 808, text: 'SISTEMA DA QUALIDADE' });
  linhas.push({
    font: 'F1',
    size: 8.5,
    y: 796,
    text: `Identificacao: ${sanitizarTextoPdf(params.codigo)}   |   Revisao: ${params.versao}   |   Folha no ${String(pageNum).padStart(2, '0')} de ${String(totalPaginas).padStart(2, '0')}`,
  });
  linhas.push({
    font: 'F2',
    size: 10,
    y: 784,
    text: sanitizarTextoPdf(params.titulo).toUpperCase(),
  });
  linhas.push({
    font: 'F1',
    size: 8,
    y: 774,
    text: '--------------------------------------------------------------------------------------------------',
  });

  // Rodapé (Base)
  linhas.push({
    font: 'F1',
    size: 8,
    y: 42,
    text: '--------------------------------------------------------------------------------------------------',
  });
  linhas.push({
    font: 'F2',
    size: 7.5,
    y: 32,
    text: `ELABORADO POR: ${sanitizarTextoPdf(params.elaboradoPor).toUpperCase()}   |   REVISADO POR: ${sanitizarTextoPdf(params.revisadoPor).toUpperCase()}   |   APROVADO POR: ${sanitizarTextoPdf(params.aprovadoPor).toUpperCase()}`,
  });
  linhas.push({
    font: 'F1',
    size: 7,
    y: 22,
    text: 'LINKMED SOLUCOES MEDICAS   *   SISTEMA DE GESTAO DA QUALIDADE (RDC 665/2022)   *   DOCUMENTO CONTROLADO',
  });
}

export function gerarPdfPop020Oficial(hashArquivo: string): Buffer {
  const meta = {
    codigo: 'POP-020',
    titulo: 'Realizacao de Assistencia Tecnica de Equipamentos',
    versao: '01',
    elaboradoPor: 'Vanessa Rodrigues (30/01/2026)',
    revisadoPor: 'Rosemeri Costa (30/01/2026)',
    aprovadoPor: 'Pedro Costa (30/01/2026)',
  };

  const totalPaginas = 4;
  const paginasLinhas: LinhaPdf[][] = [[], [], [], []];

  // Helper por página
  const addText = (
    pIdx: number,
    text: string,
    font: 'F1' | 'F2' = 'F1',
    size = 9,
    step = 13,
    yRef: { val: number },
  ) => {
    paginasLinhas[pIdx]!.push({ font, size, y: yRef.val, text: sanitizarTextoPdf(text) });
    yRef.val -= step;
  };

  const addParagraph = (
    pIdx: number,
    text: string,
    font: 'F1' | 'F2' = 'F1',
    size = 9,
    step = 12,
    yRef: { val: number },
  ) => {
    for (const l of quebrarLinhas(text, 88)) {
      paginasLinhas[pIdx]!.push({ font, size, y: yRef.val, text: l });
      yRef.val -= step;
    }
  };

  // --- PÁGINA 1 ---
  adicionarCabecalhoRodapePop(paginasLinhas[0]!, 1, totalPaginas, meta);
  const y1 = { val: 755 };

  addText(0, '1. OBJETIVO', 'F2', 10, 14, y1);
  addParagraph(
    0,
    'Estabelecer os procedimentos para execucao de manutencao corretiva e preventiva em equipamentos medico-hospitalares na assistencia tecnica, garantindo seguranca, rastreabilidade e conformidade com a RDC no 665/2022.',
    'F1',
    9,
    12,
    y1,
  );
  y1.val -= 6;

  addText(0, '2. REFERENCIAS', 'F2', 10, 14, y1);
  addParagraph(
    0,
    'RDC no 665/2022 - Boas Praticas de Fabricacao de Produtos Medicos e Produtos para Diagnostico de Uso In Vitro.',
    'F1',
    9,
    12,
    y1,
  );
  y1.val -= 6;

  addText(0, '3. ABRANGENCIA', 'F2', 10, 14, y1);
  addParagraph(
    0,
    'Esse procedimento aplica-se ao Departamento de Assistencia Tecnica da LinkMed Solucoes Medicas.',
    'F1',
    9,
    12,
    y1,
  );
  y1.val -= 6;

  addText(0, '4. RESPONSABILIDADES', 'F2', 10, 14, y1);
  addParagraph(
    0,
    '* E de responsabilidade do Tecnico em Eletronica a elaboracao do documento.',
    'F1',
    8.5,
    11,
    y1,
  );
  addParagraph(
    0,
    '* E de responsabilidade do Supervisor Tecnico a revisao do documento.',
    'F1',
    8.5,
    11,
    y1,
  );
  addParagraph(
    0,
    '* E de responsabilidade do Diretor Geral da LinkMed a aprovacao do documento, conforme requisitos RDC 665/22.',
    'F1',
    8.5,
    11,
    y1,
  );
  y1.val -= 6;

  addText(0, '5. DEFINICOES', 'F2', 10, 14, y1);
  addParagraph(
    0,
    'Conforme MGQ - Manual de Gestao da Qualidade, ANEXO - 002 - Termos e Definicoes.',
    'F1',
    9,
    12,
    y1,
  );
  y1.val -= 6;

  addText(0, '6. PROCEDIMENTO', 'F2', 10, 14, y1);
  addText(0, '6.1. Materiais, Instrumentos Necessarios e EPI:', 'F2', 9, 13, y1);
  const instrumentos = [
    'Simulador de ECG, Fonte estabilizada, Manometro de calibracao, Simulador Multiparametros',
    'Multimetro digital calibrado, Ferro de solda com controle de temperatura, Exaustor de fumaca',
    'Analisador de Seguranca Eletrica, Analisador/Simulador de Desfibrilador, Termo-higrometro',
    'Bancadas aterradas com protecao eletrostatica (ESD)',
    'EPI: Luvas de procedimento, Jaleco anti-estatico, Pulseira anti-estatica aterrada, Oculos e Mascara.',
  ];
  for (const inst of instrumentos) {
    addText(0, `* ${inst}`, 'F1', 8, 11, y1);
  }
  y1.val -= 4;

  addText(0, '6.2. Contato Inicial', 'F2', 9, 13, y1);
  addParagraph(
    0,
    'A LinkMed atende captacao comercial e solicitacoes espontaneas. Contato via e-mail ou telefone. Para garantia: obrigatorio solicitar dados do solicitante, marca, modelo, no serie, descricao detalhada da falha e Nota Fiscal de compra.',
    'F1',
    8.5,
    11,
    y1,
  );

  // --- PÁGINA 2 ---
  adicionarCabecalhoRodapePop(paginasLinhas[1]!, 2, totalPaginas, meta);
  const y2 = { val: 755 };

  addText(0, '', 'F1', 1, 0, y2); // No-op to satisfy
  addText(1, '6.3. Recebimento do Equipamento', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Recebido via transportadora, correios ou entrega direta. O Apoio Tecnico/Almoxarifado realiza inspecao visual da embalagem externa registrando no REG-022 (Inspecao de Recebimento de Equipamentos). Higieniza-se o equipamento com alcool isopropilico a 70% ou quaternario de amonio conforme REG-034.',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.4. Cadastro do Equipamento', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Apos higienizacao, abre-se OS no sistema ERP com dados cadastrais do cliente, equipamento, serie, defeito relatado e acessorios. Protocolo e enviado ao cliente. Equipamento segue para Area de Recepcao (prateleiras "Aguardando Analise").',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.5. Analise do Equipamento', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Tecnico retira equipamento para bancada com REG-016, REG-009 e REG-035. Efetua testes conforme manual do fabricante e desmontagem com ferramentas isoladas/antiestaticas. Registra diagnostico na OS e no REG-016 fixando Etiqueta Cinza (Analise Completa). Se for garantia, aplica Etiqueta Laranja. Aprovado encaminhamento para orcamento: Etiqueta Amarela. Se necessitar fabrica: Etiqueta Marrom.',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.6. Controle de Temperatura e Umidade', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Equipamentos em espera sao mantidos em ambiente monitorado pelo REG-017. Faixa operacional: 0C a 30C, umidade 17% a 60% (ideal 17C a 22C, umidade 40% a 70%). Leituras registradas 2x/dia: manha (08h-11h) e tarde (14h-17h).',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.7. Elaboracao e Envio do Orcamento', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Orcamento detalhado com base na tabela de precos autorizada pela Diretoria Geral e emitido e remetido ao cliente para formalizacao.',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.8. Aprovacao do Orcamento', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Com aprovacao: fixa-se Etiqueta Azul (Orcamento Aprovado) no REG-016 e separa-se pecas. Falta de peca: Etiqueta Preta (Aguardando Pecas) e requisicao via POP-009. Recusa: Etiqueta Vermelha (Orcamento Nao Aprovado) e expedicao; para INMETRO registra no PSIE.',
    'F1',
    8.5,
    11,
    y2,
  );
  y2.val -= 5;

  addText(1, '6.9. Realizacao da Manutencao', 'F2', 9.5, 13, y2);
  addParagraph(
    1,
    'Pecas conferidas: tecnico executa manutencao na bancada aterrada com pulseira antiestatica e registra intervencoes na OS. Pecas substituidas de garantia sao segregadas e etiquetadas.',
    'F1',
    8.5,
    11,
    y2,
  );

  // --- PÁGINA 3 ---
  adicionarCabecalhoRodapePop(paginasLinhas[2]!, 3, totalPaginas, meta);
  const y3 = { val: 755 };

  addText(2, '6.10. Finalizacao do Controle de Qualidade (CQ)', 'F2', 9.5, 13, y3);
  addParagraph(
    2,
    '6.10.1 Preparacao: Inspecao dos criterios do REG-009 e REG-035, testes de desempenho e medicao de seguranca eletrica (fuga de corrente, aterramento).',
    'F1',
    8.5,
    11,
    y3,
  );
  addParagraph(
    2,
    '6.10.2 Calibracao: Uso exclusivo de padroes metrologicos com certificados RBC vigentes e registro completo no REG-030 (Controle de Verificacao da Calibracao).',
    'F1',
    8.5,
    11,
    y3,
  );
  addParagraph(
    2,
    '6.10.3 Aprovacao da Qualidade: Fixacao de etiqueta antiviolacao com data de conserto, selo IPEM/INMETRO (se aplicavel) e selagem no portal PSIE.',
    'F1',
    8.5,
    11,
    y3,
  );
  addParagraph(
    2,
    '6.10.4 Retrabalho: Nao atingindo aprovacao, retorna a bancada; persistindo anomalia, abre-se REG-020 (Nao Conformidade) e notifica-se o fabricante.',
    'F1',
    8.5,
    11,
    y3,
  );
  y3.val -= 5;

  addText(2, '6.11. Limpeza Final, Embalagem e Expedicao', 'F2', 9.5, 13, y3);
  addParagraph(
    2,
    '6.11.1 Limpeza e Desinfeccao: Nova higienizacao externa conforme REG-034 antes do acondicionamento.',
    'F1',
    8.5,
    11,
    y3,
  );
  addParagraph(
    2,
    '6.11.2 Embalagem: Acondicionado com plastico-bolha, cantoneiras e calcos de espuma. Apos aprovacao total fixa-se Etiqueta Verde (Pronto para Uso) no REG-016.',
    'F1',
    8.5,
    11,
    y3,
  );
  addParagraph(
    2,
    '6.11.3 Envio/Retirada: Emissao de NF de retorno e certificado de calibracao. Retirada pelo cliente requer termo assinado no ERP.',
    'F1',
    8.5,
    11,
    y3,
  );
  y3.val -= 6;

  addText(2, '7. ANEXOS', 'F2', 9.5, 13, y3);
  addParagraph(
    2,
    'Tabela de Etiquetas REG-016: Cinza (Analise), Laranja (Garantia), Amarela (Orcamento), Marrom (Fabrica), Azul (Aprovado), Preta (Pecas), Vermelha (Recusado), Verde (Pronto para Uso).',
    'F1',
    8.5,
    11,
    y3,
  );
  y3.val -= 6;

  addText(2, '8. CONTROLE DE REGISTROS DA QUALIDADE', 'F2', 9.5, 13, y3);
  addParagraph(
    2,
    'A tabela a seguir estabelece as diretrizes de armazenamento, protecao, retencao e disposicao dos registros gerados na realizacao da assistencia tecnica:',
    'F1',
    8,
    10,
    y3,
  );
  y3.val -= 3;

  for (const reg of POP_020_REGISTROS_TABLE.slice(0, 4)) {
    addText(2, `* ${sanitizarTextoPdf(reg.identificacao)}`, 'F2', 8, 10, y3);
    addText(
      2,
      `  Armaz: ${reg.armazenamento} | Acesso: ${reg.acesso} | Prot: ${reg.protecao} | Disp: ${reg.disposicao}`,
      'F1',
      7.5,
      10,
      y3,
    );
  }

  // --- PÁGINA 4 ---
  adicionarCabecalhoRodapePop(paginasLinhas[3]!, 4, totalPaginas, meta);
  const y4 = { val: 755 };

  addText(3, '8. CONTROLE DE REGISTROS DA QUALIDADE (Continuacao)', 'F2', 9.5, 13, y4);
  for (const reg of POP_020_REGISTROS_TABLE.slice(4)) {
    addText(3, `* ${sanitizarTextoPdf(reg.identificacao)}`, 'F2', 8, 10, y4);
    addText(
      3,
      `  Armaz: ${reg.armazenamento} | Acesso: ${reg.acesso} | Prot: ${reg.protecao} | Disp: ${reg.disposicao}`,
      'F1',
      7.5,
      10,
      y4,
    );
  }
  y4.val -= 10;

  addText(3, '9. HISTORICO DE REVISOES', 'F2', 9.5, 13, y4);
  for (const rev of POP_020_REVISOES_TABLE) {
    addText(
      3,
      `Revisao ${rev.numero} (${rev.data}): ${sanitizarTextoPdf(rev.historico)}`,
      'F1',
      8.5,
      12,
      y4,
    );
  }
  y4.val -= 14;

  addText(3, '10. CONTROLE DE AUTENTICIDADE E ASSINATURA ELETRONICA', 'F2', 9, 13, y4);
  addText(
    3,
    `Hash SHA-256 de Autenticidade RDC 665/22: ${hashArquivo || '68c48a735c023dcb4422e11ac1285bf636746ef741ef0321262d08a0d9229fc9'}`,
    'F1',
    7.5,
    11,
    y4,
  );
  addText(
    3,
    `Distribuicao Eletronica: ${POP_020_META.distribuicaoEletronica}`,
    'F1',
    7.5,
    11,
    y4,
  );
  addText(
    3,
    `Distribuicao Impressa: ${POP_020_META.distribuicaoImpressa}`,
    'F1',
    7.5,
    11,
    y4,
  );

  return gerarPdfMultiPaginas(paginasLinhas);
}

