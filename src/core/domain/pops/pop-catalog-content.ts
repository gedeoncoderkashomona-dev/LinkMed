import {
  POP_020_META,
  POP_020_REGISTROS_TABLE,
  POP_020_REVISOES_TABLE,
  POP_020_SECOES,
  type PopRegistroItem,
  type PopRevisaoItem,
} from './pop-020-content';

export interface PopSecao {
  numero: string;
  titulo: string;
  paragrafos: string[];
}

export interface PopDocumentoCompleto {
  codigo: string;
  titulo: string;
  setor: string;
  setorNome: string;
  versao: number;
  versaoLabel: string;
  vigencia: string;
  periodicidadeMeses: number;
  elaboradoPor: string;
  revisadoPor: string;
  aprovadoPor: string;
  distribuicaoEletronica: string;
  distribuicaoImpressa: string;
  secoes: PopSecao[];
  registros: PopRegistroItem[];
  revisoes: PopRevisaoItem[];
}

export const POPS_CATALOG_DATA: Record<string, PopDocumentoCompleto> = {
  'POP-020': {
    ...POP_020_META,
    secoes: POP_020_SECOES,
    registros: POP_020_REGISTROS_TABLE,
    revisoes: POP_020_REVISOES_TABLE,
  },

  'POP-004': {
    codigo: 'POP-004',
    titulo: 'POP-004 - Treinamento de Pessoal',
    setor: 'qualidade',
    setorNome: 'Gestão da Qualidade / RH',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Quadro da Qualidade Linkmed',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Estabelecer critérios para planejamento, execução, avaliação de eficácia e registro de treinamentos para todos os colaboradores da LinkMed, atendendo aos requisitos de capacitação e competência profissional da RDC nº 665/2022 (ANVISA).',
        ],
      },
      {
        numero: '2',
        titulo: '2. REFERÊNCIAS',
        paragrafos: [
          'RDC nº 665/2022 - Boas Práticas de Fabricação e Manutenção de Dispositivos Médicos (Artigos 13 a 16).',
          'Manual da Qualidade MQ-001 LinkMed.',
        ],
      },
      {
        numero: '3',
        titulo: '3. ABRANGÊNCIA',
        paragrafos: [
          'Aplica-se a todos os setores e colaboradores da LinkMed: Assistência Técnica, Almoxarifado, Administrativo e Gestão.',
        ],
      },
      {
        numero: '4',
        titulo: '4. RESPONSABILIDADES',
        paragrafos: [
          '• Gestão da Qualidade: Elaborar o cronograma anual de treinamentos e acompanhar as listas de presença e eficácia.',
          '• Responsável Técnico / Instrutor: Conduzir os treinamentos operacionais e avaliar a eficácia dos participantes.',
          '• Colaboradores: Comparecer pontualmente, assinar a lista de presença e cumprir as instruções de trabalho.',
        ],
      },
      {
        numero: '5',
        titulo: '5. PROCEDIMENTO DE TREINAMENTO',
        paragrafos: [
          '5.1 Levantamento de Necessidades: Realizado anualmente ou sempre que houver admissão, mudança de função, revisão de POP ou identificação de não conformidade reincidente.',
          '5.2 Execução e Lista de Presença: Todo treinamento deve ser formalizado no formulário REG-008, contendo assunto, carga horária, data, horário inicial e final, instrutor e assinaturas de todos os participantes.',
          '5.3 Avaliação de Eficácia: O instrutor ou gestor avalia os participantes conforme 5 quesitos normativos (notas de 1 a 5), registrando se o treinamento foi eficaz ou se necessita de reciclagem.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-008 - REGISTRO E AVALIAÇÃO DE EFICÁCIA DE TREINAMENTO',
        armazenamento: 'NUVEM / PASTA QUALIDADE',
        acesso: 'TODOS OS SETORES',
        protecao: 'BACKUP / PERMISSÕES',
        recuperacao: 'CÓDIGO / DATA',
        retencao: '5 anos após vigência',
        disposicao: 'ARQUIVO MORTO / DELETAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão inicial conforme RDC 665/2022.' },
    ],
  },

  'POP-006': {
    codigo: 'POP-006',
    titulo: 'POP-006 - Limpeza e Higienização dos Ambientes',
    setor: 'qualidade',
    setorNome: 'Controle Ambiental e Qualidade',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Carlos Menezes (Líder Técnico)',
    revisadoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Bancadas da Assistência Técnica e Almoxarifado',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Padronizar as rotinas diárias e periódicas de limpeza, higienização e organização das bancadas e áreas de assistência técnica e almoxarifado, prevenindo contaminações cruzadas e danos aos equipamentos médicos.',
        ],
      },
      {
        numero: '2',
        titulo: '2. REFERÊNCIAS NORMATIVAS',
        paragrafos: [
          'RDC nº 665/2022 - Artigo 28 (Limpeza e Saneamento de Instalações e Equipamentos).',
        ],
      },
      {
        numero: '3',
        titulo: '3. RESPONSABILIDADES',
        paragrafos: [
          '• Técnicos de Manutenção: Higienizar bancadas antes e após cada jornada com Álcool Isopropílico / Álcool 70%.',
          '• Almoxarifado: Manter as áreas de armazenagem limpas e livres de poeira e resíduos.',
          '• Gestão da Qualidade: Inspecionar e auditar os registros no REG-018.',
        ],
      },
      {
        numero: '4',
        titulo: '4. PROCEDIMENTO DE LIMPEZA DE BANCADA',
        paragrafos: [
          '4.1 Preparo: Retirar poeira superficial com pano microfibra limpo e seco.',
          '4.2 Higienização: Aplicar álcool isopropílico 70% na superfície da manta antiestática e limpar em movimentos unidirecionais.',
          '4.3 Registro Diário: Registrar a execução no formulário REG-018 (Higienização Diária de Bancada).',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-018 - HIGIENIZAÇÃO DIÁRIA DE BANCADA DE ASSISTÊNCIA TÉCNICA',
        armazenamento: 'NUVEM / PASTA DO POP 006',
        acesso: 'ASSISTÊNCIA TÉCNICA',
        protecao: 'BACKUP',
        recuperacao: 'DATA / BANCADA',
        retencao: '5 anos',
        disposicao: 'DELETAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão inicial com rotina diária de bancadas.' },
    ],
  },

  'POP-007': {
    codigo: 'POP-007',
    titulo: 'POP-007 - Controle de Ambiente e Infraestrutura',
    setor: 'qualidade',
    setorNome: 'Infraestrutura e Meio Ambiente',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'João Silva (Almoxarifado)',
    revisadoPor: 'Carlos Menezes (Líder Técnico)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Almoxarifado e Laboratório Técnico',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Definir as diretrizes para monitoramento ambiental de temperatura e umidade relativa do ar, bem como a verificação diária de proteção contra descargas eletrostáticas (ESD) com pulseiras antiestáticas.',
        ],
      },
      {
        numero: '2',
        titulo: '2. LIMITES OPERACIONAIS CRÍTICOS',
        paragrafos: [
          '• Temperatura da Assistência Técnica e Estoque: Entre 15°C e 30°C.',
          '• Umidade Relativa do Ar: Entre 30% e 70%.',
          '• Teste de Pulseira ESD (REG-040): Faixa de conformidade entre 750 kΩ e 10 MΩ (LED verde no testador de bancada).',
        ],
      },
      {
        numero: '3',
        titulo: '3. ROTINA DE MEDIÇÃO',
        paragrafos: [
          '3.1 O Almoxarifado deve realizar a leitura do termo-higrômetro calibrado diariamente no final da tarde e registrar no REG-017.',
          '3.2 A Assistência Técnica deve registrar suas leituras ambientais e o teste da pulseira antiestática no início do turno de trabalho.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-017 - CONTROLE DE TEMPERATURA E UMIDADE AMBIENTAL',
        armazenamento: 'NUVEM / PASTA POP 007',
        acesso: 'AT E ALMOXARIFADO',
        protecao: 'BACKUP',
        recuperacao: 'DATA / SETOR',
        retencao: '5 anos',
        disposicao: 'DELETAR',
      },
      {
        identificacao: 'REG-040 - TESTE DIÁRIO DE PULSEIRA ELETROSTÁTICA (ESD)',
        armazenamento: 'NUVEM / PASTA POP 007',
        acesso: 'ASSISTÊNCIA TÉCNICA',
        protecao: 'BACKUP',
        recuperacao: 'DATA / TÉCNICO',
        retencao: '5 anos',
        disposicao: 'DELETAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão inicial com limites de temperatura e teste ESD.' },
    ],
  },

  'POP-011': {
    codigo: 'POP-011',
    titulo: 'POP-011 - Gestão de Instrumentos de Medição',
    setor: 'tecnica',
    setorNome: 'Metrologia e Assistência Técnica',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Carlos Menezes (Líder Técnico)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Laboratório de Metrologia Linkmed',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Controlar e rastrear todos os instrumentos e padrões de medição da LinkMed utilizados nos ensaios e calibrações de equipamentos médicos, assegurando calibração periódica rastreada à RBC/INMETRO.',
        ],
      },
      {
        numero: '2',
        titulo: '2. REQUISITOS DE CALIBRAÇÃO (REG 015 e REG 030)',
        paragrafos: [
          '2.1 Controle de Instrumentos (REG-015): Todos os instrumentos da Linkmed (multímetros, osciloscópios, simuladores de ECG, termo-higrômetros, manômetros) devem estar listados no REG-015 com certificado de calibração anexado em PDF e controle de vencimento.',
          '2.2 Alerta Antecipado: O sistema emite alerta automático de vencimento com 60 dias de antecedência para envio à calibração externa.',
          '2.3 Calibração de Instrumentos Internos (REG-030): O formulário REG-030 é exclusivo para registro de calibração/verificação dos instrumentos internos da Linkmed e não se aplica a ordens de serviço de clientes.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-015 - CONTROLE DE INSTRUMENTOS DE MEDIÇÃO E VALIDADES',
        armazenamento: 'NUVEM / PASTA POP 011',
        acesso: 'ASSISTÊNCIA TÉCNICA',
        protecao: 'BACKUP',
        recuperacao: 'TAG / CÓDIGO',
        retencao: 'Vida útil do instrumento + 5 anos',
        disposicao: 'ARQUIVAR',
      },
      {
        identificacao: 'REG-030 - CERTIFICADO / VERIFICAÇÃO DE CALIBRAÇÃO INTERNA',
        armazenamento: 'NUVEM / PASTA POP 011',
        acesso: 'ASSISTÊNCIA TÉCNICA',
        protecao: 'BACKUP',
        recuperacao: 'Nº CERTIFICADO',
        retencao: '5 anos',
        disposicao: 'DELETAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Desacoplamento do REG 030 de clientes e associação ao REG 015.' },
    ],
  },

  'POP-012': {
    codigo: 'POP-012',
    titulo: 'POP-012 - Gestão de Não Conformidade',
    setor: 'qualidade',
    setorNome: 'Garantia da Qualidade',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Setor da Qualidade Linkmed',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Definir a sistemática de identificação, segregação, registro e disposição de não conformidades (produtos, processos ou serviços), prevenindo seu uso ou expedição inadvertida conforme RDC 665/2022.',
        ],
      },
      {
        numero: '2',
        titulo: '2. FLUXO DE NÃO CONFORMIDADE (REG 038 e REG 047)',
        paragrafos: [
          '2.1 Qualquer colaborador que identificar desvio, falha grave ou reprovação deve registrar a ocorrência no formulário REG-038.',
          '2.2 O item não conforme deve ser imediatamente segregado e identificado.',
          '2.3 A Qualidade analisa a causa raiz e determina a disposição (reparo, devolução ao fabricante ou descarte), abrindo REG-047 quando aplicável.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-038 - RELATÓRIO DE NÃO CONFORMIDADE (RNC)',
        armazenamento: 'NUVEM / PASTA POP 012',
        acesso: 'TODOS OS SETORES',
        protecao: 'BACKUP',
        recuperacao: 'NÚMERO RNC',
        retencao: '5 anos',
        disposicao: 'ARQUIVAR',
      },
      {
        identificacao: 'REG-047 - AVALIAÇÃO DE DISPOSIÇÃO DE NÃO CONFORMIDADES',
        armazenamento: 'NUVEM / PASTA POP 012',
        acesso: 'QUALIDADE E DIRETORIA',
        protecao: 'BACKUP',
        recuperacao: 'NÚMERO RNC',
        retencao: '5 anos',
        disposicao: 'ARQUIVAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão inicial com integração aos módulos operacionais.' },
    ],
  },

  'POP-014': {
    codigo: 'POP-014',
    titulo: 'POP-014 - Ações Corretivas e Preventivas (CAPA)',
    setor: 'qualidade',
    setorNome: 'Garantia da Qualidade',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Setor da Qualidade Linkmed',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Estabelecer o procedimento para investigação de causas de não conformidades potenciais ou existentes e implementação de ações corretivas e preventivas eficazes.',
        ],
      },
      {
        numero: '2',
        titulo: '2. METODOLOGIA CAPA',
        paragrafos: [
          'Utilização de ferramentas de análise de causa (5 Porquês, Diagrama de Ishikawa), plano de ação 5W2H e verificação formal da eficácia após período mínimo de 60 dias.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-039 - PLANO DE AÇÃO CORRETIVA E PREVENTIVA (CAPA)',
        armazenamento: 'NUVEM / PASTA POP 014',
        acesso: 'QUALIDADE',
        protecao: 'BACKUP',
        recuperacao: 'CÓDIGO CAPA',
        retencao: '10 anos',
        disposicao: 'ARQUIVAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão inicial conforme RDC 665/2022.' },
    ],
  },

  'POP-019': {
    codigo: 'POP-019',
    titulo: 'POP-019 - Instalação e Treinamento de Equipamentos',
    setor: 'tecnica',
    setorNome: 'Assistência Técnica de Campo',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Carlos Menezes (Líder Técnico)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Maleta Técnica de Campo',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          'Padronizar a entrega técnica, instalação física e elétrica, testes de aceitação e treinamento operacional aos clientes (hospitais e clínicas) para equipamentos médicos.',
        ],
      },
      {
        numero: '2',
        titulo: '2. ASSINATURA OBRIGATÓRIA DE CLIENTES EM CAMPO',
        paragrafos: [
          'Conforme deliberação com a diretoria Linkmed, nos treinamentos externos realizados com funcionários de hospitais, é estritamente obrigatória a coleta de rubrica manual na tela (canvas touch ou mouse) do profissional participante, garantindo comprovação inequívoca e conformidade perante auditorias hospitalares e da ANVISA.',
        ],
      },
    ],
    registros: [
      {
        identificacao: 'REG-008 - LISTA DE PRESENÇA COM RUBRICA MANUAL DE CLIENTES',
        armazenamento: 'NUVEM / PASTA POP 019',
        acesso: 'AT E ADM',
        protecao: 'BACKUP',
        recuperacao: 'Nº OS / CLIENTE',
        retencao: 'Vida útil do equipamento + 5 anos',
        disposicao: 'ARQUIVAR',
      },
      {
        identificacao: 'REG-036 - TERMO DE ENTREGA TÉCNICA E ACEITAÇÃO',
        armazenamento: 'NUVEM / PASTA POP 019',
        acesso: 'AT E ADM',
        protecao: 'BACKUP',
        recuperacao: 'Nº OS',
        retencao: '10 anos',
        disposicao: 'ARQUIVAR',
      },
      {
        identificacao: 'REG-045 - RELATÓRIO DE INSTALAÇÃO DE CAMPO',
        armazenamento: 'NUVEM / PASTA POP 019',
        acesso: 'AT E ADM',
        protecao: 'BACKUP',
        recuperacao: 'Nº OS',
        retencao: '10 anos',
        disposicao: 'ARQUIVAR',
      },
    ],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Adequação de assinatura por rubrica manual para hospitais.' },
    ],
  },
};

export function obterConteudoPop(codigo: string): PopDocumentoCompleto {
  const norm = codigo.toUpperCase().replace(/\s+/g, '-');
  return POPS_CATALOG_DATA[norm] ?? {
    codigo: norm,
    titulo: `${norm} - Procedimento Operacional Padrão LinkMed`,
    setor: 'qualidade',
    setorNome: 'Gestão da Qualidade',
    versao: 1,
    versaoLabel: '01',
    vigencia: '30/01/2026',
    periodicidadeMeses: 24,
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria)',
    distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
    distribuicaoImpressa: 'Setor LinkMed',
    secoes: [
      {
        numero: '1',
        titulo: '1. OBJETIVO',
        paragrafos: [
          `Procedimento operacional padrão ${norm} em conformidade com as Boas Práticas de Fabricação e Manutenção da RDC nº 665/2022 (ANVISA).`,
        ],
      },
      {
        numero: '2',
        titulo: '2. RESPONSABILIDADES E EXECUÇÃO',
        paragrafos: [
          'As atividades devem ser executadas conforme as diretrizes deste POP e registradas nos formulários correspondentes.',
        ],
      },
    ],
    registros: [],
    revisoes: [
      { data: '30/01/2026', numero: '01', historico: 'Emissão oficial LinkMed.' },
    ],
  };
}

