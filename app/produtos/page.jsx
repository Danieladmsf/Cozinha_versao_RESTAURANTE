import ProductsList from '@/components/produtos/ProductsList';
import { Suspense } from 'react';

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando catálogo...</div>}>
            <ProductsList />
        </Suspense>
    );
}
