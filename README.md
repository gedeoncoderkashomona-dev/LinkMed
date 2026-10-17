# LINKMED — Soluções Médicas

[![Versão](https://img.shields.io/badge/versão-v1.0.1--beta.1%20(Beta%201.0.1)-blue.svg?style=for-the-badge&logo=semver)](https://github.com/gedeoncoderkashomona-dev/LinkMed/releases)
[![Status do Deploy](https://img.shields.io/badge/Netlify-ONLINE-success.svg?style=for-the-badge&logo=netlify)](https://linkmed.netlify.app)
[![Conformidade Regulatória](https://img.shields.io/badge/ANVISA-RDC%20665%2F2022-emerald.svg?style=for-the-badge)](https://www.gov.br/anvisa)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20(App%20Router)-black.svg?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL%2017%20(RLS)-336791.svg?style=for-the-badge&logo=postgresql)](https://supabase.com)

> **Sistema de Gestão da Qualidade Regulatória (SGQ), Rastreabilidade Operacional e Assistência Técnica Médico-Hospitalar**  
> Conformidade integral com a **RDC 665/2022 (ANVISA — Boas Práticas de Fabricação e Distribuição de Produtos Médicos)** e requisitos metrológicos do **INMETRO / PSIE**.

🔗 **Ambiente de Produção Oficial:** [https://linkmed.netlify.app](https://linkmed.netlify.app)

---

## 📑 Sumário Executivo

1. [Visão Geral da Plataforma](#-visão-geral-da-plataforma)
2. [Versionamento Profissional (SemVer)](#-processo-de-versionamento-profissional-semver)
3. [Responsividade Multi-Dispositivo](#-responsividade-multi-dispositivo)
4. [Matriz de Perfis e Permissões de Acesso (RBAC)](#-matriz-de-perfis-e-permissões-de-acesso-rbac)
5. [Módulos Operacionais e Formulários (RDC 665/22)](#-módulos-operacionais-e-formulários-rdc-66522)
6. [Arquitetura de Software (Clean Architecture)](#-arquitetura-do-sistema)
7. [Trilha de Auditoria Imutável e Segurança](#-trilha-de-auditoria-imutável-e-segurança)
8. [Ambiente de Desenvolvimento e Deploy Contínuo (CI/CD)](#-ambiente-de-desenvolvimento-e-ci-cd)
9. [Histórico de Mudanças (Changelog)](#-histórico-de-mudanças)

---

## 🏥 Visão Geral da Plataforma

O **LINKMED — Soluções Médicas** é uma solução SaaS especializada para o setor de saúde, projetada para substituir processos manuais em papel e planilhas descentralizadas por fluxos regulatórios estritos, auditáveis e automatizados.

### Pilares Fundamentais:
- **Gestão Documental de POPs (Procedimentos Operacionais Padrão)**: Versionamento controlado, fluxo de aprovação com assinatura eletrônica e confirmação de leitura obrigatória pelos colaboradores com prazo de vigência (revisão bienal conforme RDC 665/22).
- **Rastreabilidade Ponta a Ponta de Equipamentos e OS**: Sistema de etiquetagem colorida por etapas de bancada (REG-016 / POP-020), do recebimento à calibração e expedição.
- **Trilha de Auditoria Imutável (Audit Trail)**: Armazenamento permanente de qualquer alteração cadastral ou operacional (quem executou, qual endereço IP, timestamp UTC e diferencial *antes/depois* em formato JSONB).
- **Controle de Calibrações e Equipamentos**: Alertas proativos de vencimento metrológico RBC para evitar uso de instrumentos descalibrados.

---

## 🏷️ Processo de Versionamento Profissional (SemVer)

O projeto adota rigorosamente a especificação **Semantic Versioning 2.0.0 (SemVer)**:

$$\text{v}\langle\text{MAJOR}\rangle.\langle\text{MINOR}\rangle.\langle\text{PATCH}\rangle-\langle\text{PRERELEASE}\rangle$$

| Componente | Significado | Aplicação no LinkMed |
| :--- | :--- | :--- |
| **MAJOR (1)** | Mudança com quebra de compatibilidade ou marco estrutural de lançamento. | `v1.x.x` representa o lançamento estável da infraestrutura base LinkMed. |
| **MINOR (0)** | Novas funcionalidades compatíveis com a versão anterior. | Novos módulos operacionais, fluxos de assinatura e relatórios analíticos. |
| **PATCH (1)** | Correções de bugs, ajustes de responsividade e melhorias de performance. | Otimização do menu lateral, suporte mobile/tablet e correções visuais. |
| **PRERELEASE (-beta.1)** | Estágio de validação homologada em ambiente real de produção. | **Beta 1.0.1** (`v1.0.1-beta.1`) — Estágio de homologação e testes de campo. |

### Convenções de Git Tags e Releases:
- Toda versão homologada recebe uma Git Tag anotada e imutável no repositório:
  ```bash
  git tag -a v1.0.1-beta.1 -m "Release v1.0.1-beta.1: Responsividade multi-dispositivo e navegação mobile otimizada"
  git push origin v1.0.1-beta.1
  ```
- O deploy em produção é **100% automatizado** via pipeline CI/CD no Netlify acionado a cada push na branch principal (`main`).

---

## 📱 Responsividade Multi-Dispositivo

O sistema foi rigorosamente desenvolvido e validado para oferecer máxima ergonomia e desempenho em qualquer tamanho de tela:

```
[Smartphone (360px - 430px)]  -->  [Tablet (768px - 1024px)]  -->  [Notebook / Desktop (1280px+)]
Gaveta Lateral Touch              Layout Híbrido com Badges         Barra Lateral Fixa / Retrátil
Cards em Coluna Única             Grades de 2 Colunas               Visão em Tabela Corporativa
Touch Targets >= 44px             Scroll Horizontal Protegido       Alta Densidade de Dados
```

### Matriz de Dispositivos Homologados:
- **Smartphones de Última Geração (iOS / Android)**:
  - Apple iPhone 13, 14, 15, 16 (padrão, Pro e Pro Max).
  - Samsung Galaxy Séries S (S21 a S24 Ultra) e Galaxy A.
  - Gaveta de navegação deslizante (*Mobile Drawer*) com fechamento automático ao navegar, bloqueio de rolagem de fundo e backdrop translúcido.
- **Tablets**:
  - Apple iPad (Air, Mini, Pro 11" e 12.9") e Samsung Galaxy Tab.
  - Grids adaptativos de 2 colunas com suporte a orientação Retrato e Paisagem.
- **Notebooks e Desktops**:
  - Telas de 13", 14", 15.6", 16", monitores Full HD (1920x1080) e Ultrawide.
  - Alternância imediata entre **Visualização em Tabela Corporativa** e **Visualização em Grade de Cards**.

---

## 👥 Matriz de Perfis e Permissões de Acesso (RBAC)

O controle de acesso baseado em papéis (*Role-Based Access Control*) garante que cada setor visualize e execute estritamente as ações permitidas por sua competência regulatória (RDC 665/22):

| Recurso / Módulo | Diretor (`diretor`) | Gestor da Qualidade / RT (`gestor`) | Técnico de Assistência (`tecnico`) | Estoquista / Almoxarifado (`estoquista`) |
| :--- | :---: | :---: | :---: | :---: |
| **Painel Operacional (Dashboard)** | Completo | Completo | Operacional | Logístico |
| **Documentos (POPs) — Leitura / Ciência** | ✅ Total | ✅ Total | ✅ Setorial | ✅ Setorial |
| **POPs — Upload / Nova Versão** | ✅ Total | ✅ Total | ❌ Restrito | ❌ Restrito |
| **POPs — Aprovação Regulatória** | ✅ Total | ✅ Total | ❌ Restrito | ❌ Restrito |
| **Formulários da Qualidade (F.01 a F.06, F.18 a F.21)** | ✅ Total | ✅ Total | ❌ Restrito | ❌ Restrito |
| **Formulários de Assistência (F.11 a F.17)** | ✅ Total | ✅ Total | ✅ Criação e Edição | ❌ Consulta apenas |
| **Formulários de Logística (F.07 a F.10, F.22)** | ✅ Total | ✅ Total | ❌ Consulta apenas | ✅ Criação e Edição |
| **Não Conformidades (RNC / CAPA)** | ✅ Gerência | ✅ Gerência | ⚠️ Abertura apenas | ⚠️ Abertura apenas |
| **Gestão de Usuários e Permissões** | ✅ Exclusivo | ❌ Restrito | ❌ Restrito | ❌ Restrito |
| **Trilha de Auditoria (Audit Trail)** | ✅ Completa + Exportação CSV | ✅ Completa | ❌ Sem Acesso | ❌ Sem Acesso |
| **Configurações Gerais do Sistema** | ✅ Total | ✅ Parcial | ❌ Sem Acesso | ❌ Sem Acesso |

---

## 📋 Módulos Operacionais e Formulários (RDC 665/22)

A plataforma integra os **22 Formulários Operacionais e Procedimentos Padrão (F.01 a F.22)**:

| Código | Nome do Formulário | Setor Responsável | Norma de Referência |
| :--- | :--- | :--- | :--- |
| **F.01** | Lista Mestra de Documentos e Registros | Gestão da Qualidade | RDC 665 Art. 12 |
| **F.02** | Registro de Treinamento e Capacitação | RH / Qualidade | RDC 665 Art. 15 |
| **F.03** | Registro de Reclamação de Clientes | SAC / Qualidade | RDC 665 Art. 118 |
| **F.04** | Relatório de Não Conformidade (RNC / CAPA) | Qualidade / RT | RDC 665 Art. 122 |
| **F.05** | Relatório de Auditoria Interna da Qualidade | Auditoria / RT | RDC 665 Art. 18 |
| **F.06** | Qualificação e Avaliação de Fornecedores | Compras / Qualidade | RDC 665 Art. 38 |
| **F.07** | Registro de Recebimento de Mercadorias | Almoxarifado | RDC 665 Art. 65 |
| **F.08** | Inspeção de Entrada de Matérias-Primas e Componentes | CQ / Estoque | RDC 665 Art. 68 |
| **F.09** | Controle de Estoque e Armazenamento | Almoxarifado | RDC 665 Art. 72 |
| **F.10** | Registro de Expedição de Produtos e Equipamentos | Expedição / Logística | RDC 665 Art. 75 |
| **F.11** | Ordem de Serviço de Assistência Técnica (OS) | Engenharia Clínica | RDC 665 Art. 90 |
| **F.12** | Registro de Inspeção e Manutenção Preventiva/Corretiva | Técnica | RDC 665 Art. 92 |
| **F.13** | Orçamento de Manutenção e Reparo | Comercial / Técnica | RDC 665 Art. 94 |
| **F.14** | Registro de Desinfecção e Limpeza de Equipamentos | Técnica / Higienização | RDC 665 Art. 52 |
| **F.15** | Termo de Entrega de Equipamento em Empréstimo | Logística / Técnica | RDC 665 Art. 80 |
| **F.16** | Termo de Devolução de Equipamento | Logística / Técnica | RDC 665 Art. 82 |
| **F.17** | Qualificação de Instalação e Operação (QI/QO) | Engenharia Clínica | RDC 665 Art. 45 |
| **F.18** | Controle de Instrumentos de Medição e Calibração RBC | Metrologia / Técnica | INMETRO / RDC 665 Art. 55 |
| **F.19** | Ata de Reunião de Análise Crítica pela Direção | Diretoria / RT | RDC 665 Art. 20 |
| **F.20** | Registro de Controle de Mudanças | Qualidade / Engenharia | RDC 665 Art. 25 |
| **F.21** | Matriz de Gerenciamento de Riscos | Qualidade / RT | ISO 14971 / RDC 665 |
| **F.22** | Registro de Rastreabilidade por Número de Série/Lote | Engenharia / Logística | RDC 665 Art. 85 |

---

## 🏛️ Arquitetura do Sistema

Construído sob o paradigma de **Monolito Modular em Clean Architecture Pragmática**:

```
src/
├── core/                      # DOMÍNIO PURO (Zero dependência externa)
│   ├── domain/                # Entidades, Value Objects, Enums e Erros de Domínio
│   ├── application/           # Casos de Uso (Use Cases) e Portas (Interfaces)
│   └── __tests__/             # Suíte de Testes Unitários de Regra de Negócio
├── infra/                     # ADAPTADORES CONCRETOS
│   └── db/supabase/           # Repositórios PostgreSQL com RLS e Auth
├── app/                       # CAMADA DE APRESENTAÇÃO (Next.js 14 App Router)
│   ├── (auth)/                # Fluxo de Autenticação com Splash Hospitalar
│   ├── (app)/                 # Telas da Aplicação com Error Boundaries isolados
│   └── api/                   # Handlers REST tipados com tratamento de exceções
├── components/                # Design System Hospitalar, Modais e Componentes UI
└── lib/                       # Validações Zod, RBAC, Versão e Utilitários
```

---

## 🛡️ Trilha de Auditoria Imutável e Segurança

1. **Row Level Security (RLS)**: Cada tabela no banco de dados possui políticas de acesso validadas diretamente no kernel do PostgreSQL, impedindo leitura ou gravação indevida.
2. **Audit Trail Append-Only**: Triggers de banco e interceptadores de aplicação registram qualquer alteração de estado com identificadores únicos, sem permissão de exclusão (`DELETE`) para qualquer usuário.
3. **Isolamento de Falhas (Fault Isolation)**: Cada página possui seu próprio `error.tsx` e `loading.tsx`. Falhas momentâneas em um módulo não afetam os demais nem interrompem a sessão do usuário.
4. **Proteção contra Inatividade**: `IdleGuard` integrado monitora o tempo ocioso e encerra a sessão com segurança em postos de trabalho hospitalares compartilhados.

---

## 🚀 Ambiente de Desenvolvimento e CI/CD

### Pré-requisitos
- **Node.js** 20.x LTS
- **NPM** 10.x+
- Instância do **Supabase** configurada com as migrações em `supabase/migrations/`

### Execução Local
```bash
# 1. Instalar todas as dependências
npm install

# 2. Executar o servidor de desenvolvimento
npm run dev

# 3. Rodar suíte de testes unitários (Vitest)
npx vitest run

# 4. Validar tipagem estática TypeScript
npx tsc --noEmit

# 5. Compilar build otimizado de produção
npm run build
```

### Pipeline de Deploy Automatizado (Netlify)
O repositório está integrado à plataforma Netlify:
- **Gatilho de Build**: Todo `push` na branch `main` inicia a compilação via plugin oficial `@netlify/plugin-nextjs`.
- **Variáveis de Ambiente**: Segredos e chaves de API são gerenciados de forma criptografada pelo painel Netlify.

---

## 📜 Histórico de Mudanças

### [v1.0.1-beta.1] — 17/10/2026 (Beta 1.0.1)
- **Responsividade Multi-Dispositivo**:
  - Implementação do drawer lateral retrátil (*Mobile Drawer*) para smartphones (iOS/Android) e tablets.
  - Otimização de touch targets (mínimo 44px) e bloqueio de rolagem do body quando o menu está aberto.
  - Ajuste de quebra flexível de botões de ação e filtros nas telas de Auditoria, Formulários e Usuários.
  - Suporte a visualização dupla (Tabela Corporativa vs Grade de Cards) com alternância fluida.
- **Identidade e Versionamento**:
  - Integração do módulo centralizado `src/lib/version.ts` exibindo `Beta 1.0.1` nos cabeçalhos e gaveta mobile.
  - Padronização SemVer oficial e configuração de CI/CD para deploy contínuo via GitHub.
- **Performance e Navegação**:
  - Remoção de splash loaders desnecessários em trocas de rota interna, garantindo navegação instantânea.
  - Pré-carregamento automático de rotas (`prefetch`) no menu principal.

---

## ⚡ Autoria e Licença

Desenvolvido com excelência em engenharia de software e conformidade médico-hospitalar por [**Okapi Code Forge**](https://www.okapicodeforge.com.br/).  
Todos os direitos reservados © 2026.
