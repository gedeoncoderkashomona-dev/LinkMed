-- ==============================================================================
-- REGULA-ON - Hardening de Segurança (Row Level Security em todas as tabelas)
-- Bloqueia qualquer acesso direto via PostgREST / chave pública (anon key).
-- Todo o tráfego passa exclusivamente pelas API Routes do Next.js (Service Role)
-- com validação JWT (jose) + RBAC no servidor.
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_read_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
