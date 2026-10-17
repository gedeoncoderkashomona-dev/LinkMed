# Especificação Técnica e Arquitetura do Módulo de Assistência Técnica (Regula-On / LinkMed ERP)

> **Documento de Contexto / Fonte da Verdade para Desenvolvimento**
> **Conformidade Normativa:** ANVISA RDC nº 665/2022, INMETRO / PSIE.

---

## 1. Mapeamento Geral de Nomenclaturas (POPs e REGs)

### 1.1 Procedimentos Operacionais Padrão (POPs)
- **POP-001**: Gestão de Documentos e Registros (Revisão a cada 2 anos).
- **POP-009**: Gestão de Compras (Processo de cotação com no mínimo 3 fornecedores/transportadoras).
- **POP-010**: Recebimento e Armazenagem de Produtos (Inspeção com carimbo de aprovação e metodologia PEPS).
- **POP-012**: Gestão de Não Conformidade.
- **POP-016**: Contratação de Consultores.
- **POP-020**: Realização de Assistência Técnica de Equipamentos (REV 02 - Procedimento mestre da assistência).

### 1.2 Registros Internos e Formulários Associados (REGs)
- **REG-001**: Lista Mestra de Controle Interno
- **REG-002**: Lista Mestra de Controle Externo
- **REG-003**: Designação de Autoridade de Representante da Direção para o SGQ
- **REG-009**: Check List de Verificação para Manutenção
- **REG-010**: Pedido de Compra no Sistema ERP
- **REG-016**: Check List das Etapas de Manutenção de Equipamentos (Documento das Etiquetas de Status)
- **REG-017**: Controle de Temperatura e Umidade (Medições diárias: manhã e tarde)
- **REG-018**: Registro de Higienização da Bancada (Semanal, início da semana)
- **REG-020**: Relatório de Não Conformidade e Retrabalho (RNC)
- **REG-022**: Check List de Inspeção de Recebimento de Equipamento
- **REG-024**: Acompanhamento de Ocorrências
- **REG-025**: Gestão de Fornecedores
- **REG-030**: Controle de Verificação da Calibração
- **REG-033**: Check List de Inspeção de Recebimento (Almoxarifado)
- **REG-034**: Check List de Verificação para Limpeza de Equipamentos
- **REG-035**: Check List de Manutenção de Equipamentos (Submódulos OLIDEF e TEB)
- **REG-040**: Controle de Ambiente e Infraestrutura (Teste da Pulseira Antiestática)
- **REG-041**: Avaliação da Consultoria

---

## 2. Tabela Mestra de Etiquetas, Cores e Representação Visual (REG-016)

| Cor da Etiqueta | Nome do Status / Etapa | Código Hex | Status Interno (`os_status`) | Ação Operacional & Regra do ERP |
| :---: | :---: | :---: | :---: | :--- |
| **Violeta** | Equipamento Higienizado | `#8A2BE2` | `HIGIENIZADO` | Aplicada após limpeza com Álcool 70% e registro no **REG-034**. |
| **Transparente/Branca** | Aguardando Análise | `#FFFFFF` | `AGUARDANDO_ANALISE` | Status inicial no **REG-016** aguardando triagem do técnico na bancada. |
| **Cinza** | Análise Completa | `#808080` | `ANALISE_CONCLUIDA` | Diagnóstico concluído, falhas identificadas e lançadas na OS do ERP. |
| **Laranja** | Equipamento em Garantia | `#FFA500` | `EM_GARANTIA` | Equipamento dentro do prazo de garantia (validado via NF de compra). |
| **Amarela** | Aguardando Aprovação do Orçamento | `#FFD700` | `AGUARDANDO_APROVACAO_ORCAMENTO` | Orçamento gerado via tabela de preços do ERP e enviado por e-mail ao cliente. |
| **Marrom** | Enviado à Fábrica | `#8B4513` | `ENVIADO_FABRICA` | Impossibilidade de reparo interno; exige tipo de transporte de devolução. |
| **Azul** | Orçamento Aprovado | `#0000FF` | `ORCAMENTO_APROVADO` | Cliente autorizou o serviço; libera a requisição/separação de peças no **Armazém 1**. |
| **Preta** | Aguardando Peças | `#000000` | `AGUARDANDO_PECAS` | Falta de componente em estoque; dispara pedido para Compras (**POP-009**). |
| **Vermelha** | Orçamento Não Aprovado | `#FF0000` | `ORCAMENTO_RECUSADO` | Cliente recusou o orçamento; envia para Expedição e exige registro no **PSIE/INMETRO**. |
| **Verde** | Serviço Finalizado / CQ Aprovado | `#008000` | `SERVICO_FINALIZADO` | Aprovado no Controle de Qualidade, testes elétricos, funcionais e calibração (**REG-030**). |

---

## 3. Máquina de Estados e Ordem de Precedência do Workflow

1. **Recebimento e Inspeção Inicial (`REG-022`)**
2. **Higienização e Sanitização (`REG-034` - Álcool 70%)** ➔ Etiqueta **Violeta** (`HIGIENIZADO`)
3. **Abertura da OS / Fila de Bancada (`REG-016`)** ➔ Etiqueta **Branca** (`AGUARDANDO_ANALISE`)
4. **Análise Técnica e Diagnóstico (`REG-035`)** ➔ Etiqueta **Cinza** (`ANALISE_CONCLUIDA`)
   - Se Garantia ➔ Etiqueta **Laranja** (`EM_GARANTIA`)
   - Se Reparo Externo ➔ Etiqueta **Marrom** (`ENVIADO_FABRICA`) + seleção de transporte
5. **Emissão e Envio do Orçamento** ➔ Etiqueta **Amarela** (`AGUARDANDO_APROVACAO_ORCAMENTO`)
   - Aprovado ➔ Etiqueta **Azul** (`ORCAMENTO_APROVADO`)
   - Recusado ➔ Etiqueta **Vermelha** (`ORCAMENTO_RECUSADO`)
   - Falta de Peça ➔ Etiqueta **Preta** (`AGUARDANDO_PECAS`)
6. **Controle de Qualidade, Calibração (`REG-030`) e Liberação Final (`REG-016`)** ➔ Etiqueta **Verde** (`SERVICO_FINALIZADO`)
