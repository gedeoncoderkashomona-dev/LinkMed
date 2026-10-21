import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: node --env-file=.env.local scripts/seed-supabase.mjs).',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function isoDateOffset(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function isoDateTimeOffset(daysOffset = 0) {
  return new Date(Date.now() + daysOffset * 86_400_000).toISOString();
}

const SEED_USERS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    nome_completo: 'Pedro Costa',
    email: 'diretor@regulaon.local',
    cpf: '111.111.111-11',
    perfil: 'diretor',
    nivel: null,
    senha: 'Diretor@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    nome_completo: 'Vanessa Ribeiro',
    email: 'gestor.qualidade@regulaon.local',
    cpf: '222.222.222-22',
    perfil: 'gestor',
    nivel: 'Sênior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    nome_completo: 'Marina Lopes',
    email: 'gestor.rt@regulaon.local',
    cpf: '333.333.333-33',
    perfil: 'gestor',
    nivel: 'Sênior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    nome_completo: 'Carlos Menezes',
    email: 'tecnico.carlos@regulaon.local',
    cpf: '444.444.444-44',
    perfil: 'tecnico',
    nivel: 'Sênior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    nome_completo: 'Rafael Souza',
    email: 'tecnico.rafael@regulaon.local',
    cpf: '555.555.555-55',
    perfil: 'tecnico',
    nivel: 'Júnior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    nome_completo: 'Juliana Alves',
    email: 'tecnico.juliana@regulaon.local',
    cpf: '666.666.666-66',
    perfil: 'tecnico',
    nivel: 'Sênior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    nome_completo: 'Bruno Tavares',
    email: 'tecnico.bruno@regulaon.local',
    cpf: '777.777.777-77',
    perfil: 'tecnico',
    nivel: 'Júnior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    nome_completo: 'Letícia Prado',
    email: 'tecnico.leticia@regulaon.local',
    cpf: '888.888.888-88',
    perfil: 'tecnico',
    nivel: 'Sênior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    nome_completo: 'Diego Farias',
    email: 'tecnico.diego@regulaon.local',
    cpf: '999.999.999-99',
    perfil: 'tecnico',
    nivel: 'Júnior',
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    nome_completo: 'João Silva',
    email: 'estoquista.joao@regulaon.local',
    cpf: '101.101.101-01',
    perfil: 'estoquista',
    nivel: null,
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    nome_completo: 'Amanda Reis',
    email: 'estoquista.amanda@regulaon.local',
    cpf: '121.121.121-21',
    perfil: 'estoquista',
    nivel: null,
    senha: 'RegulaOn@2026',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    nome_completo: 'Roberto Nunes',
    email: 'estoquista.roberto@regulaon.local',
    cpf: '131.131.131-31',
    perfil: 'estoquista',
    nivel: null,
    senha: 'RegulaOn@2026',
  },
];

const SEED_FORM_RECORDS = [
  // --- OS-2026-0101 (Completa - Etiqueta VERDE) ---
  {
    id: '40000000-0000-4000-8000-000000000001',
    tipo: 'inspecao-recebimento',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-5),
    dados: {
      elaborado_por: 'João Silva / Vanessa Ribeiro (Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      numero_os: 'OS-2026-0101',
      cliente: 'Hospital Santa Clara',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      embalagem_adequada: 'C',
      sem_danos_externos: 'C',
      cabos_integros: 'C',
      tela_sem_trincas: 'C',
      pecas_soltas_ausentes: 'C',
      sinais_violacao: 'C',
      limpeza_sujidade: 'C',
      relato_cliente: 'Manutenção preventiva semestral e aferição da malha térmica.',
      responsavel_liberacao: 'João Silva',
      data_liberacao: isoDateOffset(-5),
    },
    criadoPor: '00000000-0000-4000-8000-000000000010',
    createdAt: isoDateTimeOffset(-5),
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    tipo: 'limpeza-equipamento',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-4),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      data: isoDateOffset(-4),
      cliente: 'Hospital Santa Clara',
      numero_os: 'OS-2026-0101',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      acessorios: 'Cabo de força, sensor cutâneo RN, cúpula acrílica',
      inspecao_visual: 'C',
      produto_alcool_70: 'C',
      limpeza_realizada: 'C',
      assinatura_tecnico: 'Carlos Menezes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(-4),
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    tipo: 'checklist-manutencao',
    subtipo: 'olidef',
    status: 'conforme',
    dataRef: isoDateOffset(-3),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      numero_os: 'OS-2026-0101',
      cliente: 'Hospital Santa Clara',
      data_entrada: isoDateOffset(-3),
      tecnico: 'Carlos Menezes',
      tipo_manutencao: 'preventiva',
      ol_eletrica: 'C',
      ol_aquecimento: 'C',
      ol_portinhola: 'C',
      ol_cupula: 'C',
      ol_sensores_de_controle: 'C',
      ol_painel_de_controle: 'C',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(-3),
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    tipo: 'etapas-manutencao',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-2),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      cliente: 'Hospital Santa Clara',
      data_abertura: isoDateOffset(-2),
      numero_os: 'OS-2026-0101',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      conferencia_pecas: 'C',
      etiqueta_violeta: 'C',
      etiqueta_cinza: 'C',
      etiqueta_laranja: 'NA',
      etiqueta_verde_sem_defeito: 'NA',
      enviado_fabrica: false,
      orcamento_enviado: 'C',
      orcamento_aprovado: 'C',
      orcamento_reprovado: 'NA',
      falta_itens_estoque: 'NA',
      inspecao_final: 'C',
      etiqueta_manutencao: 'C',
      lacre_antiviolacao: 'C',
      etiqueta_calibracao: 'C',
      liberado_qualidade: 'C',
      assinatura_tecnico: 'Carlos Menezes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(-2),
  },
  {
    id: '40000000-0000-4000-8000-000000000005',
    tipo: 'verificacao-calibracao',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-1),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      numero_os: 'OS-2026-0101',
      cliente: 'Hospital Santa Clara',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      marca_modelo: 'Olidef / SC Line',
      numero_serie: 'OLD-8841',
      data_calibracao: isoDateOffset(-1),
      procedimento: 'POP-TEC-001 / NBR IEC 60601-2-19',
      laboratorio: 'Laboratório RBC Metrolab',
      certificado: 'CERT-RBC-2026-881',
      temperatura: 21.5,
      umidade: 52.0,
      frequencia_gravacao_medido: 60.0,
      frequencia_gravacao_referencia: 60.0,
      frequencia_gravacao_erro: 0.0,
      frequencia_gravacao_incerteza: 0.01,
      frequencia_gravacao_conformidade: 'conforme',
      resultado_final: 'conforme',
      supervisor_tecnico: 'Marina Lopes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: isoDateTimeOffset(-1),
  },

  // --- OS-2026-0102 (Em bancada - Etiqueta AZUL: Orçamento Aprovado) ---
  {
    id: '40000000-0000-4000-8000-000000000006',
    tipo: 'etapas-manutencao',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-1),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      cliente: 'Clínica CardioVida',
      data_abertura: isoDateOffset(-1),
      numero_os: 'OS-2026-0102',
      equipamento: 'Eletrocardiógrafo Digital',
      marca: 'TEB',
      modelo: 'ECGPC',
      numero_serie: 'TEB-5529',
      conferencia_pecas: 'C',
      etiqueta_violeta: 'C',
      etiqueta_cinza: 'C',
      etiqueta_laranja: 'NA',
      etiqueta_verde_sem_defeito: 'NA',
      enviado_fabrica: false,
      orcamento_enviado: 'C',
      orcamento_aprovado: 'C',
      orcamento_reprovado: 'NA',
      falta_itens_estoque: 'NA',
      inspecao_final: 'NA',
      etiqueta_manutencao: 'NA',
      lacre_antiviolacao: 'NA',
      etiqueta_calibracao: 'NA',
      liberado_qualidade: 'NA',
      assinatura_tecnico: 'Juliana Alves',
    },
    criadoPor: '00000000-0000-4000-8000-000000000006',
    createdAt: isoDateTimeOffset(-1),
  },

  // --- OS-2026-0103 (Em Garantia - Etiqueta LARANJA) ---
  {
    id: '40000000-0000-4000-8000-000000000007',
    tipo: 'checklist-manutencao',
    subtipo: 'olidef',
    status: 'conforme',
    dataRef: isoDateOffset(0),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      equipamento: 'Berço Aquecido Neonatal',
      marca: 'Olidef',
      modelo: 'BA-02',
      numero_serie: 'OLD-9104',
      numero_os: 'OS-2026-0103',
      cliente: 'Maternidade São Lucas',
      data_entrada: isoDateOffset(0),
      tecnico: 'Rafael Souza',
      tipo_manutencao: 'garantia',
      ol_eletrica: 'C',
      ol_aquecimento: 'C',
    },
    criadoPor: '00000000-0000-4000-8000-000000000005',
    createdAt: isoDateTimeOffset(0),
  },

  // --- Rotinas Diárias / Semanais (REG-018, REG-040, REG-017) ---
  {
    id: '40000000-0000-4000-8000-000000000008',
    tipo: 'higienizacao-bancada',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(0),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      bancada: 'Bancada Técnica 01 e 02 — Laboratório Eletrônico',
      data: isoDateOffset(0),
      produto_utilizado: 'Álcool 70%',
      responsavel: 'Carlos Menezes',
      supervisor: 'Marina Lopes',
      observacoes: 'Superfícies e mantas dissipativas higienizadas conforme POP.',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(0),
  },
  {
    id: '40000000-0000-4000-8000-000000000009',
    tipo: 'pulseira-antiestatica',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(0),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      data: isoDateOffset(0),
      colaborador: 'Carlos Menezes',
      local_teste: 'Assistência Técnica — Bancada ESD 01',
      resultado: 'aprovado',
      responsavel_monitoramento: 'Marina Lopes',
      observacoes: 'Continuidade resistiva dentro da faixa de 1 Megaohm.',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(0),
  },
  {
    id: '40000000-0000-4000-8000-000000000010',
    tipo: 'temperatura-umidade',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(0),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      data: isoDateOffset(0),
      periodo: 'manha',
      hora: '08:30',
      termohigrometro: 'MT-241-A / 4171931',
      temperatura_atual: 21.4,
      temperatura_min: 19.8,
      temperatura_max: 22.6,
      umidade_atual: 54.0,
      umidade_min: 48.0,
      umidade_max: 58.0,
      responsavel: 'Carlos Menezes',
      observacao: 'Ambiente climatizado dentro dos parâmetros RDC 665/22.',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(0),
  },

  // --- Controle de Validade de Calibração (Alerta 60 dias ativo!) ---
  {
    id: '40000000-0000-4000-8000-000000000011',
    tipo: 'validade-calibracao',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-30),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      equipamento: 'Analisador de Segurança Elétrica Fluke ESA612',
      marca_modelo: 'Fluke Biomedical / ESA612',
      numero_serie: 'FLK-9920',
      data_calibracao: isoDateOffset(-337),
      validade: isoDateOffset(28), // Vence em 28 dias -> dispara alerta preventivo de 60 dias!
      certificado: 'CERT-RBC-2025-419',
      laboratorio: 'Laboratório RBC Metrolab',
      responsavel: 'Marina Lopes',
      observacoes: 'Agendar envio ao laboratório RBC antes do vencimento.',
    },
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: isoDateTimeOffset(-10),
  },
  {
    id: '40000000-0000-4000-8000-000000000012',
    tipo: 'validade-calibracao',
    subtipo: null,
    status: 'conforme',
    dataRef: isoDateOffset(-15),
    dados: {
      elaborado_por: 'Vanessa Ribeiro (Gestão da Qualidade)',
      revisado_por: 'Marina Lopes (Responsável Técnica)',
      aprovado_por: 'Pedro Costa (Diretoria)',
      equipamento: 'Simulador Multiparamétrico Fluke ProSim 8',
      marca_modelo: 'Fluke Biomedical / ProSim 8',
      numero_serie: 'PRM-4410',
      data_calibracao: isoDateOffset(-55),
      validade: isoDateOffset(310), // Vigente (310 dias restantes)
      certificado: 'CERT-RBC-2026-112',
      laboratorio: 'Laboratório RBC Metrolab',
      responsavel: 'Marina Lopes',
      observacoes: 'Certificado RBC vigente e rastreável.',
    },
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: isoDateTimeOffset(-15),
  },
];

const SEED_NCS = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    codigo: 'NC-2026-001',
    titulo: 'Desvio de histerese térmica identificado em sensor auxiliar de incubadora',
    descricao:
      'Durante ensaio do REG-035 na bancada técnica, o sensor cutâneo auxiliar apresentou variação de +0,4°C acima da tolerância especificada pelo fabricante.',
    causa:
      'Desgaste natural do termistor do cabo sensor após ciclo prolongado de esterilização hospitalar.',
    acaoImediata:
      'Segregação imediata do sensor com etiqueta de reprovação e substituição por sensor original Olidef lote L-2026-09.',
    identificacaoEquipamento: 'Incubadora Neonatal Olidef SC Line · NS: OLD-7712 (OS-2026-0098)',
    equipamentoNaoSeAplica: false,
    elaboradoPor: 'Carlos Menezes (Assistência Técnica)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria Operacional)',
    origem: 'assistencia_tecnica',
    severidade: 'moderada',
    status: 'em_andamento',
    responsavelId: '00000000-0000-4000-8000-000000000004',
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: isoDateTimeOffset(-3),
    updatedAt: isoDateTimeOffset(-2),
    concluidaEm: null,
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    codigo: 'NC-2026-002',
    titulo: 'Divergência documental no preenchimento de proposta técnica comercial',
    descricao:
      'Verificou-se ausência do número de revisão vigente na minuta de contrato de manutenção preventiva encaminhada pela área comercial.',
    causa:
      'Utilização de modelo anterior antes da atualização do controle mestre de documentos (POP-ADM-001).',
    acaoImediata:
      'Substituição imediata do arquivo na pasta compartilhada de Vendas e reenvio da minuta revisada ao cliente.',
    identificacaoEquipamento: 'Não se aplica (NC Documental / Processo)',
    equipamentoNaoSeAplica: true,
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria Operacional)',
    origem: 'vendas',
    severidade: 'leve',
    status: 'concluida',
    responsavelId: '00000000-0000-4000-8000-000000000002',
    criadoPor: '00000000-0000-4000-8000-000000000002',
    createdAt: isoDateTimeOffset(-7),
    updatedAt: isoDateTimeOffset(-5),
    concluidaEm: isoDateTimeOffset(-5),
  },
];

const SEED_TRAININGS = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    titulo: 'POP-TEC-001 — Boas Práticas de Manutenção e Rastreabilidade RDC 665/22',
    tipo: 'interno',
    setor: 'assistencia_tecnica',
    instrutor: 'Marina Lopes (Responsável Técnica)',
    entidade: null,
    cargaHoraria: 4,
    dataRealizacao: isoDateOffset(-10),
    validadeAte: isoDateOffset(355),
    participantes: ['Carlos Menezes', 'Rafael Souza', 'Juliana Alves'],
    participantesDetalhados: [
      {
        nome: 'Carlos Menezes',
        funcao: 'Técnico Sênior',
        assinatura: 'Carlos Menezes (Assinado Digitalmente)',
      },
      {
        nome: 'Rafael Souza',
        funcao: 'Técnico Júnior',
        assinatura: 'Rafael Souza (Assinado Digitalmente)',
      },
      {
        nome: 'Juliana Alves',
        funcao: 'Técnica Sênior',
        assinatura: 'Juliana Alves (Assinado Digitalmente)',
      },
    ],
    observacoes: 'Treinamento interno concluído com 100% de aproveitamento técnico.',
    conteudo:
      'Diretrizes da RDC 665/2022 aplicadas à assistência técnica, preenchimento dos registros REG-022, REG-034, REG-035 e tratamento de Não Conformidades (REG-020).',
    localTreinamento: 'Sala de Treinamento LinkMed',
    horarioInicial: '08:30',
    horarioFinal: '12:30',
    avaliadoPor: 'Vanessa Ribeiro (Gestora da Qualidade)',
    dataAvaliacao: isoDateOffset(-3),
    assinaturaAvaliador: 'Vanessa Ribeiro — Gestão da Qualidade',
    avaliacoesEficacia: [
      {
        participante: 'Carlos Menezes',
        assimilacaoConteudo: 5,
        aplicabilidadeAtividade: 5,
        desempenhoQualidadeProdutividade: 5,
        interesseNovosConceitos: 5,
        execucaoConformeProcedimentos: 5,
        observacoes: 'Excelente domínio técnico',
      },
      {
        participante: 'Rafael Souza',
        assimilacaoConteudo: 4,
        aplicabilidadeAtividade: 5,
        desempenhoQualidadeProdutividade: 4,
        interesseNovosConceitos: 5,
        execucaoConformeProcedimentos: 5,
        observacoes: 'Ótima evolução operacional',
      },
      {
        participante: 'Juliana Alves',
        assimilacaoConteudo: 5,
        aplicabilidadeAtividade: 5,
        desempenhoQualidadeProdutividade: 5,
        interesseNovosConceitos: 5,
        execucaoConformeProcedimentos: 5,
        observacoes: 'Plena aderência aos POPs',
      },
    ],
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria Operacional)',
    criadoPor: '00000000-0000-4000-8000-000000000002',
    createdAt: isoDateTimeOffset(-10),
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    titulo: 'Capacitação Avançada em Incubadoras Neonatais e Fototerapia Olidef',
    tipo: 'externo',
    setor: 'assistencia_tecnica',
    instrutor: 'Eng. Roberto Vasconcelos (Olidef)',
    entidade: 'Olidef Medical',
    cargaHoraria: 8,
    dataRealizacao: isoDateOffset(-340),
    validadeAte: isoDateOffset(18), // Vence em 18 dias -> demonstra alerta de reciclagem de treinamento (≤ 30 dias)!
    participantes: ['Carlos Menezes', 'Letícia Prado'],
    participantesDetalhados: [
      {
        nome: 'Carlos Menezes',
        funcao: 'Técnico Sênior',
        assinatura: 'Carlos Menezes (Certificado Olidef #8841)',
      },
      {
        nome: 'Letícia Prado',
        funcao: 'Técnica Sênior',
        assinatura: 'Letícia Prado (Certificado Olidef #8842)',
      },
    ],
    observacoes: 'Certificados emitidos pelo fabricante e arquivados no SGQ.',
    conteudo:
      'Calibração de malha térmica, sensores cutâneos, módulos microprocessados e substituição de componentes críticos conforme manual de serviço.',
    localTreinamento: 'Centro Técnico Olidef — Ribeirão Preto / Remoto Síncrono',
    horarioInicial: '09:00',
    horarioFinal: '17:00',
    avaliadoPor: 'Marina Lopes (Responsável Técnica)',
    dataAvaliacao: isoDateOffset(-300),
    assinaturaAvaliador: 'Marina Lopes — RT LinkMed',
    avaliacoesEficacia: [
      {
        participante: 'Carlos Menezes',
        assimilacaoConteudo: 5,
        aplicabilidadeAtividade: 5,
        desempenhoQualidadeProdutividade: 5,
        interesseNovosConceitos: 5,
        execucaoConformeProcedimentos: 5,
        observacoes: 'Apto para manutenção nível III',
      },
      {
        participante: 'Letícia Prado',
        assimilacaoConteudo: 5,
        aplicabilidadeAtividade: 5,
        desempenhoQualidadeProdutividade: 5,
        interesseNovosConceitos: 5,
        execucaoConformeProcedimentos: 5,
        observacoes: 'Apta para manutenção nível III',
      },
    ],
    elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
    revisadoPor: 'Marina Lopes (Responsável Técnica)',
    aprovadoPor: 'Pedro Costa (Diretoria Operacional)',
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: isoDateTimeOffset(-340),
  },
];

async function seed() {
  console.log('--- Iniciando Seed no Supabase Cloud ---');

  for (const user of SEED_USERS) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const senhaHash = await bcrypt.hash(user.senha, 12);
      const { error } = await supabase.from('users').insert({
        id: user.id,
        nome_completo: user.nome_completo,
        email: user.email,
        cpf: user.cpf,
        senha_hash: senhaHash,
        perfil: user.perfil,
        nivel: user.nivel,
        status: 'ativo',
      });
      if (error) console.error(`Erro inserindo usuário ${user.email}:`, error);
      else console.log(`✓ Usuário inserido: ${user.nome_completo} (${user.email})`);
    } else {
      console.log(`- Usuário já existe: ${user.nome_completo}`);
    }
  }

  // Metadados de governança para todos os POPs existentes
  const { data: allPops } = await supabase
    .from('pops')
    .select('id, codigo, setor, criado_por');
  for (const p of allPops ?? []) {
    const metaLogId = String(p.id).replace(/^.{8}/, '30000000');
    const elaboradoPor =
      p.setor === 'tecnico' || p.setor === 'tecnica'
        ? 'Carlos Menezes (Líder Técnico)'
        : p.setor === 'estoque'
          ? 'João Silva (Controle de Estoque)'
          : 'Vanessa Ribeiro (Gestão da Qualidade)';

    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: metaLogId,
        usuario_id: p.criado_por,
        acao: 'POP_META_UPSERT',
        entidade: '__db_pop_meta__',
        entidade_id: p.id,
        dados_antes: null,
        dados_depois: {
          elaboradoPor,
          revisadoPor: 'Marina Lopes (Responsável Técnica)',
          aprovadoPorNome: 'Pedro Costa (Diretoria Operacional)',
        },
        ip: '127.0.0.1',
        user_agent: 'seed-supabase',
      },
      { onConflict: 'id' },
    );
    if (error) console.error(`Erro salvando meta do POP ${p.codigo}:`, error);
    else console.log(`✓ Governança documental vinculada ao POP: ${p.codigo}`);
  }

  // Seed de Registros Simulados de Formulários (todos os 9 módulos + OS + alertas de vencimento)
  for (const rec of SEED_FORM_RECORDS) {
    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: rec.id,
        usuario_id: rec.criadoPor,
        acao: rec.tipo,
        entidade: '__db_form_record__',
        entidade_id: rec.id,
        dados_antes: null,
        dados_depois: rec,
        ip: '127.0.0.1',
        user_agent: 'seed-supabase',
        created_at: rec.createdAt,
      },
      { onConflict: 'id' },
    );
    if (error) console.error(`Erro inserindo registro ${rec.tipo}:`, error);
    else console.log(`✓ Registro simulado inserido: ${rec.tipo} (${rec.dataRef})`);
  }

  // Seed de Não Conformidades (REG-020)
  for (const nc of SEED_NCS) {
    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: nc.id,
        usuario_id: nc.criadoPor,
        acao: nc.status,
        entidade: '__db_nc__',
        entidade_id: nc.id,
        dados_antes: null,
        dados_depois: nc,
        ip: '127.0.0.1',
        user_agent: 'seed-supabase',
        created_at: nc.createdAt,
      },
      { onConflict: 'id' },
    );
    if (error) console.error(`Erro inserindo NC ${nc.codigo}:`, error);
    else console.log(`✓ NC simulada inserida: ${nc.codigo} — ${nc.titulo}`);
  }

  // Seed de Treinamentos Internos e Externos com Avaliação da Eficácia (REG-008)
  for (const tr of SEED_TRAININGS) {
    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: tr.id,
        usuario_id: tr.criadoPor,
        acao: tr.tipo,
        entidade: '__db_training__',
        entidade_id: tr.id,
        dados_antes: null,
        dados_depois: tr,
        ip: '127.0.0.1',
        user_agent: 'seed-supabase',
        created_at: tr.createdAt,
      },
      { onConflict: 'id' },
    );
    if (error) console.error(`Erro inserindo Treinamento ${tr.titulo}:`, error);
    else console.log(`✓ Treinamento REG-008 inserido: ${tr.titulo}`);
  }

  console.log('--- Seed no Supabase Cloud finalizado com sucesso! ---');
}

seed();
