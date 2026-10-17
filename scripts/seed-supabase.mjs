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

const SEED_POPS = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    codigo: 'POP-QUA-001',
    titulo: 'Gestão de Documentos e Registros',
    descricao: 'Define o fluxo de elaboração, revisão, aprovação, distribuição e arquivamento de documentos do SGQ.',
    setor: 'qualidade',
    status: 'publicado',
    versao_atual: 1,
    periodicidade_revisao_meses: 24,
    criado_por: '00000000-0000-4000-8000-000000000002',
    aprovado_por: '00000000-0000-4000-8000-000000000001',
    aprovado_em: new Date().toISOString(),
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    codigo: 'POP-TEC-001',
    titulo: 'Manutenção Preventiva de Equipamentos Médicos',
    descricao: 'Procedimento técnico de inspeção, calibração periódica e manutenção de dispositivos médicos.',
    setor: 'tecnico',
    status: 'publicado',
    versao_atual: 1,
    periodicidade_revisao_meses: 12,
    criado_por: '00000000-0000-4000-8000-000000000004',
    aprovado_por: '00000000-0000-4000-8000-000000000003',
    aprovado_em: new Date().toISOString(),
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    codigo: 'POP-LOG-001',
    titulo: 'Recebimento e Quarentena de Produtos',
    descricao: 'Inspeção de recebimento, conferência de lotes e controle de quarentena na expedição.',
    setor: 'estoque',
    status: 'publicado',
    versao_atual: 1,
    periodicidade_revisao_meses: 12,
    criado_por: '00000000-0000-4000-8000-000000000010',
    aprovado_por: '00000000-0000-4000-8000-000000000002',
    aprovado_em: new Date().toISOString(),
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

  for (const pop of SEED_POPS) {
    const { data: existing } = await supabase
      .from('pops')
      .select('id')
      .eq('id', pop.id)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from('pops').insert(pop);
      if (error) {
        console.error(`Erro inserindo POP ${pop.codigo}:`, error);
      } else {
        console.log(`✓ POP inserido: ${pop.codigo} - ${pop.titulo}`);

        // Cria versão inicial 1.0 para cada POP
        const versionId = pop.id.replace('10000000', '20000000');
        await supabase.from('pop_versions').insert({
          id: versionId,
          pop_id: pop.id,
          numero_versao: 1,
          arquivo_url: `/api/pops/${pop.id}/file`,
          arquivo_nome: `${pop.codigo}-v1.pdf`,
          arquivo_tamanho: 10240,
          hash_arquivo: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          status: 'vigente',
          publicado_em: new Date().toISOString(),
          criado_por: pop.criado_por,
        });
      }
    } else {
      console.log(`- POP já existe: ${pop.codigo}`);
    }
  }

  console.log('--- Seed no Supabase Cloud finalizado com sucesso! ---');
}

seed();
