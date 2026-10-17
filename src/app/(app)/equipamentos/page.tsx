import type { Metadata } from 'next';

import { EquipamentosClient } from './equipamentos-client';

export const metadata: Metadata = { title: 'Equipamentos & Ordens de Serviço' };

export default function EquipamentosPage() {
  return <EquipamentosClient />;
}
