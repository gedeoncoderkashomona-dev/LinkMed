import { redirect } from 'next/navigation';

/**
 * Rota raiz — por enquanto redireciona para o login.
 * Na FASE 1, redireciona para /dashboard se houver sessão.
 */
export default function HomePage() {
  redirect('/login');
}