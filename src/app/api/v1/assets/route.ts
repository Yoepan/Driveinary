import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search');
    const mimePrefix = searchParams.get('type');

    const where: any = {};

    if (search) {
      where.name = { contains: search };
    }
    if (mimePrefix) {
      where.mimeType = { startsWith: mimePrefix };
    }

    const [total, items] = await Promise.all([
      db.asset.count({ where }),
      db.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    const assets = items.map((a) => ({
      id: a.id,
      name: a.name,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      width: a.width,
      height: a.height,
      url: `${protocol}://${host}/media/${a.id}`,
      direct_url: a.directUrl,
      created_at: a.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        data: assets,
        total,
        page,
        limit,
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
