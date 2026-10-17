import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_COOKIE = 'ro_access';
const encoder = new TextEncoder();

/**
 * Middleware de proteção:
 *  - /login libera se não houver token; redireciona pra /dashboard se houver
 *  - rotas (app) exigem token válido; senão vão pra /login
 *  - verificação de assinatura é feita no Edge (jose)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const isProd = process.env.NODE_ENV === 'production';
  const rawSecret = process.env.JWT_ACCESS_SECRET;
  if (isProd && !rawSecret) {
    throw new Error('JWT_ACCESS_SECRET é obrigatório em produção.');
  }
  const accessSecret = rawSecret ?? 'dev-access-secret-troque-em-producao-000000000000';

  const isAuthRoute = pathname === '/login';
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    /\.(?:jpg|jpeg|png|gif|svg|ico|webp)$/i.test(pathname);

  if (isPublicAsset) return NextResponse.next();

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