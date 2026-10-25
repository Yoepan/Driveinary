import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createApiKey } from '@/lib/api-key';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        encryptedKey: true,
        allowedDomains: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    const formatted = keys.map((k) => {
      let fullKey: string | null = null;
      if (k.encryptedKey) {
        try {
          fullKey = decrypt(k.encryptedKey);
        } catch {}
      }
      return {
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        fullKey,
        allowedDomains: k.allowedDomains,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: formatted,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, allowed_domains } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "name" is required' },
        { status: 400 }
      );
    }

    // Retrieve active Google account
    const account = await db.googleAccount.findFirst();
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'No Google account connected. Please connect Google Drive first.' },
        { status: 400 }
      );
    }

    const createdKey = await createApiKey(account.id, name, allowed_domains);

    return NextResponse.json(
      {
        success: true,
        data: createdKey,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "id" query parameter is required' },
        { status: 400 }
      );
    }

    await db.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
