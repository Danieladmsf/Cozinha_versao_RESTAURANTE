---
name: Recipe Creation Skill
description: Ferramenta para criação programática de Receitas (Fichas Técnicas) e Produtos com controle detalhado de perdas e categorização correta.
---

# Recipe Creation Skill

Esta skill permite a criação de fichas técnicas para "Receitas - Base" (Ingredientes Compostos) e "Produtos" (Itens de Venda), simulando fielmente o fluxo de cozinha.

---

## 1. Padrão "Chef Profissional" (CRÍTICO)

A partir de agora, todas as receitas devem seguir rigorosamente o padrão de uma cozinha profissional. Não crie receitas simplificadas ou mágicas.

### A. Separação de Etapas (Preparations)
NUNCA misture processos distintos em uma única lista. Se um bolo tem massa e cobertura, são duas preparações diferentes:
```javascript
preparations: [
  { title: "1ª Etapa: Massa do Bolo", processes: ['cooking'], ingredients: [...] },
  { title: "2ª Etapa: Cobertura Ganache", processes: ['cooking'], ingredients: [...] }
]
```

### B. Lista Completa de Ingredientes
Receitas de bolo com 3 ingredientes são inaceitáveis. Inclua:
*   Fermento Químico
*   Sal (pitada)
*   Gordura (Óleo/Manteiga) explicitamente
*   Líquidos (Leite/Água)

### C. Perdas e Rendimentos Realistas
*   **Forno (Cooking Loss):** Bolos e massas perdem entre **10% a 20%** de peso no forno por evaporação.
    *   *Exemplo:* Massa crua de 1.000kg -> Massa assada de 0.850kg.
*   **Limpeza (Cleaning Loss):** Cenouras, frutas e vegetais perdem casca.
    *   *Exemplo:* Cenoura Bruta 0.400kg -> Limpa 0.340kg -> Cozida 0.290kg.

---

## 2. Categorização e Tipos

O sistema diferencia estritamente entre itens de cozinha (bases) e itens de venda (produtos).

### A. Receitas - Base (Cozinha Quente/Fria)
Uso: Molhos, bases, proteínas, guarnições que não são vendidas diretamente.
*   **Campo `type`**: `"receitas"`
*   **Campo `category`**: Sub-categoria de "Receitas - Base" (ex: "Massas", "Carnes").

### B. Produtos (Padaria, Rotisseria, etc.)
Uso: Itens finais de venda.
*   **Campo `type`**: `"receitas_-_base"`
*   **Campo `category`**: Hierarquia obrigatória.
    *   **Padaria:** Pai `Padaria` -> Filho `Confeitária` (com acento).

---

## 3. Preenchimento de Pesos (Cadeia de Perda)

Você deve preencher a evolução do peso do ingrediente:
1.  **`weight_raw`**: Peso de compra (Bruto).
2.  **`weight_clean`**: Pós-limpeza (ex: sem casca).
3.  **`weight_cooked`**: Pós-cocção (ex: assado/reduzido).

**Regra para Secos/Derivados (Farinha, Açúcar, Óleo):**
*   Se não há processo de perda, repita o peso Limpo no Cozido? **NÃO**.
*   Se for BOLO, aplique a perda de evaporação (~15%) proporcionalmente ou concentrada nos líquidos. O peso final da soma dos ingredientes deve bater com o peso real do produto pronto.

---

## 4. Checklist de Qualidade

1.  A receita tem Fermento e Sal?
2.  A massa está separada do recheio/cobertura?
3.  O peso final cozido é menor que o cru (perda de forno)?
4.  O `type` está correto para o setor?
