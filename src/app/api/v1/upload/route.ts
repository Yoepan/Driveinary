import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import sharp from 'sharp';
import { validateApiKey } from '@/lib/api-key';
import { uploadStreamToDrive } from '@/lib/gdrive';
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string | null) || undefined;
    const customName = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: "file" form-data field is required' },
        { status: 400 }
      );
    }

    const filename = customName || file.name || 'unnamed_asset';
    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeBytes = buffer.length;

    let width: number | null = null;
    let height: number | null = null;

    // Extract image dimensions if it's an image
    if (mimeType.startsWith('image/')) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch {
        // Fallback gracefully for unsupported or corrupt image formats
      }
    }

    const stream = Readable.from(buffer);

    const uploadResult = await uploadStreamToDrive(
      keyRecord.accountId,
      filename,
      mimeType,
      stream,
      folder
    );

    const asset = await db.asset.create({
      data: {
        accountId: keyRecord.accountId,
        createdByKeyId: keyRecord.id,
        name: filename,
        googleFileId: uploadResult.fileId,
        mimeType,
        sizeBytes,
        width,
        height,
        directUrl: uploadResult.directUrl,
      },
    });

    await db.googleAccount.update({
      where: { id: keyRecord.accountId },
      data: {
        storageUsed: { increment: BigInt(sizeBytes) },
      },
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const publicUrl = `${protocol}://${host}/media/${asset.id}`;

    return NextResponse.json(
      {
        success: true,
        asset_id: asset.id,
        name: asset.name,
        mime_type: asset.mimeType,
        size: asset.sizeBytes,
        url: publicUrl,
        direct_url: asset.directUrl,
        created_at: asset.createdAt.toISOString(),
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
