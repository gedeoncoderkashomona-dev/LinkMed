import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import { resolverSegredo } from '@/infra/crypto/secrets';

const ACCESS_COOKIE = 'ro_access';
const encoder = new TextEncoder();

/**
 * Middleware de proteção:
 *  - /login libera se não houver token; redireciona pra /dashboard se houver
 *  - rotas (app) exigem token válido; senão vão pra /login
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const accessSecret = resolverSegredo('JWT_ACCESS_SECRET');

  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    /\.(?:jpg|jpeg|png|gif|svg|ico|webp)$/i.test(pathname);

  if (isPublicAsset) return NextResponse.next();

  // Modo de Manutenção Totalmente Desativado
  const isMaintenanceMode = false;

  // Se qualquer usuário acessar /manutencao, redireciona direto para o login
  if (pathname === '/manutencao') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const isAuthRoute = pathname === '/login';

  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, encoder.encode(accessSecret));
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (isAuthRoute && valid) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isAuthRoute && !valid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Sessão inválida ou ausente.' },
        { status: 401 },
      );
    }
    const url = new URL('/login', req.url);
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp)$).*)'],
};
