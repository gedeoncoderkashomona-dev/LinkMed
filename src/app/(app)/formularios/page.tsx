import type { Metadata } from 'next';

import { FormulariosClient } from './formularios-client';

export const metadata: Metadata = { title: 'Formulários Operacionais' };

export default function FormulariosPage() {
  return <FormulariosClient />;
}
