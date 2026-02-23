---
name: Recipe Creation Skill
description: Ferramenta para criação programática de Fichas Técnicas com lógica de tempero padronizada por kg de proteína e separação inteligente de etapas por tipo de prato.
---

# Recipe Creation Skill

Esta skill define as regras para criação de fichas técnicas profissionais. Toda receita criada deve seguir rigorosamente esta documentação.

---

## 1. Princípio Fundamental: Fidelidade ao Pedido

**Crie EXATAMENTE o que foi solicitado. Nada mais, nada menos.**

- Se o pedido é "Bife Grelhado" → 1 etapa (proteína + tempero). Não invente acompanhamentos.
- Se o pedido é "Bife Acebolado" → 2 etapas (proteína + tempero | cebola). Porque "acebolado" indica a cebola.
- Se o pedido é "Strogonoff" → 2 etapas (proteína + tempero | molho). Porque strogonoff implica molho.

A separação em etapas vem da **própria definição do prato**, não da imaginação. Leia o nome e a descrição da receita solicitada — tudo que está ali entra, tudo que não está, fica fora.

---

## 1.5. Classificação da Receita (PERGUNTA OBRIGATÓRIA)

Antes de criar qualquer receita, **PERGUNTE ao solicitante**:

> **"Esta receita é uma RECEITA BASE ou a criação de um PRODUTO?"**
> → Se PRODUTO: **"É um produto simples (uma receita) ou composto (várias receitas)?"**

### Tipos de Receita

| Tipo | Descrição | Exemplo |
|------|-----------|--------|
| **Receita Base** | Preparo avulso, usado como componente | Arroz Branco, Feijão Carioca, Farofa Temperada |
| **Produto Simples** | Produto final com UMA receita própria | Macarrão Bolonhesa, Escondidinho de Carne |
| **Produto Composto** | Produto final que IMPORTA várias receitas base | Marmita (arroz + feijão + proteína + guarnição) |

### Diferenças Estruturais

| Aspecto | Receita Base | Produto Simples | Produto Composto |
|---------|-------------|-----------------|------------------|
| `type` | `receitas` | `receitas_-_base` | `receitas_-_base` |
| Etapas próprias | ✅ Preparações inline | ✅ Preparações inline | ❌ Importa receitas base |
| Etapa de Embalagem (D76) | ❌ Não tem | ✅ Obrigatória | ✅ Obrigatória |
| Etapa de Porcionamento | ❌ Não tem | ✅ `sub_components` com `source_id` | ✅ `sub_components` com `origin_id` |
| `portion_weight_calculated` | ❌ Não tem | ✅ Obrigatório | ✅ Obrigatório |
| Processos das etapas | `cooking`, `cleaning`, etc. | `cooking`, `packaging`, `portioning` | `assembly`, `packaging`, `portioning` |

### Fluxo de Decisão

```
Recebe pedido de receita
│
├── PERGUNTE: "É uma RECEITA BASE ou um PRODUTO?"
│
├── RECEITA BASE
│   └── Criar etapas de preparo (inline)
│   └── SEM embalagem, SEM porcionamento
│   └── type: 'receitas'
│
├── PRODUTO → "Simples ou Composto?"
│   │
│   ├── PRODUTO SIMPLES (uma receita)
│   │   └── Criar etapas de preparo (inline)
│   │   └── + Etapa Embalagem (D76)
│   │   └── + Etapa Porcionamento (sub_components com source_id)
│   │   └── type: 'receitas_-_base'
│   │
│   └── PRODUTO COMPOSTO (marmita, combo)
│       └── Importar receitas base existentes (origin_id)
│       └── Cada receita importada = 1 etapa com process 'assembly'
│       └── + Etapa Embalagem (D76)
│       └── + Etapa Porcionamento (sub_components com origin_id)
│       └── type: 'receitas_-_base'
```

---

## 2. Tempero Padrão de Proteínas

Toda proteína (Aves, Bovinos, Suínos, Pescados) recebe tempero base proporcionalmente ao peso cru. A tabela abaixo define a **quantidade por 1 kg de carne crua**:

| Ingrediente      | Quantidade/kg | Observação |
|------------------|--------------|------------|
| Sal Refinado     | 4,21 g       | Reduzir 30% se houver molho salgado |
| Alho Fresco      | 1,62 g       | Pode ser triturado ou pasta |
| Pimenta do Reino | 1,62 g       | Moída na hora, preferencialmente |
| Óleo/Azeite      | 3,24 g       | Para marinar e aderência do tempero |
| Páprica          | 0,81 g       | Doce ou defumada conforme o prato |

### Regras de aplicação:
- O tempero é calculado sobre o `weight_raw` da proteína.
- Se a receita usa 2,5 kg de carne, multiplique cada valor por 2,5.
- Os temperos entram na mesma etapa da proteína.
- Pescados delicados (peixe branco, camarão) podem omitir a páprica e reduzir alho em 50%.

---

## 3. Separação de Etapas

### Regra de ouro: cada COMPONENTE DISTINTO do prato é uma etapa.

Um "componente" é uma parte do prato que tem preparo independente. Identifique os componentes analisando **o nome e a descrição** da receita solicitada.

### Como identificar os componentes:

| O que procurar no pedido | Componentes que surgem |
|--------------------------|----------------------|
| Nome da proteína | → Etapa de Corte/Tempero |
| "ao molho", "strogonoff", "à parmegiana" | → Etapa de Molho |
| "acebolado", "com cebola" | → Etapa de Cebola |
| "empanado", "à milanesa" | → Etapa de Empanamento |
| "gratinado", "com queijo" | → Etapa de Finalização/Montagem |
| Recheio, cobertura (doces) | → Etapa para cada um |

### Exemplos concretos:

**"Bife Grelhado"** → 1 etapa
```
1ª Etapa: Corte e Tempero do Bife [proteína + temperos]
```

**"Bife Acebolado"** → 2 etapas
```
1ª Etapa: Corte e Tempero do Bife [proteína + temperos]
2ª Etapa: Cebola Acebolada [cebola + manteiga]
```

**"Strogonoff de Frango"** → 2 etapas
```
1ª Etapa: Corte e Tempero do Frango [proteína + temperos]
2ª Etapa: Molho Strogonoff [creme de leite, ketchup, mostarda, cogumelos]
```

**"Parmegiana de Frango"** → 3 etapas
```
1ª Etapa: Corte e Tempero do Filé [proteína + temperos]
2ª Etapa: Molho de Tomate [molho, cebola, orégano]
3ª Etapa: Finalização [mussarela, ervilha]
```

**"Arroz Branco"** → 1 etapa
```
1ª Etapa: Cocção do Arroz [arroz, água, alho, óleo, sal]
```

**"Bolo de Chocolate com Cobertura"** → 2 etapas
```
1ª Etapa: Massa do Bolo [farinha, ovos, açúcar, cacau, fermento]
2ª Etapa: Cobertura Ganache [chocolate, creme de leite]
```

### Fluxo de decisão:

```
Leia o nome/descrição da receita
│
├── Tem proteína? → 1ª Etapa: Corte + Tempero (usar tabela/kg)
│
├── O nome indica molho, cebola, empanamento ou outro componente?
│   └── SIM → Criar 1 etapa adicional para CADA componente mencionado
│   └── NÃO → Parar. Não inventar componentes.
│
└── Não tem proteína? (guarnição, doce, base)
    ├── Tem componentes distintos no nome? (massa + cobertura, etc.)
    │   └── SIM → 1 etapa por componente
    └── NÃO → Etapa única
```

---

## 4. Cadeia de Pesos (Controle de Perdas)

Todo ingrediente deve ter a evolução completa do peso:

| Campo | Significado | Exemplo (Cenoura) |
|-------|-------------|-------------------|
| `weight_raw` | Peso bruto de compra | 0,400 kg |
| `weight_clean` | Pós-limpeza (sem casca, aparas) | 0,340 kg |
| `weight_cooked` | Pós-cocção (assado, cozido) | 0,290 kg |

### Perdas típicas por tipo de ingrediente:

| Tipo | Perda Limpeza | Perda Cocção |
|------|--------------|-------------|
| Carne bovina | 5-10% | 20-30% (grelhada/assada) |
| Aves | 10-15% (pele, ossos) | 15-25% |
| Pescados | 30-50% (espinha, cabeça) | 10-15% |
| Vegetais com casca | 10-20% | 10-15% |
| Secos (arroz, feijão) | 0% | Ganho de 150-200% (absorção) |
| Líquidos (água, caldo) | 0% | -50% a -100% (evaporação) |
| Temperos secos (sal, pimenta) | 0% | 0% (incorporam) |
| Gorduras (óleo, azeite) | 0% | 0% (incorporam) |

---

## 5. Categorização

| Tipo | Campo `type` | Uso | Embalagem / Porcionamento |
|------|-------------|-----|---------------------------|
| **Receita Base** | `"receitas"` | Arroz, feijão, molhos, proteínas avulsas | ❌ |
| **Produto Simples** (uma receita) | `"receitas_-_base"` | Macarrão Bolonhesa, Escondidinho | ✅ Obrigatório |
| **Produto Composto** (várias receitas) | `"receitas_-_base"` | Marmita 3 Divisórias, Combos | ✅ Obrigatório |

---

## 5.5. Lógica de IDs e Exportação (CRÍTICO)

A diferença fundamental entre os tipos de receita está em **como os IDs conectam as etapas**.

### IDs Internos (`source_id`)

Usado em **Receitas Base** e **Produtos Simples**. O `source_id` referencia o `id` de uma `preparation` **da mesma receita**.

```javascript
// Etapa de Porcionamento de um PRODUTO SIMPLES
sub_components: [
    {
        id: generateId(),
        source_id: 'abc123',     // ← ID da preparation INTERNA desta receita
        name: 'Macarrão Bolonhesa',
        type: 'recipe',
        assembly_weight_kg: '0.350'
    },
    {
        id: generateId(),
        source_id: 'def456',     // ← ID da etapa de Embalagem desta receita
        name: 'Embalagem',
        type: 'recipe',
        assembly_weight_kg: '1',
        isPackaging: true
    }
]
```

### IDs de Matriz (`origin_id`)

Usado em **Produtos Compostos** (marmitas). O `origin_id` referencia o `id` do **documento Firebase** da receita base importada. Etapas com `origin_id` são **somente leitura** (Matriz).

```javascript
// Etapa de um PRODUTO COMPOSTO (Marmita)
{
    id: generateId(),
    title: '1º Etapa: Arroz Branco',
    processes: ['assembly'],          // ← Processo de montagem
    origin_id: 'FIREBASE_ID_ARROZ',   // ← ID do documento Recipe no Firestore
    ingredients: [...],               // Importados da receita base (locked: true)
}

// Porcionamento do PRODUTO COMPOSTO
sub_components: [
    {
        id: generateId(),
        origin_id: 'FIREBASE_ID_ARROZ',  // ← Referencia o doc Firebase
        name: 'Arroz Branco',
        type: 'recipe',
        assembly_weight_kg: '0.160'
    },
    {
        id: generateId(),
        origin_id: 'FIREBASE_ID_FEIJAO', // ← Outro doc Firebase
        name: 'Feijão Carioca',
        type: 'recipe',
        assembly_weight_kg: '0.100'
    }
]
```

### Resumo Visual

```
PRODUTO SIMPLES:            PRODUTO COMPOSTO:
┌─────────────────┐         ┌────────────────────┐
│ Preparation A   │         │ Preparation A      │
│   id: 'abc123'  │         │   id: 'xyz789'     │
│   (etapa inline)│         │   origin_id: 'FB1' │ ← Receita importada
└────────┬────────┘         │   (SOMENTE LEITURA)│
         │                  └────────┬───────────┘
         │ source_id                 │ origin_id
         ▼                           ▼
┌─────────────────┐         ┌────────────────────┐
│ Porcionamento   │         │ Porcionamento      │
│ sub_components: │         │ sub_components:    │
│  source_id:     │         │  origin_id:        │
│   'abc123'      │         │   'FB1' (Firestore)│
└─────────────────┘         └────────────────────┘
```

---

## 6. Notas da Etapa (`notes[]`)

Cada etapa deve conter notas operacionais:

| Nota | Obrigatório | Conteúdo |
|------|-------------|----------|
| Modo de Preparo Detalhado | ✅ Sempre | Passo a passo numerado |
| Pontos Críticos de Controle (PCC) | ✅ Sempre | Temperaturas, contaminação cruzada |
| Armazenamento e Validade | ✅ Sempre | Tempo/temp refrigeração e congelamento |
| Dicas do Chef | Opcional | Variações, truques, substituições |

---

## 7. Checklist de Qualidade

Antes de finalizar qualquer receita, verificar:

### Geral (Todos os tipos)
- [ ] **Classificação perguntada?** (Receita Base / Produto Simples / Produto Composto)
- [ ] `type` está correto? (`receitas` para base, `receitas_-_base` para produto)
- [ ] `category` está correto?
- [ ] Proteína tem tempero padrão aplicado (tabela/kg)?
- [ ] Etapas correspondem APENAS ao que foi pedido?
- [ ] Nenhum componente foi inventado além do solicitado?
- [ ] Cadeia de peso está coerente (raw → clean → cooked)?
- [ ] Notas de modo de preparo e PCC estão preenchidas?
- [ ] Cada etapa tem `id` único gerado?

### Somente Produtos (Simples e Compostos)
- [ ] Etapa de Embalagem (D76) está presente?
- [ ] Etapa de Porcionamento está presente com `sub_components` linkados?
- [ ] Campo `portion_weight_calculated` está preenchido na receita?
- [ ] IDs corretos? (`source_id` para simples, `origin_id` para composto)

### Somente Produto Composto (Marmitas)
- [ ] Todas as receitas base existem no sistema?
- [ ] Etapas importadas usam `processes: ['assembly']`?
- [ ] `origin_id` aponta para o ID do documento Firebase da receita base?

---

## 8. Embalagem e Porcionamento (OBRIGATÓRIO)

Toda receita de **produto** (`type: 'produtos'`) deve obrigatoriamente terminar com duas etapas finais:

### 8.1. Etapa de Embalagem

Usa o ingrediente **D76** (embalagem padrão). Sempre a penúltima etapa.

```javascript
{
    id: generateId(), // OBRIGATÓRIO: ID único
    title: `${N}ª Etapa: Embalagem`,
    processes: ['packaging'],
    ingredients: [{
        ingredient_id: 'H7tG7zLisi87NqrytfJh', // ID do D76 no Firestore
        name: 'D76',
        unit: 'un',
        quantity: 1,
        current_price: 1.95,
        weight_raw: "0",
        locked: true
    }],
    assembly_config: {
        container_type: 'unidade',
        total_weight: '0',
        units_quantity: '1'
    }
}
```

### 8.2. Etapa de Porcionamento

Sempre a **última** etapa. Usa `processes: ['portioning']` e o array **`sub_components`** que referencia todas as etapas anteriores pelo `source_id`.

```javascript
{
    id: generateId(),
    title: `${N}ª Etapa: Porcionamento`,
    processes: ['portioning'],
    ingredients: [],
    sub_components: [
        // Um item para CADA etapa anterior (incluindo Embalagem)
        {
            id: generateId(),
            source_id: 'ID_DA_ETAPA_ARROZ',      // <-- referencia prep.id
            assembly_weight_kg: '0.160',           // Peso POR PORÇÃO em kg
            type: 'recipe',
            name: 'Arroz Branco'
        },
        {
            id: generateId(),
            source_id: 'ID_DA_ETAPA_EMBALAGEM',
            assembly_weight_kg: '1',               // 1 unidade
            type: 'recipe',
            name: 'Embalagem',
            isPackaging: true                      // Flag auxiliar
        }
    ],
    notes: [{
        title: "Instrução",
        content: "Porcionar conforme peso padrão registrado."
    }],
    assembly_config: {
        container_type: 'unidade',
        total_weight: '0',
        units_quantity: '1'
    }
}
```

### 8.3. Geração de IDs (CRÍTICO)

Toda etapa (`preparation`) **DEVE** ter um `id` único. Sem ele, a UI não consegue exibir a tabela "Componentes de Montagem". Use:

```javascript
const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
```

### 8.4. Regra dos `sub_components`

O array `sub_components` na etapa de Porcionamento é **obrigatório** para a UI funcionar. Cada item deve ter:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `id` | ID único do link | `generateId()` |
| `source_id` | ID da etapa de origem (referencia `prep.id`) | `'abc123xyz'` |
| `assembly_weight_kg` | Peso por porção em kg (string) | `'0.160'` |
| `type` | Sempre `'recipe'` | `'recipe'` |
| `name` | Nome limpo da etapa (sem prefixo "Nª Etapa:") | `'Arroz Branco'` |
| `isPackaging` | `true` apenas para a Embalagem | `true` / omitir |

---

## 9. Receitas de Refeição (Combos / Marmitas)

Receitas da categoria `MARMITA 3 DIVISORIAS` seguem uma estrutura fixa de componentes com pesos padronizados por porção:

### 9.1. Pesos Padrão por Porção

| Componente | Peso (kg) | Peso (g) |
|------------|-----------|----------|
| Arroz | 0.160 | 160g |
| Farofa | 0.020 | 20g |
| Feijão | 0.100 | 100g |
| Guarnição (Purê, Legumes, etc.) | 0.120 | 120g |
| Proteína (Carne, Frango, etc.) | 0.165 | 165g |
| Macarrão | 0.160 | 160g |
| Embalagem | 1 | 1 un |

### 9.2. Estrutura Completa (Exemplo: Strogonoff)

```
1ª Etapa: Arroz Branco      → processes: ['assembly'], weight: 0.160
2ª Etapa: Farofa Temperada   → processes: ['assembly'], weight: 0.020
3ª Etapa: Purê de Batata     → processes: ['assembly'], weight: 0.120
4ª Etapa: Strogonoff de Carne → processes: ['assembly'], weight: 0.165
5ª Etapa: Embalagem          → processes: ['packaging'], D76
6ª Etapa: Porcionamento      → processes: ['portioning'], sub_components: [1,2,3,4,5]
```

### 9.3. Classificação Automática de Componentes

Para detectar automaticamente o tipo (e peso) de cada componente pelo nome:

```javascript
const COMPONENT_KEYWORDS = {
    'ARROZ':     ['ARROZ'],
    'FEIJAO':    ['FEIJAO', 'FEIJÃO', 'FEIJOADA'],
    'FAROFA':    ['FAROFA'],
    'MACARRAO':  ['MACARRAO', 'MACARRÃO', 'ESPAGUETE', 'PENNE', 'FUSILLI', 'MACARRONADA'],
    'PROTEÍNA':  ['CARNE', 'FRANGO', 'PEIXE', 'LINGUICA', 'BIFE', 'SOBRECOXA',
                  'STROGONOFF', 'FILÉ', 'FILE', 'ISCA', 'TIRINHA', 'PICADINHO',
                  'PERNIL', 'LOMBO', 'COSTELA', 'CUPIM', 'KAFTA', 'QUIBE',
                  'HAMBURGUER', 'MEDALHAO', 'LAGARTO', 'CHARUTO', 'ESCONDIDINHO',
                  'PARMEGIANA', 'MILANESA', 'ACEBOLAD'],
    'GUARNIÇÃO': ['PURE', 'PURÊ', 'LEGUMES', 'SALADA', 'BATATA', 'MANDIOCA',
                  'POLENTA', 'ANGU', 'CREME DE MILHO', 'ABOBRINHA', 'COUVE',
                  'ERVILHA', 'VAGEM', 'CENOURA', 'BATATONESE']
};
```

---

## 10. Campo `portion_weight_calculated`

Toda receita de **produto** deve ter o campo `portion_weight_calculated` (float, em kg) preenchido no documento raiz do Firestore. Este campo é usado pela tela de **Programação de Produção** para calcular o número de embalagens:

```
Fórmula: numPackages = Math.ceil(quantidadePedidaKG / portion_weight_calculated)
Display: "10 emb (120g)"
```

| Categoria | Peso típico |
|-----------|-------------|
| MONO ARROZ | 0.120 kg |
| MONO FEIJÃO | 0.180 kg |
| MONO GUARNIÇÃO | 0.128 kg |
| MONO PROTEINAS | 0.150 - 0.350 kg |
| MASSAS / MACARRÃO | 0.350 - 0.467 kg |
| SALADAS COZIDAS | 0.350 kg |
| PATES / MOLHOS | 0.120 - 0.150 kg |
| MARMITA 3 DIVISORIAS | 0.445 - 0.465 kg |

Se o campo não estiver preenchido, use a **média da categoria** como fallback.

