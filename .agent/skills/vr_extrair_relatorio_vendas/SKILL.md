---
name: "vr_extrair_relatorio_vendas"
description: "Como extrair relatórios consolidados de vendas do sistema VR Soft usando a API (PostgreSQL) e formatar o resultado em texto padronizado incluindo Metas e Venda por Dia/Acumulado."
---

# Extração de Relatório de Vendas (VR Soft PDV)

## Propósito
Sempre que o usuário pedir para gerar, extrair ou rodar o relatório de vendas do VR, você deve usar o script Node.js existente em \`vr_soft_api/extract_vr_report.js\` para se comunicar com o banco PostgreSQL local da VR Soft e trazer as métricas exatas por Mercadológico (Setor).

## Requisitos Iniciais
1. Datar e confirmar o período: Pergunte sempre qual o período fechado (Ex: 01/03 a 24/03) e qual o **último dia contabilizado** (Ex: Venda do dia 24).
2. Confirmar as Metas Mensais: Peça para o usuário confirmar as metas do mês para cada setor. (Ex: Rotisseria R$ 225.000,00).
3. Modificar as variáveis \`DATA_INICIO\`, \`DATA_FIM\` e \`ULTIMO_DIA\` no script antes de rodar, caso sejam diferentes.

## Onde encontrar os scripts
A versão atual do script reside em \`c:\\APP COZINHA\\vr_soft_api\\extract_vr_report.js\`. O script contém embutida a _query_ otimizada que acessa de maneira veloz a estrutura da view agregada **\`venda\`** relacionando à tabela **\`produto\`** pelo ID.

## Mapeamento de Setores (Mercadológico)
O script se baseia nos seguintes identificadores predefinidos:
*   **Rotisseria** = Mercadológico Nível 1: \`17\`
*   **Granel** = Mercadológico Nível 1: \`13\`
*   **Padaria** = Mercadológico Nível 3: \`14.001.001\` (No BD: M1=14, M2=1, M3=1)
*   **FLV Processados** = Mercadológico Nível 3: \`008.003.001\` (No BD: M1=8, M2=3, M3=1)

## Execução
Execute via terminal node:
\`\`\`bash
node "c:\\APP COZINHA\\vr_soft_api\\extract_vr_report.js"
\`\`\`

## Estrutura Padronizada Esperada (Output)
A saída do script informada ao usuário tem um formato fixo estrito (ideal para cópia rápida no WhatsApp / Telegram):

\`\`\`text
MÊS CONTÁBIL 01/03/2026 A 24/03/2026

*Rotisseria..................* R$ 3.829,12
*Venda Acumula...............* R$ 134.008,92
*Venda Meta..................* R$ 225.000,00

*Granel …....................* R$ 995,10
*Venda Acumula...............* R$ 29.368,99
*Meta........................* R$ 43.075,25
...
\`\`\`
Nunca invente tabelas ou sub-listas longas ao apresentar este resultado, ao menos que instruído de modo diverso. Use exatamente as quebras de linha e ponteados demonstrados.
