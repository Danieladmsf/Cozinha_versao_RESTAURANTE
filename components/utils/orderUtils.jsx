// CONTEÚDO DO ARQUIVO utils/orderUtils.js (criado anteriormente)
// Funções utilitárias para manipulação de dados de pedidos

import {
  parseQuantity as mathParseQuantity,
  formatCurrencyDisplay,
  sumCurrencyExact,
  formatWeightDisplay
} from '@/lib/mathUtils';

/**
 * Re-exporta parseQuantity para manter compatibilidade
 */
export const parseQuantity = mathParseQuantity;

/**
 * Formata uma quantidade numérica para exibição, usando vírgula para decimal.
 * @param {string|number} quantity - A quantidade a ser formatada.
 * @returns {string} A quantidade formatada, ou string vazia se inválido.
 */
export function formattedQuantity(quantity) {
  if (quantity === null || quantity === undefined || quantity === "") return "";
  const numValue = parseQuantity(String(quantity)); // Usa parseQuantity para garantir que é um número
  if (isNaN(numValue)) return "";

  // Se for um inteiro, retorna como string de inteiro
  if (Number.isInteger(numValue)) return String(numValue);

  // Padronizar para 3 casas decimais (atende solicitação de precisão e falta do zero)
  return numValue.toFixed(3).replace('.', ',');
}

/**
 * Normaliza a estrutura do array de itens de um pedido.
 * Pode lidar com itens que são strings JSON.
 * @param {Array|string} items - O array de itens ou string JSON.
 * @returns {Array} O array de itens normalizado, ou um array vazio em caso de erro.
 */
export function normalizeOrderItems(items) {
  if (!items) return [];

  try {
    if (Array.isArray(items)) return items;

    if (typeof items === 'string') {
      // Tenta limpar JSONs que podem estar mal formatados (ex: aspas triplas)
      const cleanJson = items
        .replace(/"{3,}/g, '"') // Remove aspas triplas ou mais
        .replace(/\\"/g, '"')  // Escapa aspas internas se necessário
        .replace(/^"/, '')     // Remove aspa no início se for string JSON encapsulada
        .replace(/"$/, '');    // Remove aspa no final

      return JSON.parse(cleanJson);
    }

    return []; // Retorna array vazio se não for nem array nem string
  } catch (error) {
    return []; // Retorna array vazio em caso de erro de parsing
  }
}

/**
 * Formata um valor numérico como moeda BRL.
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
export function formatCurrency(value) {
  return formatCurrencyDisplay(value);
}

/**
 * Soma valores monetários com precisão, evitando erros de ponto flutuante
 * @param {Array<number>} values - Array de valores para somar
 * @returns {number} Soma precisa arredondada para 2 casas decimais
 */
export function sumCurrency(values) {
  return sumCurrencyExact(values);
}

/**
 * Formata um peso em kg para exibição (g ou kg).
 * @param {number} weightInKg - O peso em quilogramas.
 * @returns {string} O peso formatado.
 */
export function formatWeight(weightInKg) {
  return formatWeightDisplay(weightInKg, "kg-auto");
}

/**
 * Calcula o peso total de um item de pedido (ex: receita) com base na quantidade e tipo de unidade.
 * @param {object} item - O item do pedido (precisa de quantity, unit_type).
 * @param {object} recipe - A receita correspondente (precisa de cuba_weight se unit_type for 'cuba').
 * @returns {number} O peso total em kg.
 */
export function calculateItemTotalWeight(item, recipe) {
  if (!item || !recipe) return 0;

  const quantity = parseQuantity(item.quantity);

  if (item.unit_type === 'cuba' || item.unit_type === 'cuba-g') {
    // Prioriza cuba_weight, mas usa total_weight como fallback
    const cubaWeightKg = parseQuantity(recipe.cuba_weight || recipe.total_weight);
    const result = cubaWeightKg * quantity;

    return result;
  } else if (item.unit_type === 'kg') {
    return quantity;
  } else if (item.unit_type === 'unid') {
    const unitWeightKg = parseQuantity(recipe.unit_weight || 0);
    return unitWeightKg * quantity;
  }

  return 0;
}