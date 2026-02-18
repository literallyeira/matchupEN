import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> }
) {
  const params = await context.params;
  const segments = params?.nextauth || [];

  // Banking callback: /api/auth/callback/banking veya /api/auth/callback/bankingXXX
  // Statik banking/route.ts öncelik almalı ama catch-all'a düşerse burada yakala
  if (
    segments.length === 2 &&
    segments[0] === 'callback' &&
    segments[1].startsWith('banking')
  ) {
    const url = new URL(req.url);
    const redirectUrl = new URL('/api/auth/callback/banking', url.origin);

    // Orijinal query parametrelerini aktar (banka ?token=XXX gönderiyorsa)
    url.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });

    // Token path'e yapışık geldiyse onu da ekle
    if (segments[1].length > 'banking'.length) {
      const pathToken = segments[1].slice('banking'.length);
      if (!redirectUrl.searchParams.has('token')) {
        redirectUrl.searchParams.set('token', pathToken);
      }
    }

    return NextResponse.redirect(redirectUrl.toString(), 302);
  }

  return handler(req, context);
}

export { handler as POST };
