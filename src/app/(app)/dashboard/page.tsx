import type { Metadata } from 'next';

import { DashboardPlaceholder } from './dashboard-placeholder';

export const metadata: Metadata = { title: 'Painel' };

export default function DashboardPage() {
  return <DashboardPlaceholder />;
}