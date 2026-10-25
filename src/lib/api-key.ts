import crypto from 'crypto';
import { db } from './db';
import { encrypt } from './encryption';

const KEY_PREFIX = 'drv_live_';

export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function createApiKey(accountId: string, name: string, allowedDomains?: string) {
  const secretBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `${KEY_PREFIX}${secretBytes}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = `${KEY_PREFIX}${secretBytes.substring(0, 6)}...`;
  const encryptedKey = encrypt(rawKey);

  const record = await db.apiKey.create({
    data: {
      accountId,
      name,
      keyPrefix,
      keyHash,
      encryptedKey,
      allowedDomains: allowedDomains || null,
    },
  });

  return {
    id: record.id,
    name: record.name,
    key: rawKey,
    keyPrefix: record.keyPrefix,
    createdAt: record.createdAt,
  };
}

export async function validateApiKey(rawKey: string) {
  if (!rawKey || (!rawKey.startsWith('drv_live_') && !rawKey.startsWith('gdc_live_'))) {
    return null;
  }

  const keyHash = hashKey(rawKey);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      account: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  // Update lastUsedAt asynchronously without blocking request
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return apiKey;
}

export function isDomainAllowed(allowedDomains: string | null, originOrReferer: string | null): boolean {
  if (!allowedDomains || !allowedDomains.trim()) {
    return true; // No whitelist restriction
  }
  if (!originOrReferer) {
    return false; // Whitelist configured, but request has no origin/referer
  }

  let requestHost = originOrReferer;
  try {
    const url = new URL(originOrReferer);
    requestHost = url.hostname;
  } catch {}

  const domains = allowedDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const normalizedHost = requestHost.toLowerCase();
  return domains.some((allowed) => {
    return normalizedHost === allowed || normalizedHost.endsWith(`.${allowed}`);
  });
}
