/**
 * Utilitários unificados de conversão e cálculos matemáticos.
 */

/**
 * Converte um valor para número, tratando strings vazias ou nulas, e formatação com vírgula (R$ ou kg brazuca).
 * @param {string|number} value - O valor a ser convertido.
 * @param {number} defaultValue - Valor padrão caso inválido.
 * @returns {number} O valor numérico com casas decimais.
 */
export function parseQuantity(value, defaultValue = 0) {
    if (typeof value === 'number') return isFinite(value) ? value : defaultValue;
    if (!value || typeof value !== 'string') return defaultValue;

    const cleanedValue = value.trim().replace(',', '.');
    const parsed = parseFloat(cleanedValue);

    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Alias de parseQuantity para facilitar refatoração onde validateNumber era usado.
 */
export const validateNumber = parseQuantity;

/**
 * Formata um peso para exibição. Possui comportamento condicional:
 * - Se unitType === "kg-auto" (padrão de pedidos), mostra 'kg' se >= 1, e 'g' se < 1.
 * - Caso contrário (padrão receitas), formata com 3 casas e adiciona a unidade explícita.
 * 
 * @param {number|string} weightInKg - O peso real (seja string ou number).
 * @param {string} unitType - Tipo de exibição ("kg-auto", "kg", "g").
 * @returns {string} O peso formatado.
 */
export function formatWeightDisplay(weightInKg, unitType = "kg-auto") {
    const weight = parseQuantity(weightInKg);

    if (unitType === "kg-auto") {
        if (weight === 0) return "0 g";
        if (weight >= 1) return `${weight.toFixed(3).replace('.', ',')} kg`;
        return `${(weight * 1000).toFixed(0).replace('.', ',')} g`;
    }

    return `${weight.toFixed(3).replace('.', ',')} ${unitType}`;
}

/**
 * Formata um valor numérico como moeda (R$).
 * @param {number|string} value - Valor monetário.
 * @returns {string} String formatada como moeda brasileira.
 */
export function formatCurrencyDisplay(value) {
    const numericValue = parseQuantity(value);
    const roundedValue = Math.round(numericValue * 100) / 100;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(roundedValue);
}

/**
 * Formata uma porcentagem.
 * @param {number|string} percent - Percentual numérico ou string.
 * @returns {string} String com o símbolo %
 */
export function formatPercentDisplay(percent) {
    const numPercent = parseQuantity(percent);
    return `${numPercent.toFixed(1).replace('.', ',')}%`;
}

/**
 * Soma um array de valores monetários com precisão para evitar floats quebrando.
 * @param {Array<number|string>} values - Array de valores a somar
 * @returns {number} Soma tratada com 2 dígitos
 */
export function sumCurrencyExact(values) {
    const sum = values.reduce((acc, val) => acc + parseQuantity(val), 0);
    return Math.round(sum * 100) / 100;
}
