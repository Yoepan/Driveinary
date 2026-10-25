import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { validateApiKey, isDomainAllowed } from '@/lib/api-key';
import { createResumableUploadSession } from '@/lib/gdrive';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiKeyFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xApiKey = headers.get('x-api-key');
  if (xApiKey) {
    return xApiKey.trim();
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rawKey = getApiKeyFromHeaders(request.headers);
    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing API key in Authorization or x-api-key header' },
        { status: 401 }
      );
    }

    const keyRecord = await validateApiKey(rawKey);
    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or revoked API key' },
        { status: 401 }
      );
    }

    const clientOrigin = request.headers.get('origin') || request.headers.get('referer') || undefined;
    if (!isDomainAllowed(keyRecord.allowedDomains, clientOrigin || null)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Request origin is not permitted by API key domain policy' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, mime_type, size, folder } = body;

    if (!name || !mime_type || !size) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "name", "mime_type", and "size" are required' },
        { status: 400 }
      );
    }

    const sizeBytes = parseInt(size, 10);
    const session = await createResumableUploadSession(
      keyRecord.accountId,
      name,
      mime_type,
      sizeBytes,
      folder,
      clientOrigin
    );

    // Pre-create asset entry in database
    const asset = await db.asset.create({
      data: {
        accountId: keyRecord.accountId,
        createdByKeyId: keyRecord.id,
        name,
        googleFileId: `pending_${nanoid()}`,
        mimeType: mime_type,
        sizeBytes,
      },
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const mediaUrl = `${protocol}://${host}/media/${asset.id}`;

    return NextResponse.json({
      success: true,
      asset_id: asset.id,
      upload_url: session.uploadUrl,
      media_url: mediaUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize direct upload session' },
      { status: 500 }
    );
  }
}
