import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { db } from '@/lib/db';
import { downloadStreamFromDrive } from '@/lib/gdrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await db.asset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return new NextResponse('Asset not found', { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const widthParam = searchParams.get('w');
    const heightParam = searchParams.get('h');
    const formatParam = searchParams.get('format')?.toLowerCase();
    const qualityParam = searchParams.get('q');

    // Clamp resize parameters to protect against memory allocation DoS attacks
    const rawWidth = widthParam ? parseInt(widthParam, 10) : undefined;
    const rawHeight = heightParam ? parseInt(heightParam, 10) : undefined;
    const width = rawWidth && !isNaN(rawWidth) ? Math.min(4000, Math.max(1, rawWidth)) : undefined;
    const height = rawHeight && !isNaN(rawHeight) ? Math.min(4000, Math.max(1, rawHeight)) : undefined;
    const quality = qualityParam ? Math.min(100, Math.max(1, parseInt(qualityParam, 10))) : 80;

    const stream = await downloadStreamFromDrive(asset.accountId, asset.googleFileId);

    // If it's an image and transformations are requested
    const isImage = asset.mimeType.startsWith('image/');
    const hasTransformations = width || height || formatParam;

    if (isImage && hasTransformations) {
      // Buffer the incoming stream for Sharp processing
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const inputBuffer = Buffer.concat(chunks);

      let transformer = sharp(inputBuffer);

      if (width || height) {
        transformer = transformer.resize({
          width,
          height,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      let outputMimeType = asset.mimeType;

      if (formatParam === 'webp') {
        transformer = transformer.webp({ quality });
        outputMimeType = 'image/webp';
      } else if (formatParam === 'jpeg' || formatParam === 'jpg') {
        transformer = transformer.jpeg({ quality });
        outputMimeType = 'image/jpeg';
      } else if (formatParam === 'png') {
        transformer = transformer.png({ quality });
        outputMimeType = 'image/png';
      } else if (formatParam === 'avif') {
        transformer = transformer.avif({ quality });
        outputMimeType = 'image/avif';
      }

      const outputBuffer = await transformer.toBuffer();

      return new NextResponse(new Uint8Array(outputBuffer), {
        status: 200,
        headers: {
          'Content-Type': outputMimeType,
          'Content-Length': outputBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
      });
    }

    // Direct streaming for videos, audio, documents, or untransformed images
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    const responseHeaders: Record<string, string> = {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    };
    if (asset.sizeBytes) {
      responseHeaders['Content-Length'] = asset.sizeBytes.toString();
    }

    return new NextResponse(webStream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(error.message || 'Error delivering media', { status: 500 });
  }
}
