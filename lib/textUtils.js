/**
 * Converte texto para Title Case (primeira letra de cada palavra maiúscula).
 * Funciona com textos em ALL CAPS, lowercase ou mixed case.
 * 
 * Exemplos:
 *   "PATE DE AZEITONA PRETA" → "Pate De Azeitona Preta"
 *   "arroz com feijão" → "Arroz Com Feijão"
 *   "Strogonoff de Carne" → "Strogonoff De Carne"
 * 
 * Palavras pequenas (de, do, da, com, e, em) ficam minúsculas,
 * exceto se forem a primeira palavra.
 */
const SMALL_WORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'ao', 'à', 'os', 'as', 'um', 'uma']);

export function toTitleCase(text) {
  if (!text || typeof text !== 'string') return text || '';

  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (!word) return word;
      // Primeira palavra sempre com maiúscula
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      // Palavras pequenas ficam minúsculas
      if (SMALL_WORDS.has(word)) return word;
      // Demais palavras: primeira letra maiúscula
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Alias para compatibilidade com componentes existentes.
 */
export const formatCapitalize = toTitleCase;

/**
 * Converte texto para slug URL-friendly.
 * "Rotisseria Arroz Branco" → "rotisseria-arroz-branco"
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
