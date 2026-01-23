/**
 * Utilitários centralizados para busca com ordenação por relevância
 * Usado em todas as barras de pesquisa do sistema
 */

/**
 * Remove acentos de uma string para comparação
 */
export function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtra e ordena itens por relevância baseado na posição do termo buscado
 * @param {Array} items - Array de itens para filtrar
 * @param {string} searchTerm - Termo de busca
 * @param {string} fieldName - Nome do campo para buscar (ex: 'name')
 * @returns {Array} - Itens filtrados e ordenados por relevância
 */
export function filterAndSortByRelevance(items, searchTerm, fieldName = 'name') {
    if (!searchTerm || !items || items.length === 0) {
        return items;
    }

    const term = removeAccents(searchTerm.toLowerCase());

    // Filtrar apenas itens que contêm o termo no campo especificado
    const filtered = items.filter(item => {
        const fieldValue = removeAccents((item[fieldName] || '').toLowerCase());
        return fieldValue.includes(term);
    });

    // Ordenar por posição do match (mais próximo do início = primeiro)
    filtered.sort((a, b) => {
        const valueA = removeAccents((a[fieldName] || '').toLowerCase());
        const valueB = removeAccents((b[fieldName] || '').toLowerCase());

        const posA = valueA.indexOf(term);
        const posB = valueB.indexOf(term);

        return posA - posB;
    });

    return filtered;
}

/**
 * Componente React para destacar o termo buscado em azul
 * @param {string} text - Texto completo
 * @param {string} searchTerm - Termo para destacar
 * @returns {JSX.Element} - Texto com o termo destacado
 */
export function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;

    const term = searchTerm.trim().toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(term);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + term.length);
    const after = text.slice(index + term.length);

    return { before, match, after, hasMatch: true };
}
