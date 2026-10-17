import * as React from 'react';
import type { Metadata } from 'next';

import { getFormDef } from '@/core/domain/forms/definitions';
import { FormDetailClient } from './form-detail-client';

export function generateMetadata({
  params,
}: {
  params: { tipo: string };
}): Metadata {
  const def = getFormDef(params.tipo);
  return {
    title: def ? `${def.reg ? `${def.reg} · ` : ''}${def.titulo}` : 'Formulário',
  };
}

export default function FormDetailPage({
  params,
}: {
  params: { tipo: string };
}) {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando formulário...</div>}>
      <FormDetailClient tipo={params.tipo} />
    </React.Suspense>
  );
}
