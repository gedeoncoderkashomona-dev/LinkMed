import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_COOKIE = 'ro_access';
const encoder = new TextEncoder();

/**
 * Middleware de proteção:
 *  - Modo Manutenção Automático durante atualizações de código:
 *    Se NEXT_PUBLIC_MAINTENANCE_MODE não for explicitamente 'false', ativa automaticamente a tela de manutenção.
 *    Visitantes e clientes veem a tela estilizada da Linkmed.
 *    A equipe e testadores podem entrar através do botão de bypass ou ?bypass=linkmed2026.
 *  - /login libera se não houver token; redireciona pra /dashboard se houver
 *  - rotas (app) exigem token válido; senão vão pra /login
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

  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    /\.(?:jpg|jpeg|png|gif|svg|ico|webp)$/i.test(pathname);

  if (isPublicAsset) return NextResponse.next();

  // Modo de Manutenção Programada (Desativado: ative definindo NEXT_PUBLIC_MAINTENANCE_MODE="true")
  const maintenanceEnv = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  const isMaintenanceMode = maintenanceEnv === 'true';

  const isMaintenanceRoute = pathname === '/manutencao';
  const bypassCookie = req.cookies.get('ro_bypass_maintenance')?.value;
  const bypassQuery = req.nextUrl.searchParams.get('bypass');
  const hasBypass =
    bypassCookie === 'true' ||
    bypassQuery === 'linkmed2026' ||
    bypassQuery === 'linkmed' ||
    bypassQuery === 'true';

  if (isMaintenanceMode && !isMaintenanceRoute && !hasBypass) {
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/me')) {
      return NextResponse.json(
        {
          error: 'MAINTENANCE_MODE',
          message: 'Sistema em manutenção programada para atualização da Versão 2.0 (Auditoria Linkmed).',
        },
        { status: 503 },
      );
    }
    const url = new URL('/manutencao', req.url);
    return NextResponse.redirect(url);
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

  if (!isAuthRoute && !valid && !isMaintenanceRoute) {
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
