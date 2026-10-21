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
  {
    id: '40000000-0000-4000-8000-000000000001',
    tipo: 'recebimento_equipamento',
    subtipo: null,
    status: 'conforme',
    dataRef: '2026-04-10',
    dados: {
      elaborado_por: 'Gestão da Qualidade',
      revisado_por: 'Responsável Técnico (RT)',
      aprovado_por: 'Diretoria Operacional',
      numero_os: 'OS-2026-0101',
      data_entrada: '2026-04-10',
      horario_entrada: '09:15',
      cliente: 'Hospital Santa Clara',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      patrimonio: 'PAT-4510',
      acessorios: 'Cabo de força, sensor de pele, cúpula acrílica íntegra',
      estado_geral: 'conforme',
      defeito_relatado: 'Manutenção preventiva semestral e aferição térmica',
      responsavel_recebimento: 'Carlos Menezes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: '2026-04-10T12:15:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    tipo: 'inspecao_manutencao',
    subtipo: 'olidef',
    status: 'conforme',
    dataRef: '2026-04-11',
    dados: {
      elaborado_por: 'Gestão da Qualidade',
      revisado_por: 'Responsável Técnico (RT)',
      aprovado_por: 'Diretoria Operacional',
      numero_os: 'OS-2026-0101',
      data_inspecao: '2026-04-11',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      cliente: 'Hospital Santa Clara',
      integridade_fisica: 'conforme',
      sistema_aquecimento: 'conforme',
      alarmes_sonoros_visuais: 'conforme',
      resultado_final: 'aprovado',
      responsavel_tecnico: 'Carlos Menezes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: '2026-04-11T14:20:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    tipo: 'verificacao_calibracao',
    subtipo: null,
    status: 'conforme',
    dataRef: '2026-04-12',
    dados: {
      elaborado_por: 'Gestão da Qualidade',
      revisado_por: 'Responsável Técnico (RT)',
      aprovado_por: 'Diretoria Operacional',
      instrumento: 'Analisador de Segurança Elétrica Fluke ESA612',
      codigo_interno: 'INST-001',
      numero_serie: 'FLK-9920',
      numero_certificado: 'CERT-RBC-2026-881',
      laboratorio: 'Laboratório RBC Metrolab',
      data_calibracao: '2026-02-15',
      validade_calibracao: '2027-02-15',
      erro_maximo: '0.12%',
      incerteza_medicao: '0.05%',
      criterio_aceitacao: '± 1.0%',
      parecer_final: 'aprovado',
      responsavel_verificacao: 'Marina Lopes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: '2026-04-12T10:00:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    tipo: 'liberacao_entrega',
    subtipo: null,
    status: 'conforme',
    dataRef: '2026-04-14',
    dados: {
      elaborado_por: 'Gestão da Qualidade',
      revisado_por: 'Responsável Técnico (RT)',
      aprovado_por: 'Diretoria Operacional',
      numero_os: 'OS-2026-0101',
      data_liberacao: '2026-04-14',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      cliente: 'Hospital Santa Clara',
      limpeza_higienizacao: 'conforme',
      etiqueta_calibracao: 'conforme',
      laudo_anexo: 'conforme',
      parecer_liberacao: 'liberado',
      responsavel_liberacao: 'Marina Lopes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000003',
    createdAt: '2026-04-14T16:30:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000005',
    tipo: 'ficha_vida',
    subtipo: null,
    status: 'conforme',
    dataRef: '2026-04-14',
    dados: {
      elaborado_por: 'Gestão da Qualidade',
      revisado_por: 'Responsável Técnico (RT)',
      aprovado_por: 'Diretoria Operacional',
      numero_os: 'OS-2026-0101',
      data_registro: '2026-04-14',
      equipamento: 'Incubadora Neonatal',
      marca: 'Olidef',
      modelo: 'SC Line',
      numero_serie: 'OLD-8841',
      registro_anvisa: '10234560012',
      cliente: 'Hospital Santa Clara',
      resumo_servico:
        'Substituição preventiva de filtro de ar e verificação térmica RBC concluída com aprovação.',
      responsavel_tecnico: 'Carlos Menezes',
    },
    criadoPor: '00000000-0000-4000-8000-000000000004',
    createdAt: '2026-04-14T17:00:00.000Z',
  },
];

const SEED_NCS = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    codigo: 'NC-2026-001',
    titulo: 'Desvio de histerese térmica identificado em sensor auxiliar de incubadora',
    descricao:
      'Durante ensaio do REG-034 na bancada técnica, o sensor cutâneo auxiliar apresentou variação de +0,4°C acima da tolerância especificada pelo fabricante.',
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
    createdAt: '2026-04-11T15:00:00.000Z',
    updatedAt: '2026-04-11T15:00:00.000Z',
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
    createdAt: '2026-04-08T11:30:00.000Z',
    updatedAt: '2026-04-09T16:00:00.000Z',
    concluidaEm: '2026-04-09T16:00:00.000Z',
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
    dataRealizacao: '2026-04-05',
    validadeAte: '2027-04-05',
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
    dataAvaliacao: '2026-04-12',
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
    createdAt: '2026-04-05T13:00:00.000Z',
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    titulo: 'Capacitação Avançada em Incubadoras Neonatais e Fototerapia Olidef',
    tipo: 'externo',
    setor: 'assistencia_tecnica',
    instrutor: 'Eng. Roberto Vasconcelos (Olidef)',
    entidade: 'Olidef Medical',
    cargaHoraria: 8,
    dataRealizacao: '2026-03-20',
    validadeAte: '2028-03-20',
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
    dataAvaliacao: '2026-04-02',
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
    createdAt: '2026-03-20T18:00:00.000Z',
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

  // Seed de Registros Simulados de Formulários (REGs)
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
