-- ==============================================================================
-- REGULA-ON - Ajustes de Governança Documental (POPs, NCs e REG-008 Treinamentos)
-- 1. Responsáveis por Elaboração, Revisão e Aprovação em POPs, NCs e Treinamentos
-- 2. Campos separados de NC: Identificação do Equipamento (c/ Não se aplica),
--    Descrição detalhada, Causa e Ação Imediata
-- 3. Estrutura completa do REG-008 em Treinamentos (Conteúdo, Local, Horários,
--    Lista de Presença e Avaliação da Eficácia com notas 1 a 5)
-- ==============================================================================

-- 1. POPS: Responsáveis por elaboração, revisão e aprovação
ALTER TABLE public.pops
  ADD COLUMN IF NOT EXISTS elaborado_por VARCHAR(255) DEFAULT 'Vanessa Ribeiro (Gestão da Qualidade)',
  ADD COLUMN IF NOT EXISTS revisado_por VARCHAR(255) DEFAULT 'Marina Lopes (Responsável Técnica)',
  ADD COLUMN IF NOT EXISTS aprovado_por_nome VARCHAR(255) DEFAULT 'Pedro Costa (Diretoria)';

-- 2. NÃO CONFORMIDADES (NCS): Campos detalhados e equipamento (ou Não se aplica)
ALTER TABLE public.ncs
  ADD COLUMN IF NOT EXISTS identificacao_equipamento VARCHAR(255) DEFAULT 'Não se aplica',
  ADD COLUMN IF NOT EXISTS equipamento_nao_se_aplica BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS causa TEXT,
  ADD COLUMN IF NOT EXISTS acao_imediata TEXT,
  ADD COLUMN IF NOT EXISTS elaborado_por VARCHAR(255) DEFAULT 'Carlos Menezes (Assistência Técnica)',
  ADD COLUMN IF NOT EXISTS revisado_por VARCHAR(255) DEFAULT 'Vanessa Ribeiro (Qualidade)',
  ADD COLUMN IF NOT EXISTS aprovado_por VARCHAR(255) DEFAULT 'Pedro Costa (Diretoria)';

-- 3. TREINAMENTOS (REG-008): Campos completos e Avaliação da Eficácia
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS conteudo TEXT,
  ADD COLUMN IF NOT EXISTS local_treinamento VARCHAR(255) DEFAULT 'Sala de Treinamento LinkMed',
  ADD COLUMN IF NOT EXISTS horario_inicial VARCHAR(10) DEFAULT '08:30',
  ADD COLUMN IF NOT EXISTS horario_final VARCHAR(10) DEFAULT '12:30',
  ADD COLUMN IF NOT EXISTS avaliado_por VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_avaliacao DATE,
  ADD COLUMN IF NOT EXISTS assinatura_avaliador VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avaliacoes_eficacia JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS elaborado_por VARCHAR(255) DEFAULT 'Vanessa Ribeiro (Gestão da Qualidade)',
  ADD COLUMN IF NOT EXISTS revisado_por VARCHAR(255) DEFAULT 'Marina Lopes (Responsável Técnica)',
  ADD COLUMN IF NOT EXISTS aprovado_por VARCHAR(255) DEFAULT 'Pedro Costa (Diretoria)';

-- Recarrega o schema cache do PostgREST no Supabase
NOTIFY pgrst, 'reload schema';

