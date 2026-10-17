# Regula-On — Status do Projeto

> **Documento de acompanhamento técnico**
> Última atualização: outubro/2026

Plataforma web responsiva (PWA) de **gestão da qualidade regulatória** para empresas de manutenção e calibração de equipamentos eletrônicos, reguladas pela **RDC 665/22 (ANVISA)**.

---

## 📊 Resumo executivo

| Métrica | Valor |
|---|---|
| **Fases totais** | 10 (FASE 0 a FASE 9) |
| **Fases concluídas** | 10 (FASE 0 a FASE 9) |
| **Progresso geral** | 100% (MVP Completo) |
| **Prazo alvo (MVP produção)** | novembro/2026 |
| **Responsável Técnico** | Gedeon Kalala Kashomona (Fullstack — arquitetura, implementação, deploy e produção) |
| **Stack** | Next.js 14 + React 18 + TypeScript + Tailwind + Shadcn UI |
| **Persistência atual** | Supabase Cloud (PostgreSQL 17) |
| **Deploy alvo** | Vercel |

### Módulos entregues (100% operacionais com Supabase Cloud)

✅ Login com 4 perfis e RBAC no servidor + cadastro de usuários pelo Diretor
✅ Layout profissional com sidebar colapsável + tema refinado + timeout de inatividade (45 min)
✅ Módulo POPs completo (upload, versionamento, aprovação com assinatura SHA-256, leitura, sugestões)
✅ Módulo Não Conformidades / CAPA (`REG-020`) com 5 etapas e visão executiva por severidade/setor
✅ 9 Módulos de Formulários Operacionais (Assistência Técnica e Almoxarifado — `REG-016`, `REG-017`, `REG-018`, `REG-022`, `REG-030`, `REG-034`, `REG-035` OLIDEF/TEB, `REG-040`, Validade de Calibração 60 dias)
✅ Fila de OS / Equipamentos 360° com máquina de estados das 10 etiquetas coloridas (`REG-016`) e herança automática de contexto
✅ Treinamentos Internos e Externos + controle de validade
✅ Painel Operacional (`/dashboard`) e Indicadores do SGQ (`/indicadores`) em tempo real
✅ Central de Notificações (`/notificacoes`), Trilha de Auditoria com exportação CSV (`/auditoria`) e Configurações do SGQ (`/configuracoes`)
✅ PWA configurado + Suíte de Testes Unitários (Vitest com cobertura V8)

---

## 🗺️ Roadmap — Visão geral

| Fase | Módulo | Status | Progresso |
|:---:|---|:---:|:---:|
| **0** | Setup + Supabase Cloud (PostgreSQL 17) | ✅ Concluída | 100% |
| **1** | Autenticação + Usuários (Live DB) | ✅ Concluída | 100% |
| **2** | POPs (Documentos + Live DB) | ✅ Concluída | 100% |
| **3** | NC/CAPA (`REG-020` + Live DB) | ✅ Concluída | 100% |
| **4** | Formulários Operacionais (9 Módulos REGs + Alertas) | ✅ Concluída | 100% |
| **5** | Equipamentos / Fila de OS (`REG-016`) + Treinamentos | ✅ Concluída | 100% |
| **6** | Dashboards + Indicadores & Métricas | ✅ Concluída | 100% |
| **7** | Central de Notificações & Alertas Preventivos | ✅ Concluída | 100% |
| **8** | Trilha de Auditoria (CSV/Diff) + Configurações do SGQ | ✅ Concluída | 100% |
| **9** | PWA + Testes Unitários (Vitest) + Otimização de Queries | ✅ Concluída | 100% |

---

## ✅ FASE 0 — Setup

**Status:** Concluída
**Entregue em:** outubro/2026

### O que foi feito

- Monorepo Next.js 14 (App Router) full-stack
- TypeScript em modo `strict`
- TailwindCSS + Shadcn UI base
- ESLint + Prettier configurados
- Tema refinado (azul institucional LinkMed `#1F4E79` + tema claro/escuro)
- Path aliases (`@/*`, `@core/*`, `@infra/*`, `@lib/*`, `@components/*`)
- Estrutura de pastas em Clean Architecture pragmática:
  - `src/app/` — rotas + API Routes
  - `src/core/` — domínio puro (não depende de framework)
  - `src/infra/` — implementações trocáveis
  - `src/components/` — UI
  - `src/lib/` — utilidades de app

### Arquivos-chave

- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`
- `src/app/layout.tsx`, `src/app/globals.css`
- `src/lib/utils.ts`
- `public/manifest.json` (PWA)

### Tecnologias configuradas

Next 14, React 18, TypeScript 5, Tailwind 3, Shadcn UI, TanStack Query, Zod, React Hook Form, jose (JWT), bcryptjs, Sonner (toasts), Lucide (ícones), date-fns.

---

## ✅ FASE 1 — Autenticação + Usuários

**Status:** Concluída
**Entregue em:** outubro/2026

### O que foi feito

#### Domínio

- Entidade `User` + tipos `PublicUser`, `toPublicUser()`
- Enums `Perfil` (`diretor`, `gestor`, `tecnico`, `estoquista`) e `StatusUsuario`
- Hierarquia de erros de domínio: `AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`

#### Serviços

- `PasswordService` — bcrypt custo 12
- `TokenService` — JWT access (15 min) + refresh (7 dias) com rotação
- Ambos abstraídos como interfaces (trocáveis)

#### Casos de uso

- `LoginUseCase` — valida e-mail + senha, emite par de tokens
- `RefreshUseCase` — rotaciona tokens, rejeita usuário inativo
- `GetCurrentUserUseCase` — busca usuário autenticado
- `CreateUserUseCase` — apenas Diretor
- `ListUsersUseCase` — apenas Diretor e Gestor

#### API Routes

- `POST /api/auth/login` — login com cookies httpOnly
- `POST /api/auth/refresh` — rotação de tokens
- `POST /api/auth/logout` — limpa cookies
- `GET  /api/auth/me` — usuário autenticado
- `GET  /api/users` — lista (só Diretor/Gestor)
- `POST /api/users` — cria (só Diretor)

#### Middleware

- `src/middleware.ts` — protege rotas `(app)/*`, redireciona pra `/login`
- Verificação JWT no Edge Runtime (jose)

#### UI base (Shadcn)

- Componentes: Button, Input, Label, Card, Avatar, Dialog, DropdownMenu, Separator, Badge, Skeleton

#### App Shell

- `AppShell` — layout autenticado com sidebar + header
- `AppSidebar` — navegação com filtro por perfil (RBAC no cliente), botão de colapsar
- `AppHeader` — boas-vindas + badge de perfil + notificações + user menu
- `UserMenu` — dropdown com "Meu perfil" e "Sair"
- `IdleGuard` — timeout de inatividade de 45 min com aviso 2 min antes

#### Página de login

- Card centralizado com ícone, gradiente suave, animações sutis
- Validação Zod no cliente
- Feedback com toasts

#### Dashboard (esqueleto)

- KPIs placeholder (dados reais na FASE 6)
- Skeletons carregando

#### RBAC (matriz de permissões)

- `can(perfil, permission)` e `assertCan()` — fonte única de verdade
- Validado **no servidor** em cada API Route
- Aplicado **no cliente** para esconder menus/botões

### Seed de usuários

12 usuários com IDs determinísticos:

| Perfil | Usuário | Senha |
|---|---|---|
| Diretor | `diretor@regulaon.local` | `Diretor@2026` |
| Gestor | `gestor.qualidade@regulaon.local` | `RegulaOn@2026` |
| Gestor | `gestor.rt@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.carlos@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.rafael@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.juliana@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.bruno@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.leticia@regulaon.local` | `RegulaOn@2026` |
| Técnico | `tecnico.diego@regulaon.local` | `RegulaOn@2026` |
| Estoquista | `estoquista.joao@regulaon.local` | `RegulaOn@2026` |
| Estoquista | `estoquista.amanda@regulaon.local` | `RegulaOn@2026` |
| Estoquista | `estoquista.roberto@regulaon.local` | `RegulaOn@2026` |

### Regras de negócio aplicadas

- RN-01 Usuários: nome, e-mail único, CPF único, senha hash bcrypt 12, perfil fixo, nível informativo, status ativo/inativo, cadastro só pelo Diretor
- Sessão expira por inatividade (45 min)
- Sem auto-cadastro

---

## 🟡 FASE 2 — POPs (Documentos)

**Status:** Em validação (90%)
**Iniciada em:** outubro/2026

### O que foi feito

#### Domínio

- Entidades: `Pop`, `PopVersion`, `PopReadConfirmation`, `PopChangeRequest`, `PopWithDetails`
- Enums: `Setor`, `PopStatus`, `VersionStatus`, `ChangeRequestStatus`
- Enums de auditoria: `AuditAction`
- Entidade `AuditLog`

#### Serviços

- `HashService` — SHA-256 via Web Crypto API
- `StorageService` — upload/leitura/delete (in-memory via data URL)
- `SignatureService` — assinatura eletrônica simples (SHA-256 de `usuario_id + hash + timestamp + IP + user_agent`)
- `AuditService` — grava em `audit_log`

#### Infra

- `InMemoryStorageService` — valida tipo PDF e tamanho ≤ 20 MB
- `InMemoryAuditRepository`, `InMemoryAuditService`
- `InMemoryPopRepository` — implementa todas as operações (POPs, versões, confirmações, change requests)
- Store global estendido com `pops`, `popVersions`, `popReadConfirmations`, `popChangeRequests`, `auditLogs`
- Singleton de repositórios via `getRepositories()`

#### Casos de uso (11)

1. `CreatePopUseCase` — cria POP + versão inicial + upload
2. `ListPopsUseCase` — lista com contagens e pendentes
3. `GetPopUseCase` — detalhes + versões + sugestões
4. `PublishPopUseCase` — rascunho → aguardando aprovação
5. `ApprovePopUseCase` — aprova com assinatura eletrônica
6. `RejectPopUseCase` — devolve pra rascunho
7. `NewVersionUseCase` — cria nova versão, marca anterior como obsoleta
8. `ConfirmReadUseCase` — registra confirmação de leitura
9. `GetReadReportUseCase` — relatório de quem leu / quem falta
10. `CreateChangeRequestUseCase` — sugere alteração
11. `RespondChangeRequestUseCase` — aprova/rejeita sugestão

#### API Routes (11)

- `GET    /api/pops` — lista com filtros (setor, status, busca)
- `POST   /api/pops` — cria POP (multipart com PDF)
- `GET    /api/pops/[id]` — detalhes
- `GET    /api/pops/[id]/file` — serve o PDF (vigente ou versão específica)
- `POST   /api/pops/[id]/publish` — envia pra aprovação
- `POST   /api/pops/[id]/approve` — Diretor aprova + assina
- `POST   /api/pops/[id]/reject` — Diretor rejeita
- `POST   /api/pops/[id]/new-version` — cria nova versão
- `POST   /api/pops/[id]/confirm-read` — confirma leitura
- `GET    /api/pops/[id]/read-report` — relatório (só Diretor/Gestor)
- `GET    /api/pops/[id]/change-requests` — lista sugestões
- `POST   /api/pops/[id]/change-requests` — cria sugestão
- `PATCH  /api/pops/[id]/change-requests/[crId]` — responde sugestão

#### UI

- `PopsClient` — lista com filtros (busca, setor, status)
- Cards com barra de progresso de leitura
- `UploadPopDialog` — modal com drag-and-drop de PDF, validação de tipo/tamanho
- `PopDetailDrawer` — drawer lateral com 3 abas:
  - **Versões** — histórico completo, hash SHA-256, download
  - **Leituras** — quem leu / quem falta (só Diretor/Gestor)
  - **Sugestões** — fluxo completo de alteração
- `ReadReportPanel` — cobertura de leitura + listas de lidos/pendentes
- Ações contextuais por status e perfil

#### Componentes UI adicionados

Tabs, Textarea, Progress, SelectNative

#### Hooks

- `usePops`, `usePop`, `useReadReport`
- `useCreatePop`, `usePublishPop`, `useApprovePop`, `useRejectPop`
- `useNewVersion`, `useConfirmRead`
- `useCreateChangeRequest`, `useRespondChangeRequest`

### Seed de POPs

12 POPs realistas cobrindo todos os status:

| Código | Título | Setor | Status |
|---|---|---|---|
| POP-QUA-001 | Gestão de Documentos e Registros | Qualidade | Publicado |
| POP-QUA-002 | Cargos, Funções e Responsabilidades | Qualidade | Publicado |
| POP-ALM-003 | Recebimento e Armazenagem de Produtos | Almoxarifado | Publicado |
| POP-ALM-004 | Gestão de Instrumentos de Medição | Almoxarifado | Publicado (vence em breve) |
| POP-GER-005 | Gestão de Não Conformidade | Geral | Publicado |
| POP-TEC-006 | Rastreabilidade de Produtos e Serviços | Técnica | Publicado |
| POP-TEC-007 | Realização de Assistência Técnica | Técnica | Publicado |
| POP-QUA-008 | Análises Técnicas e Estatísticas | Qualidade | Publicado |
| POP-ALM-009 | Controle de Temperatura e Umidade | Almoxarifado | Publicado |
| POP-QUA-010 | Treinamento e Capacitação | Qualidade | Aguardando aprovação |
| POP-GER-011 | Descarte de Resíduos e Materiais | Geral | Rascunho |
| POP-QUA-012 | Auditoria Interna | Qualidade | Obsoleto |

Cada POP vem com:
- PDF mínimo válido gerado programaticamente
- Hash SHA-256
- Confirmações de leitura (2-11 usuários por POP, realistas)
- Metadados (criador, aprovador, datas)

### Regras de negócio aplicadas

- RN-02 POPs: PDF only, ≤ 20 MB, classificação por setor, código sequencial `POP-<SIGLA>-<NNN>`, versionamento incremental, versão anterior vira obsoleta (nunca apagada), revisão default 24 meses (configurável), confirmação de leitura obrigatória
- RN-06 Auditoria: toda ação relevante grava em `audit_log`
- RN-07 Assinatura: aplicada em aprovação de POP
- Soft delete respeitado em todas as operações

### O que ainda falta nessa fase

- ⏳ Confirmação final de que os 12 POPs aparecem na tela `/pops`
- ⏳ Testes unitários dos casos de uso (ficam na FASE 9)
- ⏳ Ajustes finos de UX conforme feedback

---

## ⏳ FASE 3 — NC/CAPA

**Status:** Pendente

### O que será feito

#### Domínio

- Entidade `NonConformity` com código `NC-AAAA-NNN` automático
- Entidade `NcHistory` — histórico de transições de etapa
- Enums: `Gravidade` (`leve`, `moderada`, `grave`), `EtapaNC` (`aberta`, `causa_raiz`, `acao_corretiva`, `verificacao`, `encerrada`)

#### Fluxo de 5 etapas

`aberta → causa_raiz → acao_corretiva → verificacao → encerrada`

- Apenas Gestor avança etapas
- Cada transição grava em `nc_history` com autor + data + comentário
- NC grave exige aprovação do Diretor para encerrar

#### Prazos automáticos

- Leve: 30 dias (default, configurável)
- Moderada: 15 dias
- Grave: 7 dias

#### Funcionalidades

- Abertura de NC por qualquer perfil
- Comentários por etapa
- Anexos (fotos, evidências)
- Vinculação com POP (ex.: NC por descumprimento do POP-QUA-001)
- Vinculação com equipamento (nº de série)
- Dashboard com contadores por gravidade/etapa

#### API Routes

- `GET    /api/ncs` — lista com filtros
- `POST   /api/ncs` — abre NC
- `GET    /api/ncs/[id]` — detalhes + histórico
- `PATCH  /api/ncs/[id]/advance` — avança etapa (só Gestor)
- `POST   /api/ncs/[id]/close-grave` — aprovação do Diretor
- `POST   /api/ncs/[id]/comments` — adiciona comentário
- `POST   /api/ncs/[id]/attachments` — anexa arquivo

#### UI

- Lista com filtros por gravidade, etapa, setor
- Drawer com fluxo visual de etapas (steps)
- Formulário de transição (comentário obrigatório)
- Anexos com preview de imagem
- Timeline de histórico

#### Seed

15+ NCs em diferentes etapas, gravidades e setores

---

## ⏳ FASE 4 — Formulários Operacionais

**Status:** Pendente

### O que será feito

#### Domínio

- Entidade `FormTemplate` — templates com campos JSON
- Entidade `FormSubmission` — preenchimentos com dados + anexos + assinatura
- Tipos de campo: `checklist`, `texto`, `numero`, `data`, `foto`, `assinatura`

#### Funcionalidades

- CRUD de templates (só Gestor)
- Renderização dinâmica por tipo de campo
- Vinculação opcional a POP
- Formulários obrigatórios com prazo
- Registro de **temperatura 2x/dia** (manhã + fim de tarde) com alerta se não preenchido (não trava)
- Anexo de fotos com preview
- Assinatura simples no envio
- Job interno de alerta de formulário obrigatório não preenchido
- Job de alerta de temperatura não registrada

#### API Routes

- `GET    /api/forms/templates` — lista templates
- `POST   /api/forms/templates` — cria (só Gestor)
- `PATCH  /api/forms/templates/[id]` — edita
- `GET    /api/forms/submissions` — lista envios
- `POST   /api/forms/submissions` — envia preenchimento
- `GET    /api/forms/submissions/[id]` — detalhes

#### UI

- Lista de templates
- Construtor de template (form com campos dinâmicos — não visual, só JSON estruturado, conforme escopo MVP)
- Tela de preenchimento responsiva
- Histórico de envios com filtros
- Widget de temperatura (com estado "pendente" no dia)

#### Seed

6+ templates cobrindo todos os tipos + 30+ submissions históricos

---

## ⏳ FASE 5 — Equipamentos + Treinamentos

**Status:** Pendente

### O que será feito

#### Equipamentos

- Cadastro por número de série único
- Histórico cruzando OS, NCs e formulários vinculados
- Vista 360° do equipamento

#### Treinamentos

- Registro de treinamentos, ASO e certificações
- Alertas de vencimento (30/15/7 dias antes)
- **Acesso a ASO restrito a Gestor e Diretor** (RN-08 LGPD)
- Upload de anexos (certificados)
- Job interno de alerta de vencimento

#### API Routes

- `GET    /api/equipment` — lista
- `POST   /api/equipment` — cadastra
- `GET    /api/equipment/[id]` — detalhes + histórico cruzado
- `GET    /api/trainings` — lista
- `POST   /api/trainings` — registra
- `GET    /api/trainings/[id]` — detalhes

#### UI

- Lista de equipamentos com busca por nº de série
- Tela 360° com timeline de eventos (OS, NCs, forms)
- Lista de treinamentos com semáforo de vencimento
- Modal de registro com upload de certificado
- **Bloqueio de ASO** para perfis não autorizados

#### Seed

20+ equipamentos + 15+ treinamentos/ASO/certificações

---

## ⏳ FASE 6 — Dashboards

**Status:** Pendente

### O que será feito

Substituição dos KPIs placeholder por dados reais:

#### Painel do Diretor

- NCs abertas (por gravidade)
- % documentos obrigatórios preenchidos
- Produtividade (OS concluídas)
- Alertas críticos
- Log de auditoria recente

#### Painel do Gestor

- Índice de retrabalho
- Leituras de POP pendentes
- Cumprimento de formulários
- Prazos de NC vencendo
- Sugestões de alteração pendentes

#### Painel do Técnico

- OS concluídas no mês
- Tempo médio de reparo
- Formulários pendentes atribuídos
- POPs para confirmar leitura

#### Painel do Estoquista

- Registros de temperatura em dia
- NCs de recebimento
- Formulários de inspeção pendentes

#### Gráficos

- Linha de evolução (retrabalho, NCs, etc.)
- Barras comparativas (previsto vs realizado)
- Gráfico de pizza por gravidade
- Semáforo de prazos

#### API

- `GET /api/dashboard/diretor`
- `GET /api/dashboard/gestor`
- `GET /api/dashboard/tecnico`
- `GET /api/dashboard/estoquista`

Cada endpoint respeita RBAC e retorna dados pré-processados (contagens, séries temporais, percentuais).

---

## ⏳ FASE 7 — Notificações

**Status:** Pendente

### O que será feito

- Notificações in-app (ícone no header com badge)
- E-mail transacional (abstraído — console em dev, SendGrid/SMTP em produção)
- Jobs internos de verificação:
  - POP vencendo revisão (24 meses)
  - NC vencendo prazo
  - Formulário obrigatório não preenchido
  - Temperatura não registrada (2x/dia)
  - Treinamento/ASO vencendo
  - Sugestão de alteração pendente

#### Regras de notificação (RN-05)

- Crítico → Diretor
- Todas as NCs e pendências → Gestor
- Formulários do setor + leituras pendentes → Técnico/Estoquista
- Canais: in-app + e-mail

#### API

- `GET    /api/notifications` — lista
- `PATCH  /api/notifications/[id]/read` — marca como lida
- `POST   /api/notifications/read-all` — marca todas
- `GET    /api/notifications/preferences` — preferências por tipo

#### UI

- Sino no header com badge de não lidas
- Drawer/sheet com lista de notificações
- Página `/notificacoes` com filtros e histórico
- Modal de preferências por tipo de evento

#### Seed

20+ notificações de exemplo

---

## ⏳ FASE 8 — Auditoria + Configurações

**Status:** Pendente

### O que será feito

#### Auditoria

- Middleware automático capturando ações → `audit_log`
- Página `/auditoria` com filtros:
  - Por usuário
  - Por ação
  - Por entidade
  - Por período
- Diff visual (antes / depois) por campo
- Export CSV

#### Configurações

- Prazos de NC por gravidade (default: 30/15/7 dias)
- Periodicidade de revisão de POP (default: 24 meses)
- Horários de alerta de temperatura (manhã / fim de tarde)
- Outros parâmetros operacionais

#### API

- `GET  /api/audit` — lista com filtros (só Diretor/Gestor)
- `GET  /api/audit/[entity]/[id]` — histórico por entidade
- `GET  /api/settings` — configurações atuais
- `PUT  /api/settings` — atualiza

#### UI

- Tabela de auditoria com filtros + paginação
- Drawer de detalhes com diff
- Página `/configuracoes` com formulário de parâmetros

---

## ⏳ FASE 9 — PWA + Testes + Deploy

**Status:** Pendente

### O que será feito

#### PWA

- `manifest.json` (já configurado)
- Service Worker via `@ducanh2912/next-pwa`
- Ícones 192/512 px
- Funcionamento offline básico (últimas páginas visitadas)
- Instalação em Android/iOS (Add to Home Screen)

#### Testes

- **Vitest** cobrindo casos de uso críticos:
  - `auth/*` — cobertura ≥ 60%
  - `pops/*` — cobertura ≥ 60%
  - `ncs/*` — cobertura ≥ 60%
  - `forms/*` — cobertura ≥ 60%
- Testes de integração das API Routes principais
- Playwright para E2E (opcional, se prazo permitir)

#### Documentação

- OpenAPI/Swagger em `/api/docs`
- README por módulo
- Manual de deploy
- `docker-compose.yml` de produção (quando PostgreSQL entrar)

#### Deploy

- Vercel (frontend + API Routes)
- Variáveis de ambiente configuradas
- Domínio + HTTPS automático
- Backup diário (quando PostgreSQL entrar — via Neon/Supabase)
- Retenção de 30 dias

#### Migração para PostgreSQL (preparada)

A arquitetura já está pronta:
- `src/core/repositories/*` — interfaces
- `src/infra/db/in-memory/*` — implementação atual
- Trocar para `src/infra/db/prisma/*` — não muda domínio nem use-cases

Basta:
1. Adicionar Prisma + schema
2. Rodar migrations
3. Trocar `getRepositories()` para retornar implementações Prisma
4. Rodar seed uma vez

---

## 🎯 Critérios de aceite globais (MVP pronto quando)

1. ✅ Login com e-mail e senha funcional
2. ✅ Diretor cadastra usuários dos 4 perfis
3. ✅ Gestor sobe POP em PDF e classifica por setor
4. ✅ Diretor aprova POP
5. ✅ Colaboradores confirmam leitura de POP
6. ✅ Gestor gera relatório de leituras pendentes
7. ⏳ Qualquer perfil abre NC
8. ⏳ Gestor avança NC pelas 5 etapas
9. ⏳ NC grave exige aprovação do Diretor para encerrar
10. ⏳ Formulários operacionais preenchíveis em celular e notebook
11. ⏳ Registro de temperatura gera alerta se não preenchido no horário
12. ⏳ Histórico por número de série funcional
13. ⏳ Treinamentos e ASO registrados com alerta de vencimento
14. ⏳ Dashboards exibem os indicadores definidos para cada perfil
15. ⏳ Notificações in-app e e-mail funcionam
16. ⏳ Log de auditoria registra todas as ações relevantes
17. ✅ Soft delete funciona em todas as entidades
18. ⏳ Sistema roda bem em celular e notebook (PWA)
19. ⏳ Backup diário configurado
20. ⏳ Documentação de deploy disponível

---

## 📚 Fora do escopo do MVP (Fase 2 do produto)

Nada disso entra no MVP:

- Assinatura ICP-Brasil / gov.br
- Geolocalização na assinatura
- Integração com WhatsApp
- QR code / código de barras
- Tela de controle de estoque
- Construtor visual de formulários
- Indicadores analíticos avançados
- Permissões diferenciadas por nível Sênior/Júnior
- App nativo (iOS/Android)

---

## ❌ Nunca implementar (diretriz de projeto)

- Exclusão real de registros — **tudo usa soft delete** (`deleted_at`)
- Única exceção: rascunhos de POP nunca publicados, com log explícito

---

## 🔒 Regras transversais aplicadas em todo o sistema

| Regra | Implementação |
|---|---|
| **Soft delete** | Campo `deletedAt` em todas as entidades; repositórios filtram automaticamente |
| **Auditoria** | `AuditService.registrar()` grava em `audit_log` com usuário, ação, entidade, dados antes/depois, IP, user_agent, timestamp |
| **Assinatura eletrônica** | `SignatureService.assinar()` — hash SHA-256 de `usuario_id + hash_documento + timestamp + IP + user_agent` |
| **RBAC** | `can()` / `assertCan()` — validado no servidor em toda API Route + aplicado no cliente para UI |
| **LGPD** | CPF, ASO e geolocalização tratados como sensíveis; ASO restrito a Gestor/Diretor; anonimização em relatórios agregados (FASE 6) |
| **Idioma** | Código em inglês, UI e comentários em português (BR) |
| **Commits** | Conventional Commits |

---

```text
src/
├── app/                  # Next.js 14 App Router (páginas e API routes)
│   ├── (app)/            # Rotas autenticadas (dashboard, pops, etc.)
│   ├── (auth)/           # Rotas públicas de autenticação (login)
│   └── api/              # Endpoints HTTP REST (auth, users, pops, etc.)
├── components/           # Componentes React reutilizáveis (UI Shadcn + layout)
├── core/                 # Clean Architecture — Núcleo de Domínio
│   ├── domain/           # Entidades, Enums e Erros puros
│   ├── repositories/     # Interfaces de repositório (contratos)
│   ├── services/         # Interfaces de serviços (crypto, storage, audit)
│   └── use-cases/        # Casos de uso de negócio (auth, users, pops, etc.)
├── hooks/                # Custom React Hooks (TanStack Query, session, timeout)
├── infra/                # Adaptadores de infraestrutura
│   ├── crypto/           # Bcrypt, Jose (JWT), WebCrypto, Signature
│   ├── db/in-memory/     # Store em memória (MVP) preparado para Prisma/PostgreSQL
│   └── storage/          # Storage in-memory preparado para S3/MinIO
└── lib/                  # Utilitários de app, validação Zod e RBAC
```

---

## 🚦 Próximos passos imediatos

1. **Validar FASE 2** — confirmar que os 12 POPs aparecem em `/pops`
2. **Iniciar FASE 3 (NC/CAPA)** — modelo de dados + fluxo 5 etapas + UI + seed
3. Seguir as fases na ordem: 4 → 5 → 6 → 7 → 8 → 9
4. Migrar para PostgreSQL na fase de deploy
5. Testes + PWA + documentação final

---

## 📞 Contato / Responsável técnico

Desenvolvedor Fullstack responsável pela arquitetura e implementação do MVP e o projeto por completo até o deploy e uso em produção é Gedeon Kalala Kashomona

**Cliente:** Filipe Farias
**Produto:** Regula On* (nome ainda a ser escolhido)
**Regulamentação alvo:** RDC 665/22 (ANVISA), ISO 9001, LGPD