/**
 * Busca inteligente de Ficha Técnica (Recipe) vinculada a um Produto SKU.
 * 
 * Problema original: O Produto SKU se chama "Rotisseria Tirinha de Carne Chinesa Bendito Kg"
 * mas a Receita se chama simplesmente "Tirinha de Carne Chinesa". Uma busca por nome exato
 * falha e o sistema fica preso nos dados do Produto (sem porção, sem categoria correta).
 * 
 * Estratégia de busca (em ordem de prioridade):
 * 1. Nome exato (case-insensitive)
 * 2. Nome da receita contido no nome do produto (ex: "Tirinha de Carne Chinesa" ⊂ "Rotisseria Tirinha...")
 * 3. Nome do produto contido no nome da receita
 * 4. Palavras-chave significativas em comum (ignora prefixos genéricos como "Rotisseria", "Bendito", "Kg")
 */

// Palavras genéricas que não ajudam a identificar o produto
const NOISE_WORDS = new Set([
  'rotisseria', 'bendito', 'kg', 'un', 'unidade', 'g', 'ml', 'lt',
  'a', 'de', 'do', 'da', 'dos', 'das', 'e', 'com', 'sem', 'por', 'para',
  'o', 'os', 'as', 'em', 'no', 'na', 'nos', 'nas', 'ao', 'aos',
]);

/**
 * Normaliza um nome para comparação, removendo acentos e convertendo para minúsculas.
 */
function normalize(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

/**
 * Extrai palavras significativas de um nome (remove ruído genérico).
 */
function getSignificantWords(name) {
  const normalized = normalize(name);
  return normalized
    .split(/\s+/)
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w));
}

/**
 * Busca a Ficha Técnica correspondente a um Produto SKU.
 * 
 * @param {string} productName - Nome do produto (ex: "Rotisseria Tirinha de Carne Chinesa Bendito Kg")
 * @param {Array} allRecipes - Array completo de receitas e produtos
 * @returns {Object|null} A receita encontrada ou null
 */
export function findLinkedRecipe(productName, allRecipes) {
  if (!productName || !allRecipes || allRecipes.length === 0) return null;

  const normalizedProduct = normalize(productName);
  const recipesOnly = allRecipes.filter(r => r.entityType === 'recipe');

  // 1. Busca por nome exato
  const exactMatch = recipesOnly.find(r => normalize(r.name) === normalizedProduct);
  if (exactMatch) return exactMatch;

  // 2. Nome da receita contido no nome do produto
  // Ex: "tirinha de carne chinesa" está contido em "rotisseria tirinha de carne chinesa bendito kg"
  const containedMatch = recipesOnly.find(r => {
    const normalizedRecipe = normalize(r.name);
    return normalizedRecipe.length >= 5 && normalizedProduct.includes(normalizedRecipe);
  });
  if (containedMatch) return containedMatch;

  // 3. Nome do produto contido no nome da receita
  const reverseMatch = recipesOnly.find(r => {
    const normalizedRecipe = normalize(r.name);
    return normalizedProduct.length >= 5 && normalizedRecipe.includes(normalizedProduct);
  });
  if (reverseMatch) return reverseMatch;

  // 4. Palavras-chave significativas em comum (mínimo 2 palavras coincidentes e >= 60% de match)
  const productWords = getSignificantWords(productName);
  if (productWords.length < 2) return null;

  let bestMatch = null;
  let bestScore = 0;

  recipesOnly.forEach(r => {
    const recipeWords = getSignificantWords(r.name);
    if (recipeWords.length < 2) return;

    const commonWords = recipeWords.filter(w => productWords.includes(w));
    const score = commonWords.length / Math.max(recipeWords.length, 1);

    if (commonWords.length >= 2 && score > bestScore && score >= 0.6) {
      bestScore = score;
      bestMatch = r;
    }
  });

  return bestMatch;
}
