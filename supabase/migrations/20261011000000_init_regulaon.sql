-- ==============================================================================
-- REGULA-ON (SGQ RDC 665/22 - ANVISA) - Initial Database Schema
-- Compatible with PostgreSQL 17 / Supabase
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(36) PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL,
  nivel VARCHAR(10),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

-- 2. POPS TABLE (Procedimentos Operacionais Padrão)
CREATE TABLE IF NOT EXISTS public.pops (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  setor VARCHAR(50) NOT NULL,
  versao_atual INTEGER NOT NULL DEFAULT 1,
  periodicidade_revisao_meses INTEGER NOT NULL DEFAULT 12,
  status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO',
  criado_por VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  aprovado_por VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pops_codigo ON public.pops(codigo);
CREATE INDEX IF NOT EXISTS idx_pops_setor ON public.pops(setor);
CREATE INDEX IF NOT EXISTS idx_pops_status ON public.pops(status);
CREATE INDEX IF NOT EXISTS idx_pops_deleted_at ON public.pops(deleted_at);

-- 3. POP VERSIONS TABLE (Controle de Versões e Histórico RDC 665/22)
CREATE TABLE IF NOT EXISTS public.pop_versions (
  id VARCHAR(36) PRIMARY KEY,
  pop_id VARCHAR(36) NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
  numero_versao INTEGER NOT NULL,
  arquivo_url TEXT NOT NULL,
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_tamanho BIGINT NOT NULL,
  hash_arquivo VARCHAR(128) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO',
  publicado_em TIMESTAMPTZ,
  criado_por VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unq_pop_versao UNIQUE (pop_id, numero_versao)
);

CREATE INDEX IF NOT EXISTS idx_pop_versions_pop_id ON public.pop_versions(pop_id);
CREATE INDEX IF NOT EXISTS idx_pop_versions_status ON public.pop_versions(status);

-- 4. POP READ CONFIRMATIONS TABLE (Confirmação de Leitura e Treinamento)
CREATE TABLE IF NOT EXISTS public.pop_read_confirmations (
  id VARCHAR(36) PRIMARY KEY,
  pop_version_id VARCHAR(36) NOT NULL REFERENCES public.pop_versions(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  confirmado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_read_confirmation UNIQUE (pop_version_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pop_read_conf_version ON public.pop_read_confirmations(pop_version_id);
CREATE INDEX IF NOT EXISTS idx_pop_read_conf_user ON public.pop_read_confirmations(user_id);

-- 5. POP CHANGE REQUESTS TABLE (Solicitações de Mudança)
CREATE TABLE IF NOT EXISTS public.pop_change_requests (
  id VARCHAR(36) PRIMARY KEY,
  pop_id VARCHAR(36) NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
  solicitante_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  respondido_por VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL,
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pop_change_req_pop_id ON public.pop_change_requests(pop_id);
CREATE INDEX IF NOT EXISTS idx_pop_change_req_status ON public.pop_change_requests(status);

-- 6. AUDIT LOGS TABLE (Trilha de Auditoria Imutável RDC 665/22 - Append-Only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(100) NOT NULL,
  entidade_id VARCHAR(36) NOT NULL,
  dados_antes JSONB,
  dados_depois JSONB,
  ip VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade ON public.audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
