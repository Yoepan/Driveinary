import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-key';
import { setFilePublicPermission } from '@/lib/gdrive';
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
        { success: false, error: 'Unauthorized: Missing API key' },
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

    const body = await request.json();
    const { asset_id, google_file_id } = body;

    if (!asset_id || !google_file_id) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "asset_id" and "google_file_id" are required' },
        { status: 400 }
      );
    }

    const asset = await db.asset.findUnique({
      where: { id: asset_id },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    const directUrl = `https://lh3.googleusercontent.com/d/${google_file_id}`;

    // Update asset with confirmed Google file ID
    const updated = await db.asset.update({
      where: { id: asset_id },
      data: {
        googleFileId: google_file_id,
        directUrl,
      },
    });

    // Update storage quota usage
    await db.googleAccount.update({
      where: { id: keyRecord.accountId },
      data: {
        storageUsed: { increment: BigInt(asset.sizeBytes) },
      },
    }).catch(() => {});

    // Set permission in Google Drive so direct links work
    setFilePublicPermission(keyRecord.accountId, google_file_id).catch(() => {});

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const mediaUrl = `${protocol}://${host}/media/${updated.id}`;

    return NextResponse.json({
      success: true,
      asset_id: updated.id,
      name: updated.name,
      size: updated.sizeBytes,
      mime_type: updated.mimeType,
      url: mediaUrl,
      direct_url: updated.directUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}
