---
name: vr_extrair_horarios_venda
description: Como extrair horários e picos de vendas de produtos a partir dos cupons fiscais no PDV do sistema VR Soft.
---

# Skill: Extração de Data e Horário de Venda (Mapa de Calor VR Soft)

Esta skill documenta como navegar pelas tabelas do PostgreSQL do sistema VR para descobrir a faixa horária exata de pico de vendas dos produtos. A interface "Consulta de Venda PDV" e a exibição de cupons tiram seus dados deste schema.

## Contexto do Problema
A tabela `venda` do schema `public` contém consolidações, mas não armazena a precisão de cupom a cupom por horário (a coluna de data de emissão ou o número de recibos não detalha horários precisos da passagem no caixa). A informação "secreta" mora nas tabelas exclusivas gerenciadas pelo Módulo de PDV.

## Localização no Banco de Dados (PostgreSQL)

Os dados fidedignos de horário ficam estritamente alocados no schema `pdv`.

- **Schema:** `pdv`
- **Tabela de Cabeçalho do Cupom:** `pdv.venda`
    - Coluna de Data: `data` (Date)
    - Colunas de Horário: `horainicio` e `horatermino` (Time)
    - Situação do Cupom: `cancelado` (Boolean)
- **Tabela de Itens (Produtos):** `pdv.vendaitem`
    - Chave estrangeira ligando ao cupom: `id_venda` (liga com `venda.id`)
    - Identificador do Produto: `id_produto`
    - Quantidades: `quantidade` 

### Exemplo de Query Prática: Mapa de Calor (Agrupando por Hora)

A melhor forma de apurar o ritmo de vendas e sugerir horários de reposição/produção é montando um "Heatmap" (Mapa de Calor). O exemplo abaixo agrupa pelo horário de início da venda nos últimos 30 dias.

```sql
SELECT 
    vi.id_produto,
    p.descricaocompleta,
    EXTRACT(HOUR FROM v.horainicio) AS hora_venda,
    COUNT(*) AS total_cupons_passados,
    SUM(vi.quantidade) AS quantidade_vendida
FROM 
    pdv.venda v
JOIN 
    pdv.vendaitem vi ON v.id = vi.id_venda
JOIN 
    public.produto p ON p.id = vi.id_produto
WHERE 
    v.data >= CURRENT_DATE - INTERVAL '30 days'
    AND v.cancelado = false
GROUP BY 
    vi.id_produto, p.descricaocompleta, EXTRACT(HOUR FROM v.horainicio)
ORDER BY 
    vi.id_produto, hora_venda;
```

## Considerações de Código e Arquitetura

Ao construir rotinas em JS baseadas nisso, considere:

1. **Volume de Dados:** A tabela `pdv.vendaitem` e `pdv.venda` de 30 dias pode ter milhares e até centenas de milhares de registros dependendo das filiais.
2. **Processamento Node.js:** Utilize agregações e cálculos matemáticos pesados diretamente na Query SQL (`SUM()`, `COUNT()`, `EXTRACT()`, `GROUP BY`), e traga ao array JS *apenas os resultados consolidados* por hora. Trazer todos os dados e tentar somar os itens num `.filter()` ou `.reduce()` do JavaScript provocará exaustão de memória da sua extração (Memory Leak).
3. **Casos de Uso:** O resultado desse Heatmap é excelente para módulos de inteligência, como definir prioridade de produção (quem vende mais cedo vs. quem vende mais a tarde) e estimar previsões para "Ruptura de Estoque".
