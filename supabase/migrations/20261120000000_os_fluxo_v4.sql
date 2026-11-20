-- ==============================================================================
-- LINKMED / REGULA-ON — Máquina de Estados v4 (RDC 665/22)
-- Tabelas: os, os_evento (append-only R09), os_estado (projeção),
--          os_notificacao (outbox + lembretes R05/R06), feriado (D9),
--          e versionamento/histórico de edição em form_records (Seção 7).
-- Idempotente e segura (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ==============================================================================

-- 1) Tabela mestre da OS (R07: número normalizado único, inclusive finalizadas/canceladas)
CREATE TABLE IF NOT EXISTS public.os (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  numero_normalizado TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL DEFAULT '',
  cliente TEXT NOT NULL DEFAULT '',
  equipamento TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  numero_serie TEXT NOT NULL DEFAULT '',
  acessorios TEXT NOT NULL DEFAULT '',
  relato_cliente TEXT NOT NULL DEFAULT '',
  criada_por UUID,
  criada_por_nome TEXT NOT NULL DEFAULT '',
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_criada_em ON public.os (criada_em DESC);

-- 2) Eventos imutáveis (R09: somente inclusão via REVOKE UPDATE/DELETE + trigger)
CREATE TABLE IF NOT EXISTS public.os_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.os(id) ON DELETE CASCADE,
  numero_os_normalizado TEXT NOT NULL,
  seq INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- ACAO | CANCELAR | REABRIR | CORRIGIR | ESTORNAR
  acao TEXT,
  valor BOOLEAN,
  campos JSONB NOT NULL DEFAULT '{}'::jsonb,
  regra_id TEXT,
  de_no TEXT,
  para_no TEXT,
  anula UUID[] NOT NULL DEFAULT '{}'::uuid[],
  motivo TEXT,
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL DEFAULT '',
  usuario_perfil TEXT NOT NULL,
  em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_os_evento_seq UNIQUE (os_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_os_evento_os_seq ON public.os_evento (os_id, seq ASC);
CREATE INDEX IF NOT EXISTS idx_os_evento_norm ON public.os_evento (numero_os_normalizado, seq ASC);

CREATE OR REPLACE FUNCTION public.os_evento_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'os_evento é somente inclusão (histórico imutável R09)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_os_evento_imutavel ON public.os_evento;
CREATE TRIGGER trg_os_evento_imutavel
  BEFORE UPDATE OR DELETE ON public.os_evento
  FOR EACH ROW EXECUTE FUNCTION public.os_evento_imutavel();

-- 3) Projeção recalculável do estado atual da OS (Seção 6.1)
CREATE TABLE IF NOT EXISTS public.os_estado (
  os_id UUID PRIMARY KEY REFERENCES public.os(id) ON DELETE CASCADE,
  numero_os TEXT NOT NULL,
  numero_normalizado TEXT NOT NULL UNIQUE,
  no TEXT NOT NULL,
  origem TEXT,
  etiqueta TEXT,
  setor TEXT,
  estado_geral TEXT NOT NULL,
  etiquetas_efetivas TEXT[] NOT NULL DEFAULT '{}'::text[],
  item5_bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  item5_preenchido BOOLEAN NOT NULL DEFAULT FALSE,
  reg034_salvo BOOLEAN NOT NULL DEFAULT FALSE,
  cancelada BOOLEAN NOT NULL DEFAULT FALSE,
  versao INTEGER NOT NULL DEFAULT 0,
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_estado_setor_geral ON public.os_estado (setor, estado_geral);

-- 4) Notificações Outbox (Seção 8 + R05 lembrete 7d + R06 janela de entrega)
CREATE TABLE IF NOT EXISTS public.os_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.os(id) ON DELETE CASCADE,
  numero_os TEXT NOT NULL,
  evento_id UUID,
  setor TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregar_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue_em TIMESTAMPTZ,
  confirmada_em TIMESTAMPTZ,
  confirmada_por TEXT,
  confirmada_por_nome TEXT,
  ultimo_lembrete_em TIMESTAMPTZ,
  quantidade_lembretes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_os_notificacao_setor ON public.os_notificacao (setor, confirmada_em, entregar_em);
CREATE INDEX IF NOT EXISTS idx_os_notificacao_os ON public.os_notificacao (os_id);

-- 5) Feriados cadastráveis pelo ADM (D9 / R06 — começa com nacionais e Recife/PE)
CREATE TABLE IF NOT EXISTS public.feriado (
  data DATE PRIMARY KEY,
  descricao TEXT NOT NULL,
  escopo TEXT NOT NULL DEFAULT 'nacional',
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.feriado (data, descricao, escopo) VALUES
  ('2026-01-01', 'Confraternização Universal', 'nacional'),
  ('2026-02-17', 'Carnaval', 'nacional'),
  ('2026-03-06', 'Data Magna de Pernambuco (Revolução Pernambucana)', 'estadual_pe'),
  ('2026-04-03', 'Sexta-Feira Santa (Paixão de Cristo)', 'nacional'),
  ('2026-04-21', 'Tiradentes', 'nacional'),
  ('2026-05-01', 'Dia Mundial do Trabalho', 'nacional'),
  ('2026-06-04', 'Corpus Christi', 'municipal_recife'),
  ('2026-06-24', 'São João (Recife / Pernambuco)', 'municipal_recife'),
  ('2026-07-16', 'Nossa Senhora do Carmo (Padroeira do Recife)', 'municipal_recife'),
  ('2026-09-07', 'Independência do Brasil', 'nacional'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2026-11-02', 'Finados', 'nacional'),
  ('2026-11-15', 'Proclamação da República', 'nacional'),
  ('2026-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2026-12-08', 'Nossa Senhora da Conceição (Recife)', 'municipal_recife'),
  ('2026-12-25', 'Natal', 'nacional'),
  ('2027-01-01', 'Confraternização Universal', 'nacional'),
  ('2027-02-09', 'Carnaval', 'nacional'),
  ('2027-03-06', 'Data Magna de Pernambuco', 'estadual_pe'),
  ('2027-03-26', 'Sexta-Feira Santa (Paixão de Cristo)', 'nacional'),
  ('2027-04-21', 'Tiradentes', 'nacional'),
  ('2027-05-01', 'Dia Mundial do Trabalho', 'nacional'),
  ('2027-05-27', 'Corpus Christi', 'municipal_recife'),
  ('2027-06-24', 'São João (Recife / Pernambuco)', 'municipal_recife'),
  ('2027-07-16', 'Nossa Senhora do Carmo (Padroeira do Recife)', 'municipal_recife'),
  ('2027-09-07', 'Independência do Brasil', 'nacional'),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2027-11-02', 'Finados', 'nacional'),
  ('2027-11-15', 'Proclamação da República', 'nacional'),
  ('2027-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
  ('2027-12-08', 'Nossa Senhora da Conceição (Recife)', 'municipal_recife'),
  ('2027-12-25', 'Natal', 'nacional')
ON CONFLICT (data) DO NOTHING;

-- 6) Versionamento de schema e histórico de edição em formulários (Seção 7)
ALTER TABLE public.form_records
  ADD COLUMN IF NOT EXISTS versao_schema INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS historico_edicoes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 7) Função transacional com SELECT ... FOR UPDATE (Seção 6.2 & R10)
CREATE OR REPLACE FUNCTION public.aplicar_eventos_os_v4(
  p_os_id UUID,
  p_versao_esperada INTEGER,
  p_novos_eventos JSONB,
  p_estado JSONB,
  p_notificacoes JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_norm TEXT;
  v_versao_atual INTEGER;
  v_ev JSONB;
  v_notif JSONB;
  v_seq INTEGER;
  v_new_ev_id UUID;
  v_first_ev_id UUID := NULL;
  v_inserted_events JSONB := '[]'::jsonb;
  v_anula UUID[];
BEGIN
  SELECT numero_normalizado INTO v_norm
  FROM public.os
  WHERE id = p_os_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OS_NAO_ENCONTRADA';
  END IF;

  SELECT COALESCE(MAX(seq), 0) INTO v_versao_atual
  FROM public.os_evento
  WHERE os_id = p_os_id;

  IF v_versao_atual <> p_versao_esperada THEN
    RAISE EXCEPTION 'CONCORRENCIA_VERSAO:%', v_versao_atual;
  END IF;

  v_seq := v_versao_atual;

  FOR v_ev IN SELECT * FROM jsonb_array_elements(COALESCE(p_novos_eventos, '[]'::jsonb))
  LOOP
    v_seq := v_seq + 1;
    SELECT COALESCE(array_agg(x::uuid), '{}'::uuid[])
    INTO v_anula
    FROM jsonb_array_elements_text(COALESCE(v_ev->'anula', '[]'::jsonb)) AS x;

    INSERT INTO public.os_evento (
      os_id,
      numero_os_normalizado,
      seq,
      tipo,
      acao,
      valor,
      campos,
      regra_id,
      de_no,
      para_no,
      anula,
      motivo,
      usuario_id,
      usuario_nome,
      usuario_perfil,
      em
    ) VALUES (
      p_os_id,
      v_norm,
      v_seq,
      v_ev->>'tipo',
      NULLIF(v_ev->>'acao', ''),
      CASE WHEN v_ev ? 'valor' AND jsonb_typeof(v_ev->'valor') = 'boolean' THEN (v_ev->>'valor')::boolean ELSE NULL END,
      COALESCE(v_ev->'campos', '{}'::jsonb),
      NULLIF(v_ev->>'regra_id', ''),
      NULLIF(v_ev->>'de_no', ''),
      NULLIF(v_ev->>'para_no', ''),
      v_anula,
      NULLIF(v_ev->>'motivo', ''),
      v_ev->>'usuario_id',
      COALESCE(v_ev->>'usuario_nome', ''),
      v_ev->>'usuario_perfil',
      COALESCE((v_ev->>'em')::timestamptz, NOW())
    )
    RETURNING id INTO v_new_ev_id;

    IF v_first_ev_id IS NULL THEN
      v_first_ev_id := v_new_ev_id;
    END IF;

    v_inserted_events := v_inserted_events || jsonb_build_object(
      'id', v_new_ev_id,
      'seq', v_seq
    );
  END LOOP;

  UPDATE public.os_estado
  SET
    no = p_estado->>'no',
    origem = NULLIF(p_estado->>'origem', ''),
    etiqueta = NULLIF(p_estado->>'etiqueta', ''),
    setor = NULLIF(p_estado->>'setor', ''),
    estado_geral = p_estado->>'estado_geral',
    etiquetas_efetivas = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_estado->'etiquetas_efetivas', '[]'::jsonb))),
    item5_bloqueado = COALESCE((p_estado->>'item5_bloqueado')::boolean, FALSE),
    item5_preenchido = COALESCE((p_estado->>'item5_preenchido')::boolean, FALSE),
    reg034_salvo = COALESCE((p_estado->>'reg034_salvo')::boolean, FALSE),
    cancelada = COALESCE((p_estado->>'cancelada')::boolean, FALSE),
    versao = v_seq,
    atualizada_em = COALESCE((p_estado->>'atualizada_em')::timestamptz, NOW())
  WHERE os_id = p_os_id;

  FOR v_notif IN SELECT * FROM jsonb_array_elements(COALESCE(p_notificacoes, '[]'::jsonb))
  LOOP
    INSERT INTO public.os_notificacao (
      os_id,
      numero_os,
      evento_id,
      setor,
      mensagem,
      criada_em,
      entregar_em,
      entregue_em
    ) VALUES (
      p_os_id,
      p_estado->>'numero_os',
      v_first_ev_id,
      v_notif->>'setor',
      v_notif->>'mensagem',
      COALESCE((v_notif->>'criada_em')::timestamptz, NOW()),
      COALESCE((v_notif->>'entregar_em')::timestamptz, NOW()),
      CASE WHEN NULLIF(v_notif->>'entregue_em', '') IS NOT NULL THEN (v_notif->>'entregue_em')::timestamptz ELSE NULL END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'versao', v_seq,
    'eventos', v_inserted_events
  );
END;
$$;

-- 8) RLS habilitada em todas as tabelas (acesso via backend Service Role)
ALTER TABLE public.os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriado ENABLE ROW LEVEL SECURITY;
