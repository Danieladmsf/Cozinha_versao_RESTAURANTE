---
name: receivers_em_massa
description: "Padrão consolidado para criação de receitas e refeições em lote, garantindo a mesma estrutura do frontend sem criar campos fantasmas."
---

# Como criar Receitas e Refeições em Massa no Cozinha Restaurante

Esta skill contém os scripts padronizados e consolidados para inserção de receitas diretamente no banco de dados Firestore. 
Ela resolve os problemas de herança da "Receita Matriz" (origin_id), recálculo de escala (scaleIngredients) e campos fantasmas.

## ⚠️ Regras de Ouro
1. **Nunca crie campos fantasmas:** Os dados no banco DEVEM ter exatamente os campos que a UI usa.
2. **Ingredientes Simples (Matriz):** Devem possuir os 18 campos (`id`, `ingredient_id`, `name`, `unit`, `quantity`, `current_price`, `weight_raw`, `weight_clean`, `weight_cooked`, `weight_frozen`, `weight_thawed`, `weight_pre_cooking`, `weight_portioned`, `yield_weight`, `cost_raw`, `cost_clean`, `cost_cooked`, `locked`).
3. **Refeições (Montagem/Assembly):** 
   - A Etapa principal da refeição importa uma "Receita Matriz".
   - Ela usa `origin_id = ID_DA_MATRIZ`.
   - O array `ingredients` DEVE trazer os ingredientes da matriz **já escalados** pelo fator do peso desejado na cuba (`Assembly Weight / Total Yield`).
   - Todos os ingredientes importados da matriz recebem `locked: true`.
   - Etapa de porcionamento (assembly/portioning) usa `sub_components` referenciando as IDs das etapas criadas.

---

## Script Base Consolidado (`scripts/create-bulk-recipes.mjs`)

Use este script como base para criar novas receitas. Ele possui os helpers corretos para:
- `ing()`: Gera a estrutura perfeita de um ingrediente simples.
- `noteRow()`: Gera a estrutura de uma linha de instrução/texto na tabela de ingredientes.
- `importStage()`: Importa uma Receita Matriz como uma etapa (scaling perfeito).

Veja o arquivo anexo no diretório da skill: `scripts/create-bulk-recipes.mjs`.
