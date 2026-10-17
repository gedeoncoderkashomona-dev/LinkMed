'use client';

import { useQuery } from '@tanstack/react-query';

import type { PublicUser } from '@/core/domain/entities/user';

async function fetchMe(): Promise<PublicUser> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) throw new Error('Não autenticado.');
  const data = (await res.json()) as { user: PublicUser };
  return data.user;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });
}