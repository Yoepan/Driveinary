import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/lib/gdrive';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(error || 'missing_code')}`);
  }

  try {
    await handleOAuthCallback(code);
    return NextResponse.redirect(`${appUrl}?auth=success`);
  } catch (err: any) {
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(err.message || 'auth_failed')}`);
  }
}
