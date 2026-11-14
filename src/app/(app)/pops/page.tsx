import * as React from 'react';
import type { Metadata } from 'next';

import { PopsClient } from './pops-client';

export const metadata: Metadata = { title: 'Documentos (POPs)' };

export default function PopsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Carregando Documentos (POPs)...
        </div>
      }
    >
      <PopsClient />
    </React.Suspense>
  );
}