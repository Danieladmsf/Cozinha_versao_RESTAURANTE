---
name: Ingredient Seeding Skill
description: Ferramenta para abastecimento completo de ingredientes, garantindo integridade de Fornecedores, Marcas, Categorias e Histórico de Preços.
---

# Ingredient Seeding Skill

Esta skill fornece um fluxo robusto para popular o banco de dados com ingredientes complexos, garantindo que todas as dependências (Fornecedores, Marcas, Categorias) sejam criadas ou vinculadas corretamente com todos os campos necessários.

## Estrutura de Dados Completa

Para um cadastro perfeito, o objeto de entrada deve conter:

### 1. Categoria (Category/CategoryTree)
- `name`: Nome da categoria (ex: "Bovinos")
- `parent`: Nome da categoria pai (ex: "Proteínas") - *Opcional, se não existir será criada*
- `type`: "ingredient" ou "embalagem"

### 2. Fornecedor (Supplier)
- `company_name`: Razão Social (Obrigatório)
- `cnpj`: CNPJ formatado (ex: "00.000.000/0000-00")
- `vendor_name`: Nome do vendedor
- `vendor_phone`: Telefone/WhatsApp
- `email`: Email de contato
- `address`: Endereço completo
- `notes`: Observações gerais
- `active`: Status (true/false)

### 3. Marca (Brand)
- `name`: Nome da marca (Obrigatório)
- `manufacturer`: Fabricante (Opcional)
- `preferred`: Se é marca preferencial (true/false)

### 4. Ingrediente (Ingredient)
- `name`: Nome do produto (ex: "Alcatra Peça")
- `unit`: Unidade de medida (kg, un, L)
- `min_stock`: Estoque mínimo
- `current_stock`: Estoque atual
- `current_price`: Preço atual
- `history`: Array de histórico de preços para análise

## Como Usar

1. Prepare um arquivo JSON ou objeto JS com a lista de itens.
2. Execute o script `seed_full_ingredients.js` passando os dados.

## Script de Execução

O script realiza as seguintes operações em ordem:
1. **Verificação de Dependências**: Garante que Categorias (e pais) existam.
2. **Upsert Fornecedor**: Cria ou atualiza o fornecedor buscando por CNPJ ou Nome, preenchendo *todos* os campos.
3. **Upsert Marca**: Cria ou atualiza a marca.
4. **Upsert Ingrediente**: Cria o ingrediente com vínculos (IDs e Nomes denormalizados) para Categoria, Fornecedor e Marca.
5. **Histórico de Preços**: Registra o histórico de preços garantindo datas corretas.
