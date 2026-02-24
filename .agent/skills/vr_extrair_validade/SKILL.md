---
name: vr_extrair_validade
description: Como extrair corretamente a data de validade (Shelf Life / Validade Balança) dos produtos no banco de dados do sistema VR Soft.
---

# Skill: Extração de Data de Validade (VR Soft)

Esta skill documenta o caminho correto para encontrar a data de validade de um produto (frequentemente configurada na aba "Produto Complemento -> Balança" na interface do sistema VR).

## Contexto do Problema
Frequentemente as tabelas principais de produto (como `produto` ou os campos genéricos de vencimento) não contêm os dias exatos de validade com os quais a loja opera os produtos pesáveis ou da rotisseria. No sistema VR, a "Validade Balança" fica armazenada em uma tabela separada.

## Localização no Banco de Dados (PostgreSQL)

- **Tabela Relacional:** `produtocomplemento`
- **Chave Estrangeira:** `id_produto` (que faz join com `produto.id`)
- **Coluna de Validade:** `validade` (Integer representando a quantidade de dias)

### Exemplo de Query SQL

```sql
SELECT 
    p.id as codigo_produto,
    p.descricaocompleta,
    pc.validade as dias_validade_balanca
FROM 
    public.produto p
JOIN 
    public.produtocomplemento pc ON p.id = pc.id_produto
WHERE 
    p.id = 8336; -- Exemplo: Feijoada
```

## Extração via JSON / Integração Local

Se estiver criando um script Node.js na pasta `vr_soft_api` para atualizar os dados do Firebase (por exemplo, sincronizar a propriedade `shelf_life` das receitas com a validade do VR), você pode incluir a extração desta tabela no script `extrair_dados.js`:

```javascript
sendQuery('SELECT id_produto, id_loja, validade FROM produtocomplemento', 'produtocomplemento');
```

E no momento de cruzar o dado com o Firebase:

```javascript
// O campo 'code' do Firebase vem com zeros à esquerda, devemos removê-los
const recipeCodeStr = String(recipeData.code).replace(/^0+/, ''); 

// Encontra todos os registros de complemento para este produto nas diferentes lojas
const comps = complementos.filter(c => String(c.id_produto) === recipeCodeStr);

let validadeBalanca = 0;
if (comps.length > 0) {
    // Caso o cliente possua mais de uma loja, pega a maior validade ou a validade específica da loja desejada
    validadeBalanca = Math.max(...comps.map(c => Number(c.validade) || 0));
}
// validadeBalanca conterá os dias de Shelf Life (Ex: 3, 5, 10 dias)
```

## Resumo Passos de Resolução
1. Ao invés de buscar a validade na tabela `produto`, consulte sempre `produtocomplemento`.
2. O cruzamento é feito através do `codigo` do produto retirando os zeros a esquerda para virar Inteiro.
3. Se houver divergências de lojas, adote a maior validade estipulada via `Math.max()` ou agrupe logicamente.
