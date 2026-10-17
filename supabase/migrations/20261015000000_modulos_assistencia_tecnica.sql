-- ==============================================================================
-- REGULA-ON - Módulos da Assistência Técnica (formulários, NCs, treinamentos)
-- Os 9 formulários compartilham a tabela form_records (dados em JSONB); o
-- catálogo de campos de cada formulário vive no código (core/domain/forms).
-- ==============================================================================

-- 1. REGISTROS DE FORMULÁRIO
CREATE TABLE IF NOT EXISTS public.form_records (
  id VARCHAR(36) PRIMARY KEY,
  tipo VARCHAR(60) NOT NULL,
  subtipo VARCHAR(40),
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'conforme',
  data_ref DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_por VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_form_records_tipo_data ON public.form_records(tipo, data_ref DESC);
CREATE INDEX IF NOT EXISTS idx_form_records_status ON public.form_records(status);
CREATE INDEX IF NOT EXISTS idx_form_records_criado_por ON public.form_records(criado_por);

-- 2. NÃO CONFORMIDADES
CREATE TABLE IF NOT EXISTS public.ncs (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(30) UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  origem VARCHAR(40) NOT NULL DEFAULT 'assistencia_tecnica',
  severidade VARCHAR(20) NOT NULL DEFAULT 'moderada',
  status VARCHAR(20) NOT NULL DEFAULT 'aberta',
  responsavel_id VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL,
  criado_por VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluida_em TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ncs_status ON public.ncs(status);
CREATE INDEX IF NOT EXISTS idx_ncs_origem ON public.ncs(origem);

-- 3. TREINAMENTOS (interno / externo)
CREATE TABLE IF NOT EXISTS public.trainings (
  id VARCHAR(36) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  setor VARCHAR(40) NOT NULL DEFAULT 'assistencia_tecnica',
  instrutor VARCHAR(255),
  entidade VARCHAR(255),
  carga_horaria NUMERIC(6,1),
  data_realizacao DATE NOT NULL,
  validade_ate DATE,
  participantes JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  criado_por VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trainings_tipo ON public.trainings(tipo, data_realizacao DESC);

-- O acesso é feito somente pelo backend (service role); bloqueia o acesso anônimo.
ALTER TABLE public.form_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
