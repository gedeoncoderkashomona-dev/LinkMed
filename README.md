# LINKMED — Soluções Médicas

> **Sistema de Gestão da Qualidade Regulatória (SGQ), Rastreabilidade Operacional e Assistência Técnica Médico-Hospitalar**  
> Conformidade integral com a **RDC 665/2022 (ANVISA — Boas Práticas de Fabricação e Distribuição de Produtos Médicos)** e **INMETRO / PSIE**.

---

## 🏥 O que é o Sistema?

O **LINKMED — Soluções Médicas** (arquitetura base *Regula-On Enterprise*) é uma plataforma SaaS **ERP/SGQ Médico-Hospitalar** projetada para gerenciar, rastrear e auditar de ponta a ponta o ciclo de vida regulatório e operacional de equipamentos e dispositivos médicos:

1. **Gestão Documental de POPs (Procedimentos Operacionais Padrão)**: Controle de versões, vigência, revisão periódica (2 anos), fluxo de aprovação e confirmação de leitura por colaborador com trilha de auditoria.
2. **Execução Gamificada de 22 Formulários Operacionais (F.01 a F.22)**:
   - *Assistência Técnica & Engenharia Clínica*: Ordem de Serviço (F.11), Inspeção e Manutenção (F.12), Orçamento (F.13), Desinfecção (F.14), Empréstimo/Comodato (F.15), Devolução (F.16) e Qualificação de Instalação (F.17).
   - *Logística & Estoque Médico*: Recebimento de Mercadorias (F.07), Inspeção de Entrada (F.08), Controle de Estoque (F.09), Expedição (F.10) e Rastreabilidade por Série/Lote (F.22).
   - *Qualidade & Regulatório (SGQ)*: Lista Mestra (F.01), Treinamento (F.02), Reclamação de Clientes (F.03), RNC / CAPA (F.04), Auditoria Interna (F.05), Fornecedores (F.06), Instrumentos de Medição/Calibração RBC (F.18), Análise Crítica (F.19), Controle de Mudanças (F.20) e Gestão de Riscos ISO 14971 (F.21).
3. **Motor Inteligente de RNC & CAPA**: Geração automática de Não Conformidades quando parâmetros críticos falham em inspeções ou ordens de serviço.
4. **Indicadores da Qualidade (KPIs) & Trilha de Auditoria Imutável**: Monitoramento em tempo real de conformidade e registro append-only (quem fez o quê, quando e o estado antes/depois).
5. **Arquitetura SaaS White-Label Multi-Instituição**: Preparado para que outras instituições hospitalares e distribuidoras médicas utilizem a plataforma via assinatura mensal, personalizando nome da instituição, subtítulo e paleta de cores em tempo real.

---

## 🏛️ Arquitetura do Sistema: Monolito Modular em Clean Architecture

O sistema foi construído como um **Monolito Modular em Clean Architecture Pragmática** sobre **Next.js 14 (App Router) + TypeScript Strict + Supabase PostgreSQL 17 (RLS)**.

```
src/
├── core/                      # CAMADA PURA (Zero dependência de Next.js, React ou Supabase)
│   ├── domain/                # Entidades, Value Objects e Erros de Domínio (POP, Form, NC, Audit)
│   ├── application/           # Casos de Uso (Use Cases) e Portas (Interfaces de Repositório)
│   └── __tests__/             # Suíte de Testes Unitários (Vitest) validando regras ANVISA/RDC 665
├── infra/                     # CAMADA DE INFRAESTRUTURA (Adaptadores concretos)
│   └── db/supabase/           # Repositórios PostgreSQL, Storage e Auth Server/Browser
├── app/                       # CAMADA DE ENTREGA (Next.js App Router: UI + Route Handlers REST)
│   ├── (auth)/                # Autenticação e transição visual com identidade hospitalar
│   ├── (app)/                 # Módulos operacionais isolados por Error Boundary
│   └── api/                   # Endpoints REST padronizados via apiHandler + validação Zod
├── components/                # Design System Hospitalar, White-Label Branding e Componentes UI
└── lib/                       # Schemas Zod, motor dos 22 formulários, RBAC e utilitários
```

### Por que Monolito Modular (e como ele escala para Microserviços)?
- **Zero latência de rede interna e custo operacional enxuto**: Diferente de microserviços prematuros que adicionam complexidade e lentidão entre chamadas, o Monolito Modular executa todas as regras com velocidade máxima e transacionalidade segura no PostgreSQL.
- **Pronto para extração de microserviços sob demanda**: Como `src/core/domain` e `src/core/application` dependem exclusivamente de **Interfaces (Portas)** e não conhecem o banco nem o framework web, qualquer módulo (ex.: *Assistência Técnica*, *Notificações* ou *Emissão de Laudos PDF*) pode ser extraído para um microserviço independente em horas, bastando trocar o adaptador em `src/infra/`.

---

## 🛡️ Plano de Contingência e Isolamento de Falhas (Fault Isolation)

Se um processo ou módulo apresentar falha, **o restante do sistema continua operando normalmente e sem lentidão**:

1. **Error Boundary Modular (`src/app/(app)/error.tsx`)**: Cada rota/módulo é protegido por uma camada de contenção. Se ocorrer uma exceção em uma tela específica, a Sidebar, o Topbar, a sessão do usuário e todos os demais módulos permanecem 100% ativos, exibindo um painel de recuperação rápida + diagnóstico técnico (` rota`, `código`, `digest`).
2. **Isolamento de Rotas de API (`src/lib/http/api-handler.ts`)**: Todas as rotas `/api/*` são encapsuladas por um tratador centralizado que captura erros de domínio (`AppError`), erros de validação (`ZodError` HTTP 422 com indicação exata do campo) e falhas inesperadas, retornando JSON estruturado com `route`, `method` e `timestamp` sem derrubar o servidor Node/Edge.
3. **Resiliência de Dados no Cliente (TanStack React Query)**: Cache independente por chave de consulta (`pops`, `forms`, `ncs`, `audit`). Se uma listagem falhar momentaneamente por oscilação de rede, as demais telas usam cache validado e fazem *retry* automático sem travar a interface.
4. **Segurança em Dupla Camada (RBAC + PostgreSQL RLS)**: Mesmo em cenários extremos, o banco de dados possui **Row Level Security (RLS)** ativo em todas as 9 tabelas e `audit_log` imutável via Trigger PostgreSQL.

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- **Node.js** 18.18+ ou 20+
- Variáveis de ambiente configuradas em `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL="https://<seu-projeto>.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<sua-chave-anon>"
  SUPABASE_SERVICE_ROLE_KEY="<sua-chave-service-role>"
  ```

### 2. Comandos Principais
```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento (http://localhost:3000)
npm run dev

# Executar suíte de testes unitários (Vitest)
npx vitest run

# Validar tipagem estática (TypeScript Strict)
npx tsc --noEmit

# Gerar build de produção
npm run build
```

---

## 🌐 Deploy no Netlify / Vercel

1. Conecte o repositório Git ao **Netlify** (ou **Vercel**).
2. Configure o comando de build: `npm run build` e diretório de publicação `.next` (com plugin oficial `@netlify/plugin-nextjs` no Netlify).
3. Adicione as 3 variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) no painel do provedor.

---

## ⚡ Créditos

Desenvolvido com excelência em engenharia de software por [**Okapi Code Forge**](https://www.okapicodeforge.com.br/).
