import type { Metadata } from 'next';

import { PopsClient } from './pops-client';

export const metadata: Metadata = { title: 'Documentos (POPs)' };

export default function PopsPage() {
  return <PopsClient />;
}