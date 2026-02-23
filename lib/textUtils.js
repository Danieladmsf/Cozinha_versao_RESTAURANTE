/**
 * Formata texto para capitalização correta
 * Converte tudo para minúscula e depois capitaliza cada palavra
 *
 * @param {string} text - Texto para formatar
 * @returns {string} - Texto formatado
 */
export function formatCapitalize(text) {
  if (!text) return text;

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata múltiplos textos para capitalização
 *
 * @param {string[]} texts - Array de textos
 * @returns {string[]} - Array de textos formatados
 */
export function formatCapitalizeMultiple(texts) {
  return texts.map(formatCapitalize);
}

/**
 * Gera um slug a partir de um texto (URL friendly)
 * Ex: "João da Silva" -> "joao-da-silva"
 * 
 * @param {string} text - Texto para converter
 * @returns {string} - Slug gerado
 */
export function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Separa acentos das letras
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '-') // Substitui espaços por hifens
    .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
    .replace(/\-\-+/g, '-') // Substitui múltiplos hifens por um único
    .replace(/^-+/, '') // Remove hifens do início
    .replace(/-+$/, ''); // Remove hifens do fim
}
