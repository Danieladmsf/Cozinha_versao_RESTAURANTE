---
name: pop_creation
description: Skill para auxiliar na criação e preenchimento padronizado de POPs (Procedimentos Operacionais Padrão) mantendo identidade visual e formatação consistente.
---

# POP Creation Skill

Esta skill auxilia na criação de novos POPs (Procedimentos Operacionais Padrão) seguindo o padrão de formatação estabelecido pelo sistema Cozinha Afeto.

## Estrutura de um POP

Cada POP deve conter os seguintes campos:

### 1. Informações Básicas
- **nome**: Nome da ferramenta/procedimento em MAIÚSCULAS
- **codigo**: Código único (ex: `EPI0001`, `FER0001`, `COR0001`)
- **descricao**: Texto descritivo explicando o propósito

### 2. Dados Técnicos (especificacoes)
Especificações técnicas do item/procedimento:
```html
<p><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</p>
<p><strong>Dimensões Padrão:</strong> 5-7 cm (comprimento) × 1-1,5 cm (largura)</p>
<p><strong>Material:</strong> Aço inoxidável AISI 304</p>
```

### 3. EPIs Necessários (materiais)
Use códigos de referência para rastreabilidade:
```html
<p><strong>[EPI001]</strong> Luva de Malha de Aço — <strong>OBRIGATÓRIO</strong> na mão que segura a carne</p>
<p><strong>[EPI002]</strong> Avental Impermeável — PVC ou descartável</p>
<p><strong>[EPI003]</strong> Touca Descartável — cobrindo todo o cabelo</p>
<p><strong>[EPI004]</strong> Calçado Antiderrapante — bota de borracha ou sapato fechado</p>
<p><strong>[RECOMENDADO]</strong> Máscara Descartável — quando necessário</p>
```

**Padrão de códigos EPI:**
- `[EPI001]` a `[EPI999]` - Equipamentos de Proteção Individual
- `[OBRIGATÓRIO]` - Item obrigatório
- `[RECOMENDADO]` - Item recomendado mas não obrigatório

### 4. Manutenção (manutencao)
Procedimentos de limpeza e manutenção:
```html
<p><strong>[FER006]</strong> Escova de Cerdas Duras — para limpeza entre as malhas</p>
<p><strong>[FER007]</strong> Detergente Neutro — para remoção de gordura</p>
<p><strong>[FER008]</strong> Solução Sanitizante — quaternário de amônio 200ppm</p>

<p><strong>Procedimento de Higienização:</strong></p>
<p>1. Enxaguar em água corrente</p>
<p>2. Escovar com detergente neutro</p>
<p>3. Enxaguar abundantemente</p>
<p>4. Imergir em solução sanitizante por 2 min</p>
<p>5. Secar pendurada em local ventilado</p>
```

**Padrão de códigos FER:**
- `[FER001]` a `[FER999]` - Ferramentas e utensílios

### 5. Precauções de Segurança (precaucoes)
Alertas e avisos importantes:
```html
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Sempre cortar em direção oposta ao corpo</p>
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Usar luva de malha de aço na mão de apoio</p>
<p><strong>[ATENÇÃO]</strong> Manter a faca sempre afiada — facas cegas causam mais acidentes</p>
<p><strong>[ATENÇÃO]</strong> Não deixar a faca na pia coberta por outros utensílios</p>
<p>Nunca tentar aparar uma faca caindo — afaste-se</p>
```

**Níveis de alerta:**
- `[CRÍTICO]` - Risco grave de acidente (cor vermelha)
- `[ATENÇÃO]` - Alerta importante
- Texto simples - Recomendação geral

## Padrão de Códigos

| Prefixo | Categoria | Exemplo |
|---------|-----------|---------|
| EPI | Equipamento de Proteção Individual | EPI0001 |
| FER | Ferramenta/Utensílio | FER0001 |
| COR | Procedimento de Corte | COR0001 |
| PRE | Preparação | PRE0001 |
| HIG | Higienização | HIG0001 |

## Exemplo Completo de POP

```javascript
const novoPOP = {
    nome: "LUVA DE MALHA DE AÇO",
    codigo: "EPI0001",
    descricao: "Equipamento de proteção individual obrigatório para manipulação de facas e objetos cortantes. Protege contra cortes acidentais durante o preparo de alimentos.",
    imageUrl: "URL_DA_IMAGEM",
    
    especificacoes: `
        <p><strong>Material:</strong> Malha de aço inoxidável AISI 304</p>
        <p><strong>Resistência:</strong> Nível 5 (EN 388) - máxima proteção contra corte</p>
        <p><strong>Tamanhos Disponíveis:</strong> P, M, G, GG</p>
        <p><strong>Mão de Uso:</strong> Sempre na mão que segura o alimento</p>
        <p><strong>Peso Médio:</strong> 150-200g por unidade</p>
    `,
    
    materiais: `
        <p><strong>[OBRIGATÓRIO]</strong> Corte de carnes (bovinas, suínas, aves, peixes)</p>
        <p><strong>[OBRIGATÓRIO]</strong> Desossa de peças de carne</p>
        <p><strong>[OBRIGATÓRIO]</strong> Fatiamento em máquina de frios</p>
        <p><strong>[RECOMENDADO]</strong> Corte de vegetais duros (abóbora, mandioca)</p>
    `,
    
    manutencao: `
        <p><strong>[FER006]</strong> Escova de Cerdas Duras — para limpeza entre as malhas</p>
        <p><strong>[FER007]</strong> Detergente Neutro — para remoção de gordura</p>
        <p><strong>Procedimento de Higienização:</strong></p>
        <p>1. Enxaguar em água corrente</p>
        <p>2. Escovar com detergente neutro</p>
        <p>3. Imergir em solução sanitizante por 2 min</p>
        <p>4. Secar pendurada em local ventilado</p>
    `,
    
    precaucoes: `
        <p><strong style="color: #dc2626;">[CRÍTICO]</strong> Verificar integridade antes de cada uso</p>
        <p><strong style="color: #dc2626;">[CRÍTICO]</strong> Substituir imediatamente se houver malhas rompidas</p>
        <p><strong>[ATENÇÃO]</strong> Não usar luva molhada — reduz aderência</p>
        <p><strong>[ATENÇÃO]</strong> Guardar em local seco e ventilado</p>
    `,
    
    passos: [
        { description: "Inspecionar a luva verificando malhas rompidas", imageUrl: "" },
        { description: "Vestir na mão que segura o alimento (não a que usa a faca)", imageUrl: "" },
        { description: "Ajustar o punho para evitar entrada de resíduos", imageUrl: "" }
    ]
};
```

## Dicas de Formatação

1. **Sempre use `<p>` para parágrafos** - Garante espaçamento correto no PDF
2. **Use `<strong>` para destaques** - Títulos de campos e alertas
3. **Cores para críticos**: `style="color: #dc2626;"` (vermelho)
4. **Códigos entre colchetes**: `[EPI001]`, `[FER001]`, `[CRÍTICO]`
5. **Travessão para descrições**: `—` (alt+0151) para separar código da descrição
