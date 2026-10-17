import type { Metadata } from 'next';

import { TreinamentosClient } from './treinamentos-client';

export const metadata: Metadata = { title: 'Treinamentos' };

export default function TreinamentosPage() {
  return <TreinamentosClient />;
}
