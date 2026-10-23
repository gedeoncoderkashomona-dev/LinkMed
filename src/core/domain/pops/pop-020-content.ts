/**
 * Conteúdo oficial e fidedigno do POP-020:
 * "POP-020 - Realização de Assistência Técnica de Equipamentos"
 * Extraído na íntegra do documento oficial da LinkMed (RDC 665/2022).
 */

export interface PopRegistroItem {
  identificacao: string;
  armazenamento: string;
  acesso: string;
  protecao: string;
  recuperacao: string;
  retencao: string;
  disposicao: string;
}

export interface PopRevisaoItem {
  data: string;
  numero: string;
  historico: string;
}

export const POP_020_META = {
  codigo: 'POP-020',
  titulo: 'POP-020 - Realização de Assistência Técnica de Equipamentos',
  setor: 'tecnica',
  setorNome: 'Assistência Técnica',
  versao: 1,
  versaoLabel: '01',
  vigencia: '30/01/2026',
  periodicidadeMeses: 24,
  elaboradoPor: 'Vanessa Rodrigues (30/01/2026)',
  revisadoPor: 'Rosemeri Costa (30/01/2026)',
  aprovadoPor: 'Pedro Costa (30/01/2026)',
  distribuicaoEletronica: 'Google Drive https://bit.ly/SgqLinkmed',
  distribuicaoImpressa: 'Setor de Assistência Técnica LinkMed',
};

export const POP_020_REGISTROS_TABLE: PopRegistroItem[] = [
  {
    identificacao: 'REG-009 - CHECK LIST DE VERIFICAÇÃO DE MANUTENÇÃO',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-016 - CHECK LIST DAS ETAPAS MANUTENÇÃO DE EQUIPAMENTOS',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-017 - CONTROLE DE TEMPERATURA E UMIDADE',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-020 - RELATÓRIO DE NÃO CONFORMIDADE',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR DA QUALIDADE',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-022 - CHECK LIST INSPEÇÃO DE RECEBIMENTO DE EQUIPAMENTO',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-030 - CONTROLE DE VALIDAÇÃO DE CALIBRAÇÃO',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-034 - CHECK LIST DE VERIFICAÇÃO PARA LIMPEZA DE EQUIPAMENTO',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
  {
    identificacao: 'REG-035 - CHECK LIST DE MANUTENÇÃO DE EQUIPAMENTO',
    armazenamento: 'NUVEM / PASTA',
    acesso: 'SETOR ASSISTÊNCIA TÉCNICA',
    protecao: 'BACKUP / PASTA',
    recuperacao: 'DATA',
    retencao: 'Conforme item 008 Controle de Registro do POP 001',
    disposicao: 'DESCARTE / DELETAR',
  },
];

export const POP_020_REVISOES_TABLE: PopRevisaoItem[] = [
  {
    data: '01/04/2025',
    numero: '00',
    historico: 'Elaboração inicial do documento.',
  },
  {
    data: '30/01/2026',
    numero: '01',
    historico: 'Adequação do Processo e Controle Eletrônico RDC 665/2022.',
  },
];

export const POP_020_REVISOES = POP_020_REVISOES_TABLE;

export const POP_020_SECOES = [
  {
    numero: '1',
    titulo: '1. OBJETIVO',
    paragrafos: [
      'Estabelecer os procedimentos para execução de manutenção corretiva e preventiva em equipamentos médico-hospitalares na assistência técnica, garantindo segurança, rastreabilidade e conformidade com a RDC nº 665/2022 (ANVISA).',
    ],
  },
  {
    numero: '2',
    titulo: '2. REFERÊNCIAS',
    paragrafos: [
      'RDC nº 665/2022 - Boas Práticas de Fabricação de Produtos Médicos e Produtos para Diagnóstico de Uso In Vitro.',
    ],
  },
  {
    numero: '3',
    titulo: '3. ABRANGÊNCIA',
    paragrafos: [
      'Esse procedimento aplica-se ao Departamento de Assistência Técnica da LinkMed Soluções Médicas.',
    ],
  },
  {
    numero: '4',
    titulo: '4. RESPONSABILIDADES',
    paragrafos: [
      '• É de responsabilidade do Técnico em Eletrônica a elaboração do documento.',
      '• É de responsabilidade do Supervisor Técnico a revisão do documento.',
      '• É de responsabilidade do Diretor Geral da LinkMed a aprovação do documento, conforme os requisitos da RDC 665/22.',
    ],
  },
  {
    numero: '5',
    titulo: '5. DEFINIÇÕES',
    paragrafos: [
      'Conforme MGQ - Manual de Gestão da Qualidade, ANEXO - 002 - Termos e Definições.',
    ],
  },
  {
    numero: '6.1',
    titulo: '6. PROCEDIMENTO — 6.1. Materiais, Instrumentos Necessários e EPI',
    paragrafos: [
      '• Simulador de ECG',
      '• Fonte de alimentação estabilizada',
      '• Manômetro de calibração',
      '• Simulador de Multiparâmetros',
      '• Multímetro digital calibrado para medição de tensão, corrente e resistência elétrica',
      '• Ferro de solda com temperatura controlada e Exaustor de fumaça para bancada',
      '• Analisador de Segurança Elétrica',
      '• Analisador e Simulador de Desfibrilador',
      '• Termômetro digital e Termo-higrômetro de ambiente',
      '• Bancadas aterradas com proteção eletrostática (ESD)',
      '• EPI obrigatório: Luvas de procedimento, Jaleco anti-estático, Pulseira anti-estática aterrada, Óculos de proteção e Máscara descartável.',
    ],
  },
  {
    numero: '6.2',
    titulo: '6.2. Contato Inicial',
    paragrafos: [
      'A LinkMed, com sólida atuação no mercado de assistência técnica de equipamentos médicos, atende tanto à captação comercial diária quanto aos clientes que nos procuram espontaneamente buscando suporte especializado.',
      'O contato inicial é realizado preferencialmente por e-mail ou telefone. O Assistente Administrativo / Apoio Técnico orienta o envio do equipamento para análise e conserto.',
      'Para equipamentos fora de garantia, o cliente informa marca, modelo e número de lote ou série para triagem prévia.',
      'Para equipamentos em garantia, é obrigatório solicitar: dados completos do solicitante (nome, CPF/CNPJ, telefone, e-mail), marca, modelo, número de série, descrição detalhada da falha e cópia da Nota Fiscal de compra (obrigatória para validação da garantia).',
    ],
  },
  {
    numero: '6.3',
    titulo: '6.3. Higienização e Inspeção Inicial',
    paragrafos: [
      'Os equipamentos são recebidos por portador autorizado, cliente, transportadora ou Correios sob responsabilidade do cliente.',
      'No ato do recebimento, confere-se a embalagem externa para registrar avarias no REG-022 (Checklist de Inspeção de Recebimento de Equipamento). Em caso de avaria no transporte, deve-se realizar registro fotográfico e notificar formalmente o cliente por e-mail.',
      'Pontos inspecionados: danos físicos aparentes (trincas, oxidação, umidade), integridade de cabos, conectores, displays, botões e travas; confirmação de acessórios identificados e presença de lacres/etiquetas do fabricante e INMETRO.',
      'Após a inspeção, o equipamento segue para a Área de Higienização. O técnico realiza a limpeza com Álcool 70% e panos descartáveis, preservando todas as etiquetas originais, registra no REG-034 e aplica a Etiqueta Violeta (Equipamento Higienizado) no REG-016.',
    ],
  },
  {
    numero: '6.4',
    titulo: '6.4. Cadastro do Equipamento',
    paragrafos: [
      'Após a higienização, realiza-se o cadastro da Ordem de Serviço no sistema ERP informando: dados cadastrais do cliente, tipo de equipamento, fabricante, modelo, número de série, defeito relatado e acessórios presentes.',
      'O protocolo de recebimento emitido pelo sistema é enviado por e-mail ou entregue fisicamente. O equipamento é então posicionado na Área de Recepção nas prateleiras sinalizadas como "Aguardando Análise".',
    ],
  },
  {
    numero: '6.5',
    titulo: '6.5. Análise do Equipamento',
    paragrafos: [
      'O técnico retira o equipamento da Recepção com os formulários REG-016, REG-009 e REG-035 para a bancada técnica.',
      'Procedimentos de diagnóstico: testes de funcionamento conforme manual do fabricante, abertura cuidadosa com ferramentas apropriadas (espátula de PVC, chaves isoladas), identificação de componentes defeituosos, sinais de sobreaquecimento ou mau uso.',
      'Registra-se o diagnóstico detalhado na OS do ERP e preenche-se o REG-016 aplicando a Etiqueta Cinza (Análise Completa). Se for constatada garantia, afixa-se a Etiqueta Laranja.',
      'Aprova-se o encaminhamento para orçamento, afixando a Etiqueta Amarela (Aguardando Aprovação de Orçamento). Caso o equipamento necessite intervenção na fábrica, comunica-se formalmente, atualiza-se o ERP e afixa-se a Etiqueta Marrom (Enviado à Fábrica).',
    ],
  },
  {
    numero: '6.6',
    titulo: '6.6. Controle de Temperatura e Umidade',
    paragrafos: [
      'Os equipamentos em espera de aprovação de orçamento ou em bancada são mantidos em ambiente monitorado pelo formulário REG-017 (Controle de Temperatura e Umidade).',
      'Faixa operacional aceitável: temperatura entre 0°C e 30°C e umidade relativa de 17% a 60% (armazenamento ideal entre 17°C e 22°C, umidade 40% a 70%).',
      'As leituras do termo-higrômetro calibrado são registradas duas vezes ao dia: manhã (08h00 às 11h00) e tarde (14h00 às 17h00).',
    ],
  },
  {
    numero: '6.7',
    titulo: '6.7. Elaboração e Envio do Orçamento',
    paragrafos: [
      'Com base no diagnóstico técnico e na tabela de preços autorizada pela Diretoria Geral, o orçamento detalhado é emitido e remetido ao cliente para formalização via e-mail ou Ordem de Compra assinada.',
    ],
  },
  {
    numero: '6.8',
    titulo: '6.8. Aprovação do Orçamento',
    paragrafos: [
      'Com a aprovação, afixa-se a Etiqueta Azul (Orçamento Aprovado) no REG-016 e libera-se a separação de peças no Armazém 1 na oficina.',
      'Caso falte componente no estoque, afixa-se a Etiqueta Preta (Aguardando Peças) no REG-016 e dispara-se requisição imediata de compra via POP-009.',
      'Em caso de recusa do orçamento pelo cliente: afixa-se a Etiqueta Vermelha (Orçamento Não Aprovado), atualiza-se o ERP e o equipamento segue para Expedição. Para equipamentos regulamentados pelo INMETRO, registra-se a ocorrência no portal oficial PSIE/INMETRO (https://servicos.rbmlq.gov.br/) garantindo total rastreabilidade fiscal e metrológica.',
    ],
  },
  {
    numero: '6.9',
    titulo: '6.9. Realização da Manutenção',
    paragrafos: [
      'Com todas as peças conferidas, o técnico executa a manutenção corretiva/preventiva na bancada aterrada com pulseira antiestática, substituindo componentes danificados e registrando todas as intervenções executadas na Ordem de Serviço.',
      'Em equipamentos cobertos por garantia de fabricante, todas as peças e placas substituídas são etiquetadas e segregadas para envio à fábrica juntamente com o laudo da OS.',
    ],
  },
  {
    numero: '6.10',
    titulo: '6.10. Finalização do Controle de Qualidade (CQ)',
    paragrafos: [
      '6.10.1 Preparação: Inspeção dos critérios do REG-009 e REG-035, testes funcionais de desempenho, medições de segurança elétrica (fuga de corrente, aterramento) e conformidade dos parâmetros vitais.',
      '6.10.2 Calibração: Utilização exclusiva de padrões metrológicos com certificados RBC vigentes e registro completo no REG-030 (Controle de Verificação da Calibração).',
      '6.10.2 Aprovação da Qualidade: Fixação de etiqueta antiviolação com data de conserto, selo IPEM/INMETRO (quando aplicável) e inclusão da selagem no portal PSIE/INMETRO.',
      '6.10.3 Retrabalho: Caso não atinja aprovação, retorna à bancada técnica; se a anomalia persistir, gera-se abertura do formulário REG-020 (Relatório de Não Conformidade) e notifica-se o fabricante.',
    ],
  },
  {
    numero: '6.11',
    titulo: '6.11. Solicitação da Nota Fiscal e Expedição',
    paragrafos: [
      'Com a aprovação do Controle de Qualidade, atualiza-se o status da OS para "Serviço Finalizado" e afixa-se a Etiqueta Verde (Serviço Finalizado) no REG-016.',
      'O cliente é formalmente notificado para definir a modalidade de envio (transportadora com dados completos, Correios com código de autorização ou portador próprio com agendamento prévio). O Faturamento emite a NF-e e a Expedição realiza a embalagem técnica.',
    ],
  },
  {
    numero: '6.12',
    titulo: '6.12. Garantias de Serviço Realizado',
    paragrafos: [
      'Os serviços de manutenção e peças aplicadas possuem garantia legal e contratual de 90 (noventa) dias a contar da data de entrega ao cliente. Para equipamentos recebidos em garantia original de fábrica, prevalece o prazo remanescente da respectiva Nota Fiscal de compra.',
    ],
  },
  {
    numero: '7',
    titulo: '7. DISTRIBUIÇÃO',
    paragrafos: [
      '• Eletrônico: Repositório Oficial LinkMed SGQ (Google Drive https://bit.ly/SgqLinkmed e Plataforma Regula-On).',
      '• Impresso: Pasta de Procedimentos no Setor de Assistência Técnica LinkMed.',
    ],
  },
  {
    numero: '8',
    titulo: '8. CONTROLE DE REGISTROS (TABELA)',
    paragrafos: [
      'Os formulários REG-009, REG-016, REG-017, REG-020, REG-022, REG-030, REG-034 e REG-035 são armazenados em nuvem e backup físico com retenção conforme Item 008 do POP-001 (Manual de Gestão da Qualidade).',
    ],
  },
  {
    numero: '9',
    titulo: '9. ANEXOS',
    paragrafos: [
      '• MGQ - Manual de Gestão da Qualidade LinkMed.',
      '• ANEXO - 002 - Termos e Definições.',
      '• ANEXO - 001 - Legenda de Status e Cores das Etiquetas (REG-016).',
    ],
  },
];

