import Dashboard from '@/components/dashboard/Dashboard';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando painel principal...</div>}>
      <Dashboard />
    </Suspense>
  );
}