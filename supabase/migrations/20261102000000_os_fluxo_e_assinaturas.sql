-- ==============================================================================
-- LINKMED / REGULA-ON - Fluxo da OS compartilhado entre logins + Assinaturas eletronicas
-- Aditiva e idempotente (CREATE ... IF NOT EXISTS). Acesso somente via API (Service Role).
-- ==============================================================================

-- 1) Estado da OS (registro unico por OS; etiqueta, setor pendente, historico e notificacoes)
CREATE TABLE IF NOT EXISTS public.os_fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os TEXT NOT NULL,
  numero_os_normalizado TEXT NOT NULL UNIQUE,
  estado JSONB NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_fluxo_updated_at ON public.os_fluxo (updated_at DESC);

-- 2) Assinaturas eletronicas (somente insercao; selo HMAC-SHA256 gerado no servidor)
CREATE TABLE IF NOT EXISTS public.assinaturas_eletronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT NOT NULL UNIQUE,
  documento_codigo TEXT NOT NULL,
  entidade_id TEXT NOT NULL,
  usuario_id UUID NOT NULL,
  signatario_nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  conteudo_hash TEXT NOT NULL,
  rubrica_hash TEXT,
  rubrica_png TEXT,
  hmac TEXT NOT NULL,
  assinado_em TIMESTAMPTZ NOT NULL,
  ip TEXT,
  user_agent TEXT,
  base_legal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_documento ON public.assinaturas_eletronicas (documento_codigo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario ON public.assinaturas_eletronicas (usuario_id);

-- Impede UPDATE/DELETE de assinaturas (trilha imutavel)
CREATE OR REPLACE FUNCTION public.assinaturas_imutaveis() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'assinaturas_eletronicas e somente de insercao (trilha de auditoria imutavel)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assinaturas_imutaveis ON public.assinaturas_eletronicas;
CREATE TRIGGER trg_assinaturas_imutaveis
  BEFORE UPDATE OR DELETE ON public.assinaturas_eletronicas
  FOR EACH ROW EXECUTE FUNCTION public.assinaturas_imutaveis();

-- 3) RLS: bloqueia acesso direto via chave publica (anon). Trafego so pelas API Routes.
ALTER TABLE public.os_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_eletronicas ENABLE ROW LEVEL SECURITY;

