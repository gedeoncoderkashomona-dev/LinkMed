import type { Metadata } from 'next';

import { NcsClient } from './ncs-client';

export const metadata: Metadata = { title: 'Não Conformidades' };

export default function NcsPage() {
  return <NcsClient />;
}
