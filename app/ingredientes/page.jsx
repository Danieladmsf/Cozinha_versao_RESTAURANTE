import Ingredients from '@/components/ingredientes/Ingredients';
import { Suspense } from 'react';

export default function IngredientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando ingredientes...</div>}>
      <Ingredients />
    </Suspense>
  );
}