import Recipes from '@/components/receitas/Recipes';
import { Suspense } from 'react';

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando receitas...</div>}>
      <Recipes />
    </Suspense>
  );
}