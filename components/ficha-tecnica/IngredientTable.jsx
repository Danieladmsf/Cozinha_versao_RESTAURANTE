import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, CookingPot, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssemblySubComponents from './AssemblySubComponents';
import IngredientRow from './optimized/IngredientRow';
import RecipeRow from './optimized/RecipeRow';
import { processTypes } from '@/lib/recipeConstants';

const IngredientTable = ({
  prep,
  prepIndex,
  onOpenIngredientModal,
  onOpenRecipeModal,
  onOpenAddAssemblyItemModal,
  onUpdatePreparation,
  isProduct = false, // New prop
  ...rest
}) => {
  const processes = prep.processes || [];
  const hasProcess = (processName) => processes.includes(processName);
  const ingredients = prep.ingredients || [];
  const recipes = prep.recipes || []; // Array de receitas adicionadas

  const isAssemblyOnly = hasProcess('assembly') &&
    !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking');

  const isPortioningOnly = hasProcess('portioning') &&
    !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && !hasProcess('assembly');

  if (isAssemblyOnly || isPortioningOnly) {
    return (
      <div className="space-y-4">


        {/* 2. Tabela de Componentes com Configuração no Rodapé */}
        <AssemblySubComponents
          subComponents={prep.sub_components || []}
          onUpdateSubComponents={(components) => {
            onUpdatePreparation(prepIndex, 'sub_components', components);
          }}
          preparationsData={rest.preparations}
          assemblyConfig={prep.assembly_config || {}}
          onAssemblyConfigChange={(field, value) => {
            const newConfig = { ...prep.assembly_config, [field]: value };
            onUpdatePreparation(prepIndex, 'assembly_config', newConfig);
          }}
          totalYieldWeight={prep.total_yield_weight_prep || 0}
          onRemoveSubComponent={(index) => {
            const newSubComponents = [...prep.sub_components];
            newSubComponents.splice(index, 1);
            onUpdatePreparation(prepIndex, 'sub_components', newSubComponents);
          }}
          showAssemblyConfig={!isProduct}
          showComponentsTable={true}
          onAddComponent={() => onOpenAddAssemblyItemModal(prepIndex)}
          addComponentLabel={isAssemblyOnly ? 'Adicionar Preparo/Receita' : 'Adicionar Produto'}
          addComponentClassName={isAssemblyOnly ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}
          isProduct={isProduct}
        />

      </div>
    );
  }

  const processColors = {
    'defrosting': { bg: 'bg-blue-50/50', text: 'text-blue-600' },
    'cleaning': { bg: 'bg-green-50/50', text: 'text-green-600' },
    'cooking': { bg: 'bg-orange-50/50', text: 'text-orange-600' },
    'portioning': { bg: 'bg-teal-50/50', text: 'text-teal-600' }
  };

  const orderedActiveProcesses = ['defrosting', 'cleaning', 'cooking', 'portioning']
    .filter(p => hasProcess(p));

  // Verificar se é apenas processo de receita
  const isRecipeOnly = hasProcess('recipe') &&
    !hasProcess('defrosting') &&
    !hasProcess('cleaning') &&
    !hasProcess('cooking') &&
    !hasProcess('portioning');

  // isReadOnly: Se a prop readOnly (da matriz) for true, ou se for isRecipeOnly
  // No caso de RecipeOnly, já limitamos, mas se for matriz, forçamos tudo.
  const isReadOnly = rest.readOnly;

  if (ingredients.length === 0 && recipes.length === 0 && prep.sub_components?.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500 mb-3">
          {isRecipeOnly ? 'Nenhuma receita adicionada ainda' : 'Nenhum ingrediente ou receita adicionado ainda'}
        </p>
        {/* HIDE BUTTONS IF READ ONLY */}
        {/* HIDE BUTTONS IF READ ONLY OR USER REQUESTED HIDDEN INITIAL STATE
            O usuário solicitou remover estes botões pois o modal abre automaticamente.
         */}
        {/*
        {!isReadOnly && !isRecipeOnly && (!isProduct || hasProcess('defrosting') || hasProcess('cleaning') || hasProcess('cooking') || hasProcess('packaging')) && (
          <div className="flex gap-2 justify-center">
            {hasProcess('packaging') ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenIngredientModal(prepIndex)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Adicionar Embalagem
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenIngredientModal(prepIndex)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenRecipeModal(prepIndex)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <CookingPot className="h-4 w-4 mr-2" />
                  Adicionar Receita
                </Button>
              </>
            )}
          </div>
        )}

        {!isReadOnly && isRecipeOnly && (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenRecipeModal(prepIndex)}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <CookingPot className="h-4 w-4 mr-2" />
              Selecionar Receita
            </Button>
          </div>
        )}
        */}
      </div>
    );
  }

  // 1. Agrupar ingredientes por seções (baseado nos "Headers")
  const sections = [];
  let currentSection = { header: null, items: [] };

  ingredients.forEach((ing, index) => {
    if (ing.is_header) {
      if (currentSection.header || currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { header: ing, items: [] };
    } else {
      currentSection.items.push({ data: ing, originalIndex: index });
    }
  });

  // Adicionar sobras à última seção ou criar nova se vazio
  if (currentSection.header || currentSection.items.length > 0 || (sections.length === 0 && ingredients.length === 0)) {
    if (sections.length === 0 && ingredients.length === 0) {
      // Se realmente vazio, e sem receitas, o Empty State lá em cima já cuidou. 
      // Se tem receitas, vamos criar uma seção dummy.
      sections.push(currentSection);
    } else {
      sections.push(currentSection);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER ACTIONS - Hide if Read Only */}
      {!isReadOnly && !isRecipeOnly && (!isProduct || hasProcess('defrosting') || hasProcess('cleaning') || hasProcess('cooking') || hasProcess('packaging')) && (
        <div className="flex gap-3 justify-start">
          {hasProcess('packaging') ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenIngredientModal(prepIndex)}
              className="border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all duration-200"
            >
              <Package className="h-4 w-4 mr-2" />
              Adicionar Embalagem
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenIngredientModal(prepIndex)}
              className="border-dashed hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200 text-sm">
          <span>🔒</span>
          <span>Esta etapa faz parte de uma Receita Matriz e não pode ser editada aqui.</span>
        </div>
      )}

      {sections.map((section, idx) => (
        <div key={`section-${prepIndex}-${idx}`} className="space-y-0">
          {/* HEADER DA SEÇÃO */}
          {section.header && (
            <div
              className={`
                w-full px-4 py-2 rounded-t-md flex items-center gap-2 border-x border-t mt-4
                ${(section.header.header_theme === 'orange')
                  ? 'bg-orange-100 border-orange-200 text-orange-900'
                  : 'bg-green-100 border-green-200 text-green-900'}
              `}
            >
              {/* Diamante */}
              <div className="rotate-45 w-2 h-2 bg-current opacity-60 ml-1 mr-2"></div>
              <span className="font-bold uppercase tracking-wide text-sm">
                {section.header.name}
              </span>
            </div>
          )}

          {/* TABELA DA SEÇÃO */}
          <div className={`
             overflow-hidden shadow-sm bg-white
             ${section.header ? 'rounded-b-md border-x border-b border-gray-200' : 'rounded-xl border border-gray-200'}
          `}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan="3" className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center border-b">
                    Dados Ingrediente
                  </TableHead>
                  {isRecipeOnly ? (
                    <TableHead colSpan="1" className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center border-b">
                      Dados da Receita
                    </TableHead>
                  ) : (
                    orderedActiveProcesses.map(processId => {
                      const processInfo = processTypes[processId];
                      const colors = processColors[processId] || { bg: 'bg-gray-50/50', text: 'text-gray-600' };
                      let colSpan = 2;

                      if (processId === 'defrosting') {
                        colSpan = 3;
                      } else if (processId === 'cleaning') {
                        colSpan = hasProcess('defrosting') ? 3 : 3;
                      } else if (processId === 'cooking') {
                        colSpan = 3;
                      } else if (processId === 'portioning') {
                        if (!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) {
                          colSpan = 3;
                        } else {
                          colSpan = 2;
                        }
                      }

                      return (
                        <TableHead
                          key={processId}
                          colSpan={colSpan}
                          className={`px-4 py-2 ${colors.bg} font-medium ${colors.text} text-center border-b`}
                        >
                          {processInfo.label}
                        </TableHead>
                      );
                    })
                  )}
                  <TableHead colSpan="2" className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center border-b">
                    Dados Rendimento
                  </TableHead>
                </TableRow>

                <TableRow>
                  <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-left whitespace-nowrap">
                    Ingrediente
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                    Preço/kg (Bruto)
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                    Custo Limpo/kg
                  </TableHead>

                  {isRecipeOnly ? (
                    <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center whitespace-nowrap">
                      Peso Usado (kg)
                    </TableHead>
                  ) : null}

                  {hasProcess('defrosting') && (
                    <>
                      <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                        Peso Congelado
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                        Peso Resfriado
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                        Perda Desc.(%)
                      </TableHead>
                    </>
                  )}

                  {hasProcess('cleaning') && (
                    <>
                      {!hasProcess('defrosting') && (
                        <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                          Peso Bruto (Limpeza)
                        </TableHead>
                      )}
                      {hasProcess('defrosting') && (
                        <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                          Peso Entrada (Limpeza)
                        </TableHead>
                      )}
                      <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                        Pós Limpeza
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                        Perda Limpeza(%)                  </TableHead>
                    </>
                  )}

                  {hasProcess('cooking') && (
                    <>
                      <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                        Pré Cocção
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                        Pós Cocção
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                        Perda Cocção(%)                  </TableHead>
                    </>
                  )}

                  {hasProcess('portioning') && (
                    <>
                      {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
                        <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                          Peso Bruto (Porc.)
                        </TableHead>
                      )}
                      <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                        Pós Porcionamento
                      </TableHead>
                      <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                        Perda Porcion.(%)                  </TableHead>
                    </>
                  )}

                  <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center whitespace-nowrap">
                    Rendimento(%)              </TableHead>
                  <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Renderizar Ingredientes da Seção */}
                {section.items.map((item) => (
                  <IngredientRow
                    key={`ingredient-${item.data.id || item.originalIndex}`}
                    ingredient={item.data}
                    prepIndex={prepIndex}
                    ingredientIndex={item.originalIndex}
                    prep={prep}
                    readOnly={isReadOnly || item.data.locked}
                    {...rest}
                  />
                ))}

                {/* Renderizar Receitas (apenas na última seção ou se for seção única?)
                    Vamos renderizar receitas sempre na última seção para simplificar.
                    Ou se não tiver seções de ingredientes, renderiza na única.
                */}
                {idx === sections.length - 1 && recipes.map((recipe, recipeIndex) => (
                  <RecipeRow
                    key={`recipe-${recipe.id || recipeIndex}`}
                    recipe={recipe}
                    prepIndex={prepIndex}
                    recipeIndex={recipeIndex}
                    prep={prep}
                    readOnly={isReadOnly} /* PASS READONLY */
                    {...rest}
                  />
                ))}

                {section.items.length === 0 && (idx !== sections.length - 1 || recipes.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-4 text-gray-400">
                      Nenhum ingrediente nesta etapa
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(IngredientTable);