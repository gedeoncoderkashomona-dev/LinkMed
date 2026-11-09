import * as React from 'react';
import type { Metadata } from 'next';

import { EquipamentosClient } from './equipamentos-client';

export const metadata: Metadata = { title: 'Equipamentos & Ordens de Serviço' };

export default function EquipamentosPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Carregando Equipamentos e Ordens de Serviço...
        </div>
      }
    >
      <EquipamentosClient />
    </React.Suspense>
  );
}
