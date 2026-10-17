import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { GetCurrentUserUseCase } from '@/core/use-cases/auth/get-current-user';
import { getRepositories } from '@/infra/db';
import { tokenService } from '@/infra/crypto';
import { readAccessToken } from '@/lib/auth/session';

/**
 * Layout autenticado.
 *
 * Responsabilidades:
 *  1. Garantir o seed do store antes de qualquer consulta.
 *  2. Validar o access token do cookie.
 *  3. Carregar o usuário logado (com fallback por e-mail).
 *  4. Redirecionar para /login se qualquer coisa falhar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 2) Lê e valida o access token.
  const token = await readAccessToken();
  if (!token) redirect('/login');

  let userId: string;
  let userEmail: string;
  try {
    const payload = await tokenService.verifyAccess(token);
    userId = payload.sub;
    userEmail = payload.email;
  } catch {
    redirect('/login');
  }

  // 3) Busca o usuário. Fallback por e-mail caso o ID tenha mudado.
  const { userRepository } = getRepositories();
  const useCase = new GetCurrentUserUseCase(userRepository);

  let user;
  try {
    user = await useCase.execute(userId);
  } catch {
    // Fallback: procura pelo e-mail do token (defesa em profundidade).
    const byEmail = await userRepository.findByEmail(userEmail);
    if (!byEmail) redirect('/login');
    user = byEmail;
  }

  // 4) Renderiza o shell autenticado.
  return <AppShell user={user}>{children}</AppShell>;
}